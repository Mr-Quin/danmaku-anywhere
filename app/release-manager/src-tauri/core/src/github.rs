use serde::Deserialize;

use crate::error::RmError;
use crate::types::{Channel, PreviewSubtype, ReleaseAsset};

const CHROME_ASSET_SUFFIX: &str = "-chrome.zip";
const ASSET_NAME_PREFIX: &str = "danmaku-anywhere-";

#[derive(Debug, Deserialize)]
struct RawAsset {
    name: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct RawRelease {
    tag_name: String,
    prerelease: bool,
    published_at: String,
    assets: Vec<RawAsset>,
}

fn preview_subtype_from_tag(tag: &str) -> PreviewSubtype {
    if tag.starts_with("nightly-") {
        PreviewSubtype::Nightly
    } else if tag.starts_with("preview-pr-") {
        PreviewSubtype::Pr
    } else if tag.starts_with("preview-branch-") {
        PreviewSubtype::Branch
    } else if tag.starts_with("preview-manual-") {
        PreviewSubtype::Manual
    } else {
        PreviewSubtype::Generic
    }
}

fn version_from_asset_name(name: &str) -> String {
    let base = &name[..name.len() - CHROME_ASSET_SUFFIX.len()];
    if let Some(rest) = base.strip_prefix(ASSET_NAME_PREFIX) {
        rest.to_string()
    } else {
        base.to_string()
    }
}

fn to_release_asset(raw: &RawRelease) -> Option<ReleaseAsset> {
    let asset = raw
        .assets
        .iter()
        .find(|a| a.name.ends_with(CHROME_ASSET_SUFFIX))?;

    let channel = if raw.prerelease {
        Channel::Preview
    } else {
        Channel::Stable
    };
    let preview_subtype = if raw.prerelease {
        Some(preview_subtype_from_tag(&raw.tag_name))
    } else {
        None
    };

    Some(ReleaseAsset {
        tag: raw.tag_name.clone(),
        version: version_from_asset_name(&asset.name),
        channel,
        preview_subtype,
        published_at: raw.published_at.clone(),
        asset_url: asset.url.clone(),
    })
}

pub fn parse_releases(payload: &serde_json::Value) -> Vec<ReleaseAsset> {
    let arr = match payload.as_array() {
        Some(a) => a,
        None => return vec![],
    };
    arr.iter()
        .filter_map(|v| {
            let raw = RawRelease::deserialize(v).ok()?;
            to_release_asset(&raw)
        })
        .collect()
}

pub async fn fetch_releases(
    client: &reqwest::Client,
    base_url: &str,
    token: Option<&str>,
    page: u32,
) -> Result<(Vec<ReleaseAsset>, usize), RmError> {
    let mut req = client
        .get(base_url)
        .query(&[("per_page", "100"), ("page", &page.to_string())])
        .header("Accept", "application/vnd.github+json");

    if let Some(t) = token {
        req = req.header("Authorization", format!("Bearer {t}"));
    }

    let response = req.send().await.map_err(|e| RmError::Network {
        message: e.to_string(),
    })?;

    let status = response.status().as_u16();

    if status == 401 {
        return Err(RmError::Auth {
            status: 401,
            message: "GitHub token is missing or invalid".to_string(),
        });
    }

    if status == 403 {
        let remaining = response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if remaining == "0" {
            return Err(RmError::RateLimited {
                message: "GitHub rate limit reached".to_string(),
            });
        }
        return Err(RmError::Auth {
            status: 403,
            message: "GitHub rejected the request".to_string(),
        });
    }

    if !response.status().is_success() {
        return Err(RmError::Network {
            message: format!("GitHub responded with {status}"),
        });
    }

    let payload: serde_json::Value = response.json().await.map_err(|e| RmError::Network {
        message: e.to_string(),
    })?;

    let raw_count = payload.as_array().map(|a| a.len()).unwrap_or(0);
    Ok((parse_releases(&payload), raw_count))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> serde_json::Value {
        let json = include_str!("../tests/fixtures/releases.json");
        serde_json::from_str(json).expect("valid fixture")
    }

    #[test]
    fn classifies_stable_vs_preview() {
        let releases = parse_releases(&fixture());
        let stable = releases.iter().find(|r| r.tag == "v1.2.0").unwrap();
        assert!(matches!(stable.channel, Channel::Stable));
        let nightly = releases.iter().find(|r| r.tag == "nightly-123456").unwrap();
        assert!(matches!(nightly.channel, Channel::Preview));
    }

    #[test]
    fn derives_preview_subtype() {
        let releases = parse_releases(&fixture());
        let subtype_of = |tag: &str| {
            releases
                .iter()
                .find(|r| r.tag == tag)
                .and_then(|r| r.preview_subtype.clone())
        };
        assert!(matches!(subtype_of("nightly-123456"), Some(PreviewSubtype::Nightly)));
        assert!(matches!(subtype_of("preview-pr-460"), Some(PreviewSubtype::Pr)));
        assert!(matches!(subtype_of("preview-branch-feature-foo"), Some(PreviewSubtype::Branch)));
        assert!(matches!(subtype_of("preview-manual-11"), Some(PreviewSubtype::Manual)));
    }

    #[test]
    fn unrecognized_preview_is_generic() {
        let releases = parse_releases(&fixture());
        let generic = releases.iter().find(|r| r.tag == "latest-preview").unwrap();
        assert!(matches!(generic.channel, Channel::Preview));
        assert!(matches!(generic.preview_subtype, Some(PreviewSubtype::Generic)));
    }

    #[test]
    fn drops_releases_without_chrome_asset() {
        let releases = parse_releases(&fixture());
        assert!(releases.iter().find(|r| r.tag == "v1.1.0-no-chrome").is_none());
    }

    #[test]
    fn resolves_chrome_asset_url_and_version() {
        let releases = parse_releases(&fixture());
        let stable = releases.iter().find(|r| r.tag == "v1.2.0").unwrap();
        assert_eq!(stable.version, "1.2.0");
        assert_eq!(
            stable.asset_url,
            "https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases/assets/2"
        );
    }
}
