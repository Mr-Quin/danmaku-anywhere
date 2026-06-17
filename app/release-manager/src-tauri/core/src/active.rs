use std::path::{Path, PathBuf};

use tokio::fs;

use crate::error::RmError;

const ACTIVE_DIR: &str = "active";

pub fn active_path(data_dir: &Path) -> PathBuf {
    data_dir.join(ACTIVE_DIR)
}

pub fn cache_path(data_dir: &Path, tag: &str) -> PathBuf {
    data_dir.join("cache").join(tag)
}

async fn ensure_real_dir(dir: &Path) -> Result<(), RmError> {
    // Remove a symlink if present before creating the directory.
    if let Ok(meta) = fs::symlink_metadata(dir).await {
        if meta.file_type().is_symlink() {
            fs::remove_file(dir).await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        }
    }
    fs::create_dir_all(dir).await.map_err(|e| RmError::Swap {
        message: e.to_string(),
    })
}

async fn empty_dir(dir: &Path) -> Result<(), RmError> {
    let mut entries = match fs::read_dir(dir).await {
        Ok(e) => e,
        Err(_) => return Ok(()),
    };
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if entry.file_type().await.map(|t| t.is_dir()).unwrap_or(false) {
            fs::remove_dir_all(&path).await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        } else {
            fs::remove_file(&path).await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        }
    }
    Ok(())
}

async fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), RmError> {
    fs::create_dir_all(dst).await.map_err(|e| RmError::Swap {
        message: e.to_string(),
    })?;
    let mut entries = fs::read_dir(src).await.map_err(|e| RmError::Swap {
        message: e.to_string(),
    })?;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if entry.file_type().await.map(|t| t.is_dir()).unwrap_or(false) {
            Box::pin(copy_dir_all(&src_path, &dst_path)).await?;
        } else {
            fs::copy(&src_path, &dst_path).await.map_err(|e| RmError::Swap {
                message: e.to_string(),
            })?;
        }
    }
    Ok(())
}

// The active folder must be a real directory with copies of the build files, not a symlink.
// On Linux with Flatpak, the document portal resolves paths at access time and cannot
// follow symlinks outside the sandbox boundary.
pub async fn set_active(data_dir: &Path, tag: &str) -> Result<String, RmError> {
    let target = cache_path(data_dir, tag);
    let dir = active_path(data_dir);

    if !target.exists() {
        return Err(RmError::Swap {
            message: format!("cache dir for {tag} is missing"),
        });
    }

    ensure_real_dir(&dir).await?;
    empty_dir(&dir).await?;
    copy_dir_all(&target, &dir).await?;

    Ok(dir.to_string_lossy().into_owned())
}

pub async fn clear_active(data_dir: &Path) -> Result<(), RmError> {
    empty_dir(&active_path(data_dir)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    async fn setup_cache(data_dir: &Path, tag: &str, content: &str) {
        let cache = data_dir.join("cache").join(tag);
        fs::create_dir_all(&cache).await.unwrap();
        fs::write(cache.join("manifest.json"), content).await.unwrap();
    }

    #[tokio::test]
    async fn set_active_copies_into_real_dir() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path();
        setup_cache(data_dir, "v1", "one").await;

        let result = set_active(data_dir, "v1").await;
        assert!(result.is_ok());

        let active = active_path(data_dir);
        let meta = fs::symlink_metadata(&active).await.unwrap();
        assert!(meta.file_type().is_dir());
        assert!(!meta.file_type().is_symlink());

        let content = fs::read_to_string(active.join("manifest.json")).await.unwrap();
        assert_eq!(content, "one");
    }

    #[tokio::test]
    async fn set_active_replaces_symlink_with_real_dir() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path();
        setup_cache(data_dir, "v1", "one").await;
        setup_cache(data_dir, "v2", "two").await;

        let active = active_path(data_dir);
        #[cfg(unix)]
        {
            let cache_v1 = data_dir.join("cache").join("v1");
            std::os::unix::fs::symlink(&cache_v1, &active).unwrap();
            let before = fs::symlink_metadata(&active).await.unwrap();
            assert!(before.file_type().is_symlink());
        }

        let result = set_active(data_dir, "v2").await;
        assert!(result.is_ok());

        let meta = fs::symlink_metadata(&active).await.unwrap();
        assert!(!meta.file_type().is_symlink());
        assert!(meta.is_dir());

        let content = fs::read_to_string(active.join("manifest.json")).await.unwrap();
        assert_eq!(content, "two");
    }

    #[tokio::test]
    async fn set_active_fails_when_cache_missing() {
        let dir = tempdir().unwrap();
        let result = set_active(dir.path(), "does-not-exist").await;
        assert!(result.is_err());
        if let Err(RmError::Swap { .. }) = result {
        } else {
            panic!("expected Swap error");
        }
    }

    #[tokio::test]
    async fn clear_active_empties_the_dir() {
        let dir = tempdir().unwrap();
        let data_dir = dir.path();
        setup_cache(data_dir, "v1", "one").await;
        set_active(data_dir, "v1").await.unwrap();

        clear_active(data_dir).await.unwrap();

        let active = active_path(data_dir);
        let mut entries = fs::read_dir(&active).await.unwrap();
        assert!(entries.next_entry().await.unwrap().is_none());
    }
}
