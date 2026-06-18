// Drives the full ReleaseManager flow against a fake in-process GitHub HTTP server
// with real zip assets and a real temp directory. Asserts filesystem state at each
// step: cache creation, active-dir copy (not symlink), swap, remove, and reconcile
// cleanup when a build directory disappears from disk.

use std::collections::HashMap;
use std::io::Write;
use std::sync::Arc;

use release_manager_core::{
    active::active_path,
    cache::cache_dir,
    error::RmError,
    manager::ReleaseManager,
    types::{Channel, PreviewSubtype},
};
use tempfile::tempdir;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const TAG_STABLE: &str = "v1.2.3";
const TAG_PREVIEW: &str = "preview-pr-42";

fn make_zip(version: &str) -> Vec<u8> {
    let buf = std::io::Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(buf);
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored);
    zip.start_file("manifest.json", opts).unwrap();
    zip.write_all(
        format!(r#"{{"version":"{version}","name":"danmaku-anywhere"}}"#).as_bytes(),
    )
    .unwrap();
    zip.start_file("background.js", opts).unwrap();
    zip.write_all(b"// background").unwrap();
    zip.finish().unwrap().into_inner()
}

fn releases_body(base_url: &str) -> Vec<u8> {
    format!(
        r#"[
          {{"tag_name":"{TAG_STABLE}","prerelease":false,"published_at":"2026-01-01T00:00:00Z",
            "assets":[{{"name":"danmaku-anywhere-1.2.3-chrome.zip","url":"{base_url}/assets/{TAG_STABLE}"}}]}},
          {{"tag_name":"{TAG_PREVIEW}","prerelease":true,"published_at":"2026-01-02T00:00:00Z",
            "assets":[{{"name":"danmaku-anywhere-0.0.1-pr42-chrome.zip","url":"{base_url}/assets/{TAG_PREVIEW}"}}]}}
        ]"#
    )
    .into_bytes()
}

// Spin up an in-process HTTP server that handles multiple concurrent connections.
// Routes:
//   path contains "/releases" -> JSON array of releases
//   path starts with "/assets/<tag>" -> zip bytes for that tag
// Sends "Connection: close" on every response so reqwest reconnects cleanly.
async fn spawn_fake_github(
    listener: TcpListener,
    releases: Vec<u8>,
    zips: HashMap<String, Vec<u8>>,
) -> tokio::task::JoinHandle<()> {
    let releases = Arc::new(releases);
    let zips = Arc::new(zips);
    tokio::spawn(async move {
        loop {
            let Ok((mut stream, _)) = listener.accept().await else {
                break;
            };
            let releases = Arc::clone(&releases);
            let zips = Arc::clone(&zips);
            tokio::spawn(async move {
                let mut buf = vec![0u8; 4096];
                let n = stream.read(&mut buf).await.unwrap_or(0);
                let head = String::from_utf8_lossy(&buf[..n]);
                let path = head
                    .lines()
                    .next()
                    .and_then(|l| l.split_whitespace().nth(1))
                    .unwrap_or("");

                let (status, content_type, body): (u16, &str, Vec<u8>) =
                    if path.contains("/releases") {
                        (200, "application/json", releases.as_ref().clone())
                    } else if let Some(tag) = path.strip_prefix("/assets/") {
                        match zips.get(tag) {
                            Some(b) => (200, "application/octet-stream", b.clone()),
                            None => (404, "text/plain", b"not found".to_vec()),
                        }
                    } else {
                        (404, "text/plain", b"not found".to_vec())
                    };

                let header = format!(
                    "HTTP/1.1 {status} OK\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                );
                let _ = stream.write_all(header.as_bytes()).await;
                let _ = stream.write_all(&body).await;
            });
        }
    })
}

#[tokio::test]
async fn full_release_manager_flow() {
    // Bind the listener first to get the port, then build releases JSON with asset URLs
    // pointing at that port before spawning the server.
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let base = format!("http://127.0.0.1:{port}");

    let mut zips = HashMap::new();
    zips.insert(TAG_STABLE.to_string(), make_zip("1.2.3"));
    zips.insert(TAG_PREVIEW.to_string(), make_zip("0.0.1-pr42"));

    let server = spawn_fake_github(listener, releases_body(&base), zips).await;

    let dir = tempdir().unwrap();
    let data_dir = dir.path().to_path_buf();
    let client = reqwest::Client::builder()
        .user_agent("e2e-test")
        .build()
        .unwrap();
    let manager =
        ReleaseManager::with_client(data_dir.clone(), Some(format!("{base}/releases")), client);

    // step 1: list_releases returns both releases with correct classification
    let releases = manager.list_releases(1).await.expect("list_releases");
    assert_eq!(releases.len(), 2);

    let stable = releases.iter().find(|r| r.tag == TAG_STABLE).expect("stable release");
    assert!(matches!(stable.channel, Channel::Stable));
    assert!(stable.preview_subtype.is_none());
    assert_eq!(stable.version, "1.2.3");
    assert!(stable.asset_url.starts_with(&base), "asset_url must point to fake server");

    let preview = releases.iter().find(|r| r.tag == TAG_PREVIEW).expect("preview release");
    assert!(matches!(preview.channel, Channel::Preview));
    assert!(matches!(preview.preview_subtype, Some(PreviewSubtype::Pr)));

    // step 2: download stable. cache dir populated with real files
    let state = manager.download_build(TAG_STABLE).await.expect("download stable");

    let stable_cache = cache_dir(&data_dir, TAG_STABLE);
    assert!(stable_cache.join("manifest.json").exists(), "manifest.json in stable cache");
    assert!(stable_cache.join("background.js").exists(), "background.js in stable cache");
    assert!(state.builds.iter().any(|b| b.tag == TAG_STABLE));

    // step 3: set stable active. active/ is a real directory, not a symlink
    let state = manager.set_active(TAG_STABLE).await.expect("set_active stable");

    let active = active_path(&data_dir);
    let meta = std::fs::symlink_metadata(&active).expect("active dir must exist");
    assert!(meta.file_type().is_dir(), "active must be a real directory");
    assert!(!meta.file_type().is_symlink(), "active must not be a symlink");

    let active_manifest = std::fs::read_to_string(active.join("manifest.json")).unwrap();
    let cache_manifest = std::fs::read_to_string(stable_cache.join("manifest.json")).unwrap();
    assert_eq!(active_manifest, cache_manifest, "active contents must match stable cache");
    assert_eq!(state.active_tag.as_deref(), Some(TAG_STABLE));

    // step 4: download preview, swap active. active now holds preview, stable still cached
    manager.download_build(TAG_PREVIEW).await.expect("download preview");

    let preview_cache = cache_dir(&data_dir, TAG_PREVIEW);
    assert!(preview_cache.join("manifest.json").exists(), "preview manifest in cache");

    let state = manager.set_active(TAG_PREVIEW).await.expect("set_active preview");

    let active_manifest = std::fs::read_to_string(active.join("manifest.json")).unwrap();
    let preview_manifest = std::fs::read_to_string(preview_cache.join("manifest.json")).unwrap();
    assert_eq!(active_manifest, preview_manifest, "active must hold preview contents after swap");
    assert_eq!(state.active_tag.as_deref(), Some(TAG_PREVIEW));
    assert!(stable_cache.exists(), "stable build must still be on disk after swap");

    // step 5: remove while active -> Conflict, build dir survives
    let err = manager
        .remove_build(TAG_PREVIEW)
        .await
        .expect_err("removing active build must fail");
    assert!(
        matches!(err, RmError::Conflict { .. }),
        "expected Conflict error, got {err:?}"
    );
    assert!(preview_cache.exists(), "active build dir must survive refused remove");

    // step 6: re-activate stable then remove preview. cache dir deleted from disk
    manager.set_active(TAG_STABLE).await.expect("re-activate stable");
    let state = manager.remove_build(TAG_PREVIEW).await.expect("remove preview");

    assert!(!preview_cache.exists(), "preview cache dir must be gone after remove");
    assert!(!state.builds.iter().any(|b| b.tag == TAG_PREVIEW));

    // step 7: delete stable from disk manually, reconcile drops it from state
    std::fs::remove_dir_all(&stable_cache).expect("manual delete");
    assert!(!stable_cache.exists());

    manager.reconcile().await;

    let state = manager.get_state().await;
    assert!(
        !state.builds.iter().any(|b| b.tag == TAG_STABLE),
        "manually deleted build must be dropped from state after reconcile"
    );
    assert!(
        state.active_tag.is_none(),
        "active_tag must be cleared when the active build disappears from disk"
    );

    server.abort();
}

fn page_from_path(path: &str) -> u32 {
    path.split('?')
        .nth(1)
        .unwrap_or("")
        .split('&')
        .find_map(|kv| {
            let mut parts = kv.splitn(2, '=');
            if parts.next() == Some("page") {
                parts.next()?.parse().ok()
            } else {
                None
            }
        })
        .unwrap_or(1)
}

// Page 1 returns a full page of 100 dummy releases (none matching the target).
// Page 2 returns the target. Verifies that do_download searches past page 1.
#[tokio::test]
async fn download_build_searches_past_page_one() {
    const TARGET: &str = "v2.0.0";

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let base = format!("http://127.0.0.1:{port}");

    let page1: Vec<u8> = {
        let entries: Vec<String> = (0u32..100)
            .map(|i| {
                format!(
                    r#"{{"tag_name":"v0.0.{i}","prerelease":false,"published_at":"2025-01-01T00:00:00Z","assets":[{{"name":"danmaku-anywhere-0.0.{i}-chrome.zip","url":"{base}/assets/v0.0.{i}"}}]}}"#
                )
            })
            .collect();
        format!("[{}]", entries.join(",")).into_bytes()
    };

    let page2: Vec<u8> = format!(
        r#"[{{"tag_name":"{TARGET}","prerelease":false,"published_at":"2026-06-01T00:00:00Z","assets":[{{"name":"danmaku-anywhere-2.0.0-chrome.zip","url":"{base}/assets/{TARGET}"}}]}}]"#
    )
    .into_bytes();

    let mut zips = HashMap::new();
    zips.insert(TARGET.to_string(), make_zip("2.0.0"));

    let page1 = Arc::new(page1);
    let page2 = Arc::new(page2);
    let zips = Arc::new(zips);

    let server = {
        let page1 = Arc::clone(&page1);
        let page2 = Arc::clone(&page2);
        let zips = Arc::clone(&zips);
        tokio::spawn(async move {
            loop {
                let Ok((mut stream, _)) = listener.accept().await else {
                    break;
                };
                let page1 = Arc::clone(&page1);
                let page2 = Arc::clone(&page2);
                let zips = Arc::clone(&zips);
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 8192];
                    let n = stream.read(&mut buf).await.unwrap_or(0);
                    let head = String::from_utf8_lossy(&buf[..n]);
                    let path = head
                        .lines()
                        .next()
                        .and_then(|l| l.split_whitespace().nth(1))
                        .unwrap_or("");

                    let (status, content_type, body): (u16, &str, Vec<u8>) =
                        if path.contains("/releases") {
                            let body = if page_from_path(path) == 1 {
                                page1.as_ref().clone()
                            } else {
                                page2.as_ref().clone()
                            };
                            (200, "application/json", body)
                        } else if let Some(tag) = path.strip_prefix("/assets/") {
                            match zips.get(tag) {
                                Some(b) => (200, "application/octet-stream", b.clone()),
                                None => (404, "text/plain", b"not found".to_vec()),
                            }
                        } else {
                            (404, "text/plain", b"not found".to_vec())
                        };

                    let header = format!(
                        "HTTP/1.1 {status} OK\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        body.len()
                    );
                    let _ = stream.write_all(header.as_bytes()).await;
                    let _ = stream.write_all(&body).await;
                });
            }
        })
    };

    let dir = tempdir().unwrap();
    let client = reqwest::Client::builder()
        .user_agent("e2e-test")
        .build()
        .unwrap();
    let manager = ReleaseManager::with_client(
        dir.path().to_path_buf(),
        Some(format!("{base}/releases")),
        client,
    );

    let state = manager
        .download_build(TARGET)
        .await
        .expect("download must succeed when target is on page 2");
    assert!(
        state.builds.iter().any(|b| b.tag == TARGET),
        "downloaded build must appear in state"
    );
    assert!(
        cache_dir(dir.path(), TARGET).join("manifest.json").exists(),
        "manifest.json must be on disk"
    );

    server.abort();
}

// Pagination loop is capped at 10 pages. A server that always returns 100 dummy
// releases (never the target) must cause NotFound, not an infinite loop.
#[tokio::test]
async fn download_build_page_cap_returns_not_found() {
    let full_page: Vec<u8> = {
        let entries: Vec<String> = (0u32..100)
            .map(|i| {
                format!(
                    r#"{{"tag_name":"filler-{i}","prerelease":false,"published_at":"2025-01-01T00:00:00Z","assets":[{{"name":"danmaku-anywhere-0.0.0-chrome.zip","url":"http://localhost/none"}}]}}"#
                )
            })
            .collect();
        format!("[{}]", entries.join(",")).into_bytes()
    };

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();

    let full_page = Arc::new(full_page);
    let server = {
        let full_page = Arc::clone(&full_page);
        tokio::spawn(async move {
            loop {
                let Ok((mut stream, _)) = listener.accept().await else {
                    break;
                };
                let body = Arc::clone(&full_page);
                tokio::spawn(async move {
                    let mut buf = vec![0u8; 4096];
                    let _ = stream.read(&mut buf).await;
                    let header = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        body.len()
                    );
                    let _ = stream.write_all(header.as_bytes()).await;
                    let _ = stream.write_all(body.as_ref()).await;
                });
            }
        })
    };

    let dir = tempdir().unwrap();
    let client = reqwest::Client::builder()
        .user_agent("e2e-test")
        .build()
        .unwrap();
    let manager = ReleaseManager::with_client(
        dir.path().to_path_buf(),
        Some(format!("http://127.0.0.1:{port}/releases")),
        client,
    );

    let err = manager
        .download_build("nonexistent-tag")
        .await
        .expect_err("must return NotFound after page cap");
    assert!(
        matches!(err, RmError::NotFound { .. }),
        "expected NotFound, got {err:?}"
    );

    server.abort();
}
