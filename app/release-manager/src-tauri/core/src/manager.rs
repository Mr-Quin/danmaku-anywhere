use std::collections::HashSet;
use std::ffi::OsStr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::active::{clear_active, set_active};
use crate::cache::{download_build, reconcile_builds, remove_build};
use crate::error::RmError;
use crate::github::fetch_releases;
use crate::store::ConfigStore;
use crate::types::{Config, PublicState, ReleaseAsset};

const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases";

pub(crate) fn validate_tag(tag: &str) -> Result<(), RmError> {
    if tag.is_empty()
        || tag == "."
        || tag == ".."
        || tag.contains('/')
        || tag.contains('\\')
        || tag.contains('\0')
        || std::path::Path::new(tag).file_name() != Some(OsStr::new(tag))
    {
        return Err(RmError::Invalid {
            message: format!("unsafe tag: {tag}"),
        });
    }
    Ok(())
}

pub struct ReleaseManager {
    data_dir: PathBuf,
    store: ConfigStore,
    github_base: String,
    client: reqwest::Client,
    in_flight: Arc<Mutex<HashSet<String>>>,
    config_lock: tokio::sync::Mutex<()>,
}

// RAII guard: removes the tag from in_flight on drop, even if the future is cancelled.
// std::sync::Mutex is used because in_flight is only held for brief synchronous sections,
// never across an await, so a sync lock is both correct and reliably cleans up on drop.
struct InFlightGuard {
    in_flight: Arc<Mutex<HashSet<String>>>,
    tag: String,
}

impl Drop for InFlightGuard {
    fn drop(&mut self) {
        self.in_flight.lock().unwrap().remove(&self.tag);
    }
}

impl ReleaseManager {
    pub fn new(data_dir: PathBuf, github_base: Option<String>) -> Self {
        Self::with_client(data_dir, github_base, reqwest::Client::new())
    }

    pub fn with_client(
        data_dir: PathBuf,
        github_base: Option<String>,
        client: reqwest::Client,
    ) -> Self {
        let store = ConfigStore::new(&data_dir);
        let github_base = github_base.unwrap_or_else(|| GITHUB_RELEASES_URL.to_string());
        ReleaseManager {
            data_dir,
            store,
            github_base,
            client,
            in_flight: Arc::new(Mutex::new(HashSet::new())),
            config_lock: tokio::sync::Mutex::new(()),
        }
    }

    pub async fn get_state(&self) -> PublicState {
        let config = {
            let _lock = self.config_lock.lock().await;
            let config = self.store.load().await;
            self.reconcile_config(config).await
        };
        self.store.to_public_state(&config, None)
    }

    // Called with config_lock held.
    async fn reconcile_config(&self, config: Config) -> Config {
        let builds = match reconcile_builds(&self.data_dir, config.builds.clone()).await {
            Ok(b) => b,
            Err(_) => return config,
        };
        let active_still_present = config
            .active_tag
            .as_deref()
            .map(|t| builds.iter().any(|b| b.tag == t))
            .unwrap_or(false);

        if builds.len() == config.builds.len()
            && (config.active_tag.is_none() || active_still_present)
        {
            return config;
        }

        if config.active_tag.is_some() && !active_still_present {
            let _ = clear_active(&self.data_dir).await;
        }

        let reconciled = Config {
            builds,
            active_tag: if active_still_present {
                config.active_tag.clone()
            } else {
                None
            },
        };
        let _ = self.store.save(&reconciled).await;
        reconciled
    }

    pub async fn list_releases(&self, page: u32) -> Result<Vec<ReleaseAsset>, RmError> {
        fetch_releases(&self.client, &self.github_base, None, page)
            .await
            .map(|(assets, _)| assets)
    }

    pub async fn download_build(&self, tag: &str) -> Result<PublicState, RmError> {
        validate_tag(tag)?;

        {
            let mut in_flight = self.in_flight.lock().unwrap();
            if in_flight.contains(tag) {
                return Err(RmError::Conflict {
                    message: format!("a download for {tag} is already running"),
                });
            }
            in_flight.insert(tag.to_string());
        }

        let _guard = InFlightGuard {
            in_flight: Arc::clone(&self.in_flight),
            tag: tag.to_string(),
        };

        self.do_download(tag).await
    }

    async fn do_download(&self, tag: &str) -> Result<PublicState, RmError> {
        // Phase 1: locate the release across pages (network, outside config_lock).
        let mut page = 1u32;
        let asset = loop {
            let (releases, raw_count) =
                fetch_releases(&self.client, &self.github_base, None, page).await?;
            if let Some(found) = releases.iter().find(|r| r.tag == tag) {
                break found.clone();
            }
            if raw_count < 100 || page >= 10 {
                return Err(RmError::NotFound {
                    message: format!("no release tagged {tag}"),
                });
            }
            page += 1;
        };

        // Phase 2: download the zip (network + filesystem, outside config_lock).
        let downloaded = download_build(&self.data_dir, &asset, &self.client, None).await?;

        // Phase 3: update config atomically (config_lock).
        let tag_is_active = {
            let _lock = self.config_lock.lock().await;
            let mut config = self.store.load().await;
            config.builds.retain(|b| b.tag != tag);
            config.builds.push(downloaded);
            self.store.save(&config).await?;
            config.active_tag.as_deref() == Some(tag)
        };

        // Phase 4: refresh active dir if this was the active build (outside config_lock).
        if tag_is_active {
            set_active(&self.data_dir, tag).await?;
        }

        Ok(self.get_state().await)
    }

    pub async fn set_active(&self, tag: &str) -> Result<PublicState, RmError> {
        validate_tag(tag)?;

        {
            let _lock = self.config_lock.lock().await;
            let config = self.store.load().await;
            if !config.builds.iter().any(|b| b.tag == tag) {
                return Err(RmError::NotFound {
                    message: format!("{tag} is not cached"),
                });
            }

            set_active(&self.data_dir, tag).await?;

            let mut updated = config;
            updated.active_tag = Some(tag.to_string());
            self.store.save(&updated).await?;
        }

        Ok(self.get_state().await)
    }

    pub async fn remove_build(&self, tag: &str) -> Result<PublicState, RmError> {
        validate_tag(tag)?;

        {
            let _lock = self.config_lock.lock().await;
            let config = self.store.load().await;
            if config.active_tag.as_deref() == Some(tag) {
                return Err(RmError::Conflict {
                    message: format!(
                        "{tag} is active; set another build active before removing it"
                    ),
                });
            }

            remove_build(&self.data_dir, tag).await?;

            let mut updated = config;
            updated.builds.retain(|b| b.tag != tag);
            self.store.save(&updated).await?;
        }

        Ok(self.get_state().await)
    }

    pub async fn reconcile(&self) {
        let _lock = self.config_lock.lock().await;
        let config = self.store.load().await;
        self.reconcile_config(config).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cache::cache_dir;
    use tempfile::tempdir;

    #[tokio::test]
    async fn remove_build_refuses_active_tag() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path().to_path_buf();
        let store = crate::store::ConfigStore::new(&data_dir);
        let tag = "v1.0.0";
        let cache = cache_dir(&data_dir, tag);
        tokio::fs::create_dir_all(&cache).await.unwrap();
        tokio::fs::write(cache.join("manifest.json"), r#"{"version":"1.0.0"}"#).await.unwrap();
        let config = crate::types::Config {
            active_tag: Some(tag.to_string()),
            builds: vec![crate::types::CachedBuild {
                tag: tag.to_string(),
                version: "1.0.0".to_string(),
                channel: crate::types::Channel::Stable,
                downloaded_at: "2026-01-01T00:00:00Z".to_string(),
            }],
        };
        store.save(&config).await.unwrap();

        let manager = ReleaseManager::new(data_dir, Some("http://localhost".to_string()));
        let result = manager.remove_build(tag).await;
        assert!(result.is_err());
        if let Err(RmError::Conflict { .. }) = result {
        } else {
            panic!("expected Conflict error");
        }
    }

    #[tokio::test]
    async fn reconcile_drops_missing_dirs() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path().to_path_buf();
        let store = crate::store::ConfigStore::new(&data_dir);
        let config = crate::types::Config {
            active_tag: None,
            builds: vec![crate::types::CachedBuild {
                tag: "ghost".to_string(),
                version: "1.0.0".to_string(),
                channel: crate::types::Channel::Preview,
                downloaded_at: "2026-01-01T00:00:00Z".to_string(),
            }],
        };
        store.save(&config).await.unwrap();

        let manager = ReleaseManager::new(data_dir, Some("http://localhost".to_string()));
        manager.reconcile().await;

        let reloaded = store.load().await;
        assert!(reloaded.builds.is_empty());
    }

    #[tokio::test]
    async fn reconcile_clears_dangling_active() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path().to_path_buf();
        let store = crate::store::ConfigStore::new(&data_dir);

        // The tag is recorded as active but has no cache directory.
        let config = crate::types::Config {
            active_tag: Some("ghost".to_string()),
            builds: vec![crate::types::CachedBuild {
                tag: "ghost".to_string(),
                version: "1.0.0".to_string(),
                channel: crate::types::Channel::Stable,
                downloaded_at: "2026-01-01T00:00:00Z".to_string(),
            }],
        };
        store.save(&config).await.unwrap();

        let manager = ReleaseManager::new(data_dir, Some("http://localhost".to_string()));
        manager.reconcile().await;

        let reloaded = store.load().await;
        assert!(reloaded.active_tag.is_none());
        assert!(reloaded.builds.is_empty());
    }

    #[test]
    fn validate_tag_accepts_valid_tags() {
        assert!(validate_tag("v1.2.0").is_ok());
        assert!(validate_tag("nightly-abc").is_ok());
        assert!(validate_tag("preview-pr-1").is_ok());
    }

    #[test]
    fn validate_tag_rejects_traversal() {
        assert!(validate_tag("../../evil").is_err());
        assert!(validate_tag("").is_err());
        assert!(validate_tag(".").is_err());
        assert!(validate_tag("..").is_err());
        assert!(validate_tag("a/b").is_err());
        assert!(validate_tag("a\\b").is_err());
    }
}
