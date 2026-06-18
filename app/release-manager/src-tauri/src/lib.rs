use std::path::PathBuf;

use release_manager_core::manager::ReleaseManager;
use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data_dir = std::env::var("DA_RELEASE_MANAGER_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| {
                    dirs::home_dir()
                        .expect("cannot resolve home directory")
                        .join(".da-release-manager")
                });

            let github_base = std::env::var("DA_RELEASE_MANAGER_GITHUB_BASE").ok();

            // GitHub returns 403 for requests without a User-Agent header.
            let client = reqwest::Client::builder()
                .user_agent("danmaku-anywhere-release-manager")
                .build()
                .expect("failed to build HTTP client");

            let manager = ReleaseManager::with_client(data_dir, github_base, client);
            app.manage(tokio::sync::Mutex::new(manager));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::list_releases,
            commands::download_build,
            commands::set_active,
            commands::remove_build,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
