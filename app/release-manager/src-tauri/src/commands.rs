use release_manager_core::{
    error::RmError,
    manager::ReleaseManager,
    types::{PublicState, ReleaseAsset},
};

type State<'a> = tauri::State<'a, ReleaseManager>;

#[tauri::command]
pub async fn get_state(state: State<'_>) -> Result<PublicState, RmError> {
    Ok(state.get_state().await)
}

#[tauri::command]
pub async fn list_releases(state: State<'_>, page: Option<u32>) -> Result<Vec<ReleaseAsset>, RmError> {
    state.list_releases(page.unwrap_or(1)).await
}

#[tauri::command]
pub async fn download_build(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.download_build(&tag).await
}

#[tauri::command]
pub async fn set_active(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.set_active(&tag).await
}

#[tauri::command]
pub async fn remove_build(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.remove_build(&tag).await
}

const EXTENSIONS_PAGE: &str = "chrome://extensions";

// Chrome refuses chrome:// URLs from the OS URL handler, so launch Chrome itself
// with the URL as an argument.
#[tauri::command]
pub fn open_extensions_page() -> Result<(), RmError> {
    let not_found = |e: std::io::Error| RmError::NotFound {
        message: format!("could not open Chrome: {e}"),
    };

    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("open")
            .args(["-a", "Google Chrome", EXTENSIONS_PAGE])
            .output()
            .map_err(not_found)?;
        if !out.status.success() {
            return Err(RmError::NotFound {
                message: "Google Chrome is not installed".to_string(),
            });
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let status = std::process::Command::new("cmd")
            .args(["/C", "start", "", "chrome", EXTENSIONS_PAGE])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(not_found)?;
        if !status.success() {
            return Err(RmError::NotFound {
                message: "Google Chrome is not installed".to_string(),
            });
        }
    }

    // The AppImage preloads its own libwayland into this process; Chrome must not
    // inherit that. Reap the child on a thread so it doesn't linger as a zombie.
    #[cfg(target_os = "linux")]
    {
        let mut child = std::process::Command::new("google-chrome")
            .arg(EXTENSIONS_PAGE)
            .env_remove("LD_PRELOAD")
            .env_remove("LD_LIBRARY_PATH")
            .env_remove("RM_HOST_WAYLAND")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(not_found)?;
        std::thread::spawn(move || child.wait());
    }

    Ok(())
}
