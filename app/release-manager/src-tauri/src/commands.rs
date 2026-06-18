use release_manager_core::{
    error::RmError,
    manager::ReleaseManager,
    types::{PublicState, ReleaseAsset},
};

type State<'a> = tauri::State<'a, tokio::sync::Mutex<ReleaseManager>>;

#[tauri::command]
pub async fn get_state(state: State<'_>) -> Result<PublicState, RmError> {
    Ok(state.lock().await.get_state().await)
}

#[tauri::command]
pub async fn list_releases(state: State<'_>, page: Option<u32>) -> Result<Vec<ReleaseAsset>, RmError> {
    state.lock().await.list_releases(page.unwrap_or(1)).await
}

#[tauri::command]
pub async fn download_build(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.lock().await.download_build(&tag).await
}

#[tauri::command]
pub async fn set_active(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.lock().await.set_active(&tag).await
}

#[tauri::command]
pub async fn remove_build(state: State<'_>, tag: String) -> Result<PublicState, RmError> {
    state.lock().await.remove_build(&tag).await
}
