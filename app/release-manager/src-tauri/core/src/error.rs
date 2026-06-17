use serde::ser::{SerializeMap, Serializer};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum RmError {
    #[error("authentication failed (status {status}): {message}")]
    Auth { status: u16, message: String },
    #[error("GitHub rate limit reached: {message}")]
    RateLimited { message: String },
    #[error("network error: {message}")]
    Network { message: String },
    #[error("swap failed: {message}")]
    Swap { message: String },
    #[error("not found: {message}")]
    NotFound { message: String },
    #[error("conflict: {message}")]
    Conflict { message: String },
    #[error("invalid: {message}")]
    Invalid { message: String },
}

impl Serialize for RmError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        match self {
            RmError::Auth { status, message } => {
                map.serialize_entry("kind", "auth")?;
                map.serialize_entry("status", status)?;
                map.serialize_entry("message", message)?;
            }
            RmError::RateLimited { message } => {
                map.serialize_entry("kind", "rate-limited")?;
                map.serialize_entry("message", message)?;
            }
            RmError::Network { message } => {
                map.serialize_entry("kind", "network")?;
                map.serialize_entry("message", message)?;
            }
            RmError::Swap { message } => {
                map.serialize_entry("kind", "swap")?;
                map.serialize_entry("message", message)?;
            }
            RmError::NotFound { message } => {
                map.serialize_entry("kind", "not-found")?;
                map.serialize_entry("message", message)?;
            }
            RmError::Conflict { message } => {
                map.serialize_entry("kind", "conflict")?;
                map.serialize_entry("message", message)?;
            }
            RmError::Invalid { message } => {
                map.serialize_entry("kind", "invalid")?;
                map.serialize_entry("message", message)?;
            }
        }
        map.end()
    }
}
