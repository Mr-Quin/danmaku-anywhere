use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};

use tokio::fs;

use crate::error::RmError;
use crate::types::{CachedBuild, ReleaseAsset};

const TMP_PREFIX: &str = ".tmp-";

fn cache_root(data_dir: &Path) -> PathBuf {
    data_dir.join("cache")
}

pub fn cache_dir(data_dir: &Path, tag: &str) -> PathBuf {
    cache_root(data_dir).join(tag)
}

fn tmp_dir(data_dir: &Path, tag: &str) -> PathBuf {
    cache_root(data_dir).join(format!("{TMP_PREFIX}{tag}"))
}

fn manifest_version(bytes: &[u8]) -> Option<String> {
    let parsed: serde_json::Value = serde_json::from_slice(bytes).ok()?;
    parsed["version"].as_str().map(|s| s.to_string())
}

fn unzip_to_map(bytes: &[u8]) -> Result<HashMap<String, Vec<u8>>, RmError> {
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| RmError::Invalid {
        message: e.to_string(),
    })?;
    let mut files = HashMap::new();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| RmError::Invalid {
            message: e.to_string(),
        })?;
        let name = file.name().to_string();
        if name.ends_with('/') {
            continue;
        }
        let mut contents = Vec::new();
        file.read_to_end(&mut contents).map_err(|e| RmError::Invalid {
            message: e.to_string(),
        })?;
        files.insert(name, contents);
    }
    Ok(files)
}

// Normalize a path without requiring it to exist (no canonicalize).
// Resolves `.` and `..` components lexically.
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                components.pop();
            }
            std::path::Component::CurDir => {}
            c => components.push(c),
        }
    }
    components.iter().collect()
}

async fn write_unzipped(dest: &Path, files: &HashMap<String, Vec<u8>>) -> Result<(), RmError> {
    fs::create_dir_all(dest).await.map_err(|e| RmError::Swap {
        message: e.to_string(),
    })?;
    // Use the same lexical normalization for the root and each candidate path,
    // matching the TS isContained logic which used path.resolve() on both sides.
    // canonicalize() would fail on a symlinked data-dir component and is not needed here.
    let root = normalize_path(dest);

    for (name, bytes) in files {
        let rel = Path::new(name);
        if rel.is_absolute() {
            continue;
        }
        let file_path = dest.join(rel);
        let normalized = normalize_path(&file_path);
        if !normalized.starts_with(&root) {
            continue;
        }
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        }
        fs::write(&file_path, bytes).await.map_err(|e| RmError::Swap {
            message: e.to_string(),
        })?;
    }
    Ok(())
}

pub async fn download_build(
    data_dir: &Path,
    asset: &ReleaseAsset,
    client: &reqwest::Client,
    token: Option<&str>,
) -> Result<CachedBuild, RmError> {
    let mut req = client
        .get(&asset.asset_url)
        .header("Accept", "application/octet-stream");

    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {t}"));
    }

    let response = req.send().await.map_err(|e| RmError::Network {
        message: e.to_string(),
    })?;

    if !response.status().is_success() {
        return Err(RmError::Network {
            message: format!("download responded with {}", response.status().as_u16()),
        });
    }

    let zipped = response.bytes().await.map_err(|e| RmError::Network {
        message: e.to_string(),
    })?;

    let files = unzip_to_map(&zipped)?;

    let manifest_bytes = files
        .get("manifest.json")
        .ok_or_else(|| RmError::Invalid {
            message: "archive has no manifest.json".to_string(),
        })?;

    let version = manifest_version(manifest_bytes)
        .unwrap_or_else(|| asset.version.clone());

    let tmp = tmp_dir(data_dir, &asset.tag);
    let final_dir = cache_dir(data_dir, &asset.tag);

    let _ = fs::remove_dir_all(&tmp).await;
    fs::create_dir_all(&tmp).await.map_err(|e| RmError::Swap {
        message: e.to_string(),
    })?;

    write_unzipped(&tmp, &files).await.map_err(|e| {
        let _ = std::fs::remove_dir_all(&tmp);
        e
    })?;

    let _ = fs::remove_dir_all(&final_dir).await;
    fs::rename(&tmp, &final_dir).await.map_err(|e| {
        let _ = std::fs::remove_dir_all(&tmp);
        RmError::Swap {
            message: e.to_string(),
        }
    })?;

    let now = chrono_now();
    Ok(CachedBuild {
        tag: asset.tag.clone(),
        version,
        channel: asset.channel.clone(),
        downloaded_at: now,
    })
}

pub async fn remove_build(data_dir: &Path, tag: &str) -> Result<(), RmError> {
    fs::remove_dir_all(cache_dir(data_dir, tag))
        .await
        .map_err(|e| RmError::Swap {
            message: e.to_string(),
        })
}

pub async fn reconcile_builds(
    data_dir: &Path,
    index: Vec<CachedBuild>,
) -> Vec<CachedBuild> {
    let root = cache_root(data_dir);
    let entries = match fs::read_dir(&root).await {
        Ok(mut dir) => {
            let mut names = std::collections::HashSet::new();
            while let Ok(Some(entry)) = dir.next_entry().await {
                let name = entry.file_name().to_string_lossy().to_string();
                if !name.starts_with(TMP_PREFIX) {
                    if entry.file_type().await.map(|t| t.is_dir()).unwrap_or(false) {
                        names.insert(name);
                    }
                }
            }
            names
        }
        Err(_) => return vec![],
    };

    index.into_iter().filter(|b| entries.contains(&b.tag)).collect()
}

fn chrono_now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Channel;
    use tempfile::tempdir;

    fn make_zip_bytes(version: &str) -> Vec<u8> {
        use std::io::Write;
        let buf = std::io::Cursor::new(Vec::new());
        let mut zip = zip::ZipWriter::new(buf);
        let opts = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);
        zip.start_file("manifest.json", opts).unwrap();
        zip.write_all(
            serde_json::json!({"version": version, "name": "da"})
                .to_string()
                .as_bytes(),
        )
        .unwrap();
        zip.start_file("background.js", opts).unwrap();
        zip.write_all(b"console.log('hi')").unwrap();
        zip.finish().unwrap().into_inner()
    }

    fn make_asset(tag: &str, version: &str) -> ReleaseAsset {
        ReleaseAsset {
            tag: tag.to_string(),
            version: version.to_string(),
            channel: Channel::Preview,
            preview_subtype: None,
            published_at: "2026-01-01T00:00:00Z".to_string(),
            asset_url: String::new(),
        }
    }

    // Spawn a minimal HTTP server on an OS-assigned port that serves zip_bytes once,
    // then returns the URL. Used to drive download_build without hitting the network.
    async fn spawn_zip_server(zip_bytes: Vec<u8>) -> (String, tokio::task::JoinHandle<()>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let handle = tokio::spawn(async move {
            if let Ok((mut stream, _)) = listener.accept().await {
                use tokio::io::{AsyncReadExt, AsyncWriteExt};
                let mut buf = vec![0u8; 4096];
                let _ = stream.read(&mut buf).await;
                let header = format!(
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: application/octet-stream\r\n\r\n",
                    zip_bytes.len()
                );
                let _ = stream.write_all(header.as_bytes()).await;
                let _ = stream.write_all(&zip_bytes).await;
            }
        });
        (format!("http://127.0.0.1:{port}/test.zip"), handle)
    }

    #[test]
    fn unzip_to_map_parses_entries() {
        let bytes = make_zip_bytes("1.0.0");
        let files = unzip_to_map(&bytes).unwrap();
        assert!(files.contains_key("manifest.json"));
        assert!(files.contains_key("background.js"));
    }

    #[test]
    fn manifest_version_reads_version_field() {
        let bytes = br#"{"version":"2.3.4","name":"da"}"#;
        assert_eq!(manifest_version(bytes), Some("2.3.4".to_string()));
    }

    #[test]
    fn manifest_version_returns_none_when_missing() {
        let bytes = br#"{"name":"da"}"#;
        assert_eq!(manifest_version(bytes), None);
    }

    #[tokio::test]
    async fn write_unzipped_skips_parent_traversal_entries() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out");
        tokio::fs::create_dir_all(&dest).await.unwrap();

        let mut files = HashMap::new();
        files.insert("manifest.json".to_string(), br#"{"version":"1.0"}"#.to_vec());
        files.insert("../escape.txt".to_string(), b"pwned".to_vec());

        write_unzipped(&dest, &files).await.unwrap();

        assert!(dest.join("manifest.json").exists());
        assert!(!dir.path().join("escape.txt").exists());
    }

    #[tokio::test]
    async fn write_unzipped_skips_absolute_path_entries() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out");
        tokio::fs::create_dir_all(&dest).await.unwrap();

        let mut files = HashMap::new();
        files.insert("manifest.json".to_string(), br#"{"version":"1.0"}"#.to_vec());
        files.insert("/etc/passwd".to_string(), b"root:x:0:0".to_vec());

        write_unzipped(&dest, &files).await.unwrap();

        assert!(dest.join("manifest.json").exists());
        assert!(!dest.join("etc").join("passwd").exists());
    }

    #[tokio::test]
    async fn write_unzipped_backslash_is_filename_not_separator_on_unix() {
        let dir = tempdir().unwrap();
        let dest = dir.path().join("out");
        tokio::fs::create_dir_all(&dest).await.unwrap();

        let mut files = HashMap::new();
        files.insert("manifest.json".to_string(), br#"{"version":"1.0"}"#.to_vec());
        // On Unix a backslash is a valid filename character, not a path separator.
        // The entry should land as a single file inside dest, not break out via traversal.
        files.insert("sub\\file.txt".to_string(), b"data".to_vec());

        write_unzipped(&dest, &files).await.unwrap();

        assert!(dest.join("manifest.json").exists());
        // Lands as the literal filename "sub\file.txt" inside dest (Unix-only behavior)
        #[cfg(unix)]
        assert!(dest.join("sub\\file.txt").exists());
    }

    #[tokio::test]
    async fn download_build_creates_cache_and_no_tmp_remains() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path();
        let tag = "v1.0.0";

        let zip_bytes = make_zip_bytes("1.0.0");
        let (url, server) = spawn_zip_server(zip_bytes).await;

        let asset = ReleaseAsset {
            asset_url: url,
            ..make_asset(tag, "1.0.0")
        };

        let client = reqwest::Client::new();
        let result = download_build(data_dir, &asset, &client, None).await;
        assert!(result.is_ok(), "download_build failed: {:?}", result.err());

        assert!(cache_dir(data_dir, tag).join("manifest.json").exists());
        assert!(!tmp_dir(data_dir, tag).exists());

        server.abort();
    }
}
