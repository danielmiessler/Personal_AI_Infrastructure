use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeSource {
    pub name: String,
    pub url: String,
    pub priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFound {
    pub source: String,
    pub title: String,
    pub url: String,
    pub date: String,
}

pub struct UpgradeMonitor {
    sources: Vec<UpgradeSource>,
}

impl UpgradeMonitor {
    pub fn new() -> Self {
        Self {
            sources: vec![
                UpgradeSource { 
                    name: "Claude Code Changelog".to_string(), 
                    url: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md".to_string(),
                    priority: "HIGH".to_string()
                },
                UpgradeSource { 
                    name: "Anthropic News".to_string(), 
                    url: "https://www.anthropic.com/news".to_string(),
                    priority: "MEDIUM".to_string()
                },
            ],
        }
    }

    pub async fn check_for_updates(&self) -> Result<Vec<UpdateFound>> {
        let mut updates = Vec::new();
        let client = reqwest::Client::new();

        for source in &self.sources {
            // Simplified check: just seeing if we can reach the source for now
            // In a real impl, we would compare hashes or parse RSS
            if let Ok(res) = client.get(&source.url).send().await {
                if res.status().is_success() {
                    updates.push(UpdateFound {
                        source: source.name.clone(),
                        title: "New activity detected".to_string(),
                        url: source.url.clone(),
                        date: chrono::Utc::now().to_rfc3339(),
                    });
                }
            }
        }

        Ok(updates)
    }
}
