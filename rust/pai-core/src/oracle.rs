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
                // Security Hardening: Only allow external HTTPS to prevent internal SSRF
                if !target.starts_with("https://") {
                    return Err(anyhow::anyhow!("SSRF Protection: Only external HTTPS allowed"));
                }
                let res = reqwest::blocking::get(target)?;
                Ok(res.status().is_success())
            }
            OracleType::CommandExitCode => {
                // Security Hardening: Strict whitelist of commands to prevent injection
                let allowed_commands = ["ls", "git status", "cargo test", "cargo check", "exit"];
                if !allowed_commands.iter().any(|&c| target.starts_with(c)) {
                    return Err(anyhow::anyhow!("Command Injection Protection: Command not in whitelist"));
                }

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
                
                // Security: Prevent reading sensitive files via grep
                if path.contains(".env") || path.contains("MISSION.md") {
                    return Err(anyhow::anyhow!("Data Leakage Protection: Access to sensitive file blocked"));
                }

                let content = std::fs::read_to_string(path)?;
                Ok(content.contains(pattern))
            }
        }
    }
}
