use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
}
