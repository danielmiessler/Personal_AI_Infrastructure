use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use anyhow::Result;
use crate::HookEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MemoryTier {
    Hot,   // Capture: Active work
    Warm,  // Synthesis: Phase-based learnings
    Cold,  // Application: Immutable history
}

pub struct TieredMemoryManager {
    root_dir: PathBuf,
}

impl TieredMemoryManager {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }

    pub fn get_path(&self, tier: MemoryTier) -> PathBuf {
        match tier {
            MemoryTier::Hot => self.root_dir.join("Work"),
            MemoryTier::Warm => self.root_dir.join("Learning"),
            MemoryTier::Cold => self.root_dir.join("History"),
        }
    }

    pub fn log_event(&self, event: &HookEvent) -> Result<()> {
        let now = chrono::Utc::now();
        let month_dir = self.root_dir.join("History").join("raw-outputs").join(now.format("%Y-%m").to_string());
        create_dir_all(&month_dir)?;

        let filename = format!("{}_all-events.jsonl", now.format("%Y-%m-%d"));
        let file_path = month_dir.join(filename);

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(file_path)?;

        let json = serde_json::to_string(event)?;
        writeln!(file, "{}", json)?;

        Ok(())
    }
}