use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs::{OpenOptions, create_dir_all};
use tokio::io::AsyncWriteExt;
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

    pub async fn log_event(&self, event: &HookEvent) -> Result<()> {
        let now = chrono::Utc::now();
        let month_dir = self.root_dir.join("History").join("raw-outputs").join(now.format("%Y-%m").to_string());
        create_dir_all(&month_dir).await?;

        let filename = format!("{}_all-events.jsonl", now.format("%Y-%m-%d"));
        let file_path = month_dir.join(filename);

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(file_path).await?;

        let json = serde_json::to_string(event)?;
        file.write_all(format!("{}\n", json).as_bytes()).await?;

        Ok(())
    }
}

pub struct SessionManager {
    root_dir: PathBuf,
}

impl SessionManager {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }

    pub async fn generate_summary(&self, session_id: &str, events: &[HookEvent]) -> Result<String> {
        // Black Swan Security: Prevent path traversal by sanitizing session_id
        let safe_session_id = session_id.replace(['/', '\\', ':', '.'], "_");
        
        let mut summary = format!("# Session Summary: {}\n\n", safe_session_id);
        summary.push_str("## ⚡ Actions Taken\n");
        
        for event in events {
            if let crate::HookEventType::PreToolUse = event.event_type {
                let tool = event.payload["tool_name"].as_str().unwrap_or("Unknown");
                summary.push_str(&format!("- Executed **{}** tool\n", tool));
            }
        }
        
        let path = self.root_dir.join("History").join("sessions").join(format!("{}.md", safe_session_id));
        if let Some(parent) = path.parent() {
            create_dir_all(parent).await?;
        }
        tokio::fs::write(&path, &summary).await?;
        
        Ok(summary)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_session_manager_traversal_protection() {
        let tmp = tempdir().unwrap();
        let manager = SessionManager::new(tmp.path().to_path_buf());
        
        // Malicious session ID
        let session_id = "../../etc/passwd";
        let res = manager.generate_summary(session_id, &[]).await.unwrap();
        
        assert!(res.contains("Session Summary: ______etc_passwd"));
        let path = tmp.path().join("History").join("sessions").join("______etc_passwd.md");
        assert!(path.exists());
    }
}

        