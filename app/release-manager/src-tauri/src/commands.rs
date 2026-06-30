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
