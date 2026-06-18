use std::path::{Path, PathBuf};

use tokio::fs;

use crate::active::active_path;
use crate::error::RmError;
use crate::types::{CachedBuild, Config, PublicState};

const CONFIG_FILE: &str = "config.json";

fn default_config() -> Config {
    Config {
        active_tag: None,
        builds: vec![],
    }
}

pub struct ConfigStore {
    data_dir: PathBuf,
    config_path: PathBuf,
}

impl ConfigStore {
    pub fn new(data_dir: &Path) -> Self {
        let config_path = data_dir.join(CONFIG_FILE);
        ConfigStore {
            data_dir: data_dir.to_path_buf(),
            config_path,
        }
    }

    pub async fn load(&self) -> Config {
        let raw = match fs::read_to_string(&self.config_path).await {
            Ok(s) => s,
            Err(_) => return default_config(),
        };
        match serde_json::from_str::<serde_json::Value>(&raw) {
            Ok(v) => {
                let active_tag = v["activeTag"].as_str().map(|s| s.to_string());
                let builds: Vec<CachedBuild> = v["builds"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|b| serde_json::from_value(b.clone()).ok())
                            .collect()
                    })
                    .unwrap_or_default();
                Config { active_tag, builds }
            }
            Err(_) => default_config(),
        }
    }

    pub async fn save(&self, config: &Config) -> Result<(), RmError> {
        fs::create_dir_all(&self.data_dir)
            .await
            .map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        let json = serde_json::to_string_pretty(config).map_err(|e| RmError::Invalid {
            message: e.to_string(),
        })?;
        #[cfg(unix)]
        {
            use tokio::io::AsyncWriteExt;
            let mut file = tokio::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .mode(0o600)
                .open(&self.config_path)
                .await
                .map_err(|e| RmError::Swap {
                    message: e.to_string(),
                })?;
            file.write_all(json.as_bytes())
                .await
                .map_err(|e| RmError::Swap {
                    message: e.to_string(),
                })?;
            // tokio::fs::File does not flush on drop; without this an immediately
            // following load() can read the still-truncated file and lose the config.
            file.flush().await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        }
        #[cfg(not(unix))]
        {
            fs::write(&self.config_path, &json)
                .await
                .map_err(|e| RmError::Swap {
                    message: e.to_string(),
                })?;
        }
        Ok(())
    }

    pub fn to_public_state(&self, config: &Config, active_path_override: Option<String>) -> PublicState {
        let active_path = if config.active_tag.is_some() {
            active_path_override.or_else(|| {
                Some(active_path(&self.data_dir).to_string_lossy().into_owned())
            })
        } else {
            None
        };
        PublicState {
            active_tag: config.active_tag.clone(),
            active_path,
            data_dir: self.data_dir.to_string_lossy().into_owned(),
            builds: config.builds.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn returns_default_when_no_config() {
        let dir = tempdir().unwrap();
        let store = ConfigStore::new(dir.path());
        let config = store.load().await;
        assert!(config.builds.is_empty());
        assert!(config.active_tag.is_none());
    }

    #[tokio::test]
    async fn round_trips_config() {
        let dir = tempdir().unwrap();
        let store = ConfigStore::new(dir.path());
        let config = Config {
            active_tag: Some("v1.0.0".to_string()),
            builds: vec![crate::types::CachedBuild {
                tag: "v1.0.0".to_string(),
                version: "1.0.0".to_string(),
                channel: crate::types::Channel::Stable,
                downloaded_at: "2026-01-01T00:00:00Z".to_string(),
            }],
        };
        store.save(&config).await.unwrap();

        let reloaded = ConfigStore::new(dir.path()).load().await;
        assert_eq!(reloaded.active_tag, Some("v1.0.0".to_string()));
        assert_eq!(reloaded.builds.len(), 1);
    }

    #[tokio::test]
    async fn file_permissions_are_0600() {
        let dir = tempdir().unwrap();
        let store = ConfigStore::new(dir.path());
        store.save(&Config { active_tag: None, builds: vec![] }).await.unwrap();

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let meta = std::fs::metadata(dir.path().join("config.json")).unwrap();
            assert_eq!(meta.permissions().mode() & 0o777, 0o600);
        }
    }

    #[tokio::test]
    async fn to_public_state_has_no_token_field() {
        let dir = tempdir().unwrap();
        let store = ConfigStore::new(dir.path());
        let config = Config { active_tag: None, builds: vec![] };
        let state = store.to_public_state(&config, None);
        let serialized = serde_json::to_string(&state).unwrap();
        assert!(!serialized.contains("token"));
        assert!(!serialized.contains("hasToken"));
    }
}
