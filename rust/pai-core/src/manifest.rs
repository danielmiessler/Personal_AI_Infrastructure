use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs::{self, OpenOptions};
use std::io::Write;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealth {
    pub hooks_healthy: bool,
    pub memory_healthy: bool,
    pub skills_count: u32,
    pub last_upgrade: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeEntry {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub r#type: String,
    pub description: String,
}

pub struct ManifestEngine {
    pub root_dir: PathBuf,
}

impl ManifestEngine {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }

    pub fn log_upgrade(&self, r#type: &str, description: &str) -> Result<()> {
        let history_dir = self.root_dir.join("History");
        fs::create_dir_all(&history_dir)?;
        
        let path = history_dir.join("Upgrades.jsonl");
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;

        let entry = UpgradeEntry {
            timestamp: chrono::Utc::now(),
            r#type: r#type.to_string(),
            description: description.to_string(),
        };

        let json = serde_json::to_string(&entry)?;
        writeln!(file, "{}", json)?;
        Ok(())
    }

    pub fn check_health(&self) -> Result<SystemHealth> {
        let hooks_healthy = self.root_dir.join("hooks").exists();
        let memory_healthy = self.root_dir.join("History").exists();
        
        let skills_dir = self.root_dir.join("skills");
        let skills_count = if skills_dir.exists() {
            fs::read_dir(skills_dir)?.filter(|e| e.as_ref().map(|entry| entry.path().is_dir()).unwrap_or(false)).count() as u32
        } else {
            0
        };

        Ok(SystemHealth {
            hooks_healthy,
            memory_healthy,
            skills_count,
            last_upgrade: None, // In real impl, parse Upgrades.jsonl
        })
    }

    pub fn generate_manifest_md(&self) -> Result<String> {
        let health = self.check_health()?;
        let mut md = String::from("# PAI Rust Architecture Manifest\n\n");
        
        md.push_str("## System Health\n");
        md.push_str(&format!("- **Hooks:** {}\n", if health.hooks_healthy { "✅ Healthy" } else { "❌ Missing" }));
        md.push_str(&format!("- **Memory:** {}\n", if health.memory_healthy { "✅ Healthy" } else { "❌ Missing" }));
        md.push_str(&format!("- **Skills:** {} installed\n\n", health.skills_count));
        
        md.push_str("## Core Modules (Pure Rust)\n");
        md.push_str("- `pai-core::safety` (Security Validator)\n");
        md.push_str("- `pai-core::algorithm` (7-Phase Engine)\n");
        md.push_str("- `pai-core::memory` (Tiered Persistence)\n");
        md.push_str("- `pai-core::telos` (Alignment Engine)\n");
        
        Ok(md)
    }
}
