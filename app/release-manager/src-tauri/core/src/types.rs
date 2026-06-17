use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseAsset {
    pub tag: String,
    pub version: String,
    pub channel: Channel,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview_subtype: Option<PreviewSubtype>,
    pub published_at: String,
    pub asset_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedBuild {
    pub tag: String,
    pub version: String,
    pub channel: Channel,
    pub downloaded_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_tag: Option<String>,
    pub builds: Vec<CachedBuild>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicState {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_path: Option<String>,
    pub data_dir: String,
    pub builds: Vec<CachedBuild>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Channel {
    #[serde(rename = "stable")]
    Stable,
    #[serde(rename = "preview")]
    Preview,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PreviewSubtype {
    #[serde(rename = "nightly")]
    Nightly,
    #[serde(rename = "pr")]
    Pr,
    #[serde(rename = "branch")]
    Branch,
    #[serde(rename = "manual")]
    Manual,
    #[serde(rename = "generic")]
    Generic,
}
