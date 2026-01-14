use serde::{Deserialize, Serialize};
use anyhow::Result;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OracleType {
    FileExists,
    HttpSuccess,
    CommandExitCode,
    GrepMatch,
}

pub struct VerificationOracle;

impl VerificationOracle {
    pub fn verify(oracle_type: OracleType, target: &str) -> Result<bool> {
        match oracle_type {
            OracleType::FileExists => {
                Ok(Path::new(target).exists())
            }
            OracleType::HttpSuccess => {
                let res = reqwest::blocking::get(target)?;
                Ok(res.status().is_success())
            }
            OracleType::CommandExitCode => {
                let output = Command::new("sh")
                    .arg("-c")
                    .arg(target)
                    .output()?;
                Ok(output.status.success())
            }
            OracleType::GrepMatch => {
                // Simplified: target expected as "pattern|file_path"
                let parts: Vec<&str> = target.split('|').collect();
                if parts.len() != 2 { return Ok(false); }
                let pattern = parts[0];
                let path = parts[1];
                let content = std::fs::read_to_string(path)?;
                Ok(content.contains(pattern))
            }
        }
    }
}
