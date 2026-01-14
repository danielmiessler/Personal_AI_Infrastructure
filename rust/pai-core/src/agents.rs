use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use std::path::Path;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trait {
    pub name: String,
    pub description: String,
    pub prompt_fragment: Option<String>,
    pub keywords: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitsRegistry {
    pub expertise: HashMap<String, Trait>,
    pub personality: HashMap<String, Trait>,
    pub approach: HashMap<String, Trait>,
}

pub struct AgentFactory {
    registry: TraitsRegistry,
}

impl AgentFactory {
    pub fn from_yaml(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let registry: TraitsRegistry = serde_yaml::from_str(&content)?;
        Ok(Self { registry })
    }

    pub fn compose_agent(&self, expertise: &str, personality: &str, approach: &str) -> Result<String> {
        let exp = self.registry.expertise.get(expertise)
            .ok_or_else(|| anyhow!("Unknown expertise: {}", expertise))?;
        let pers = self.registry.personality.get(personality)
            .ok_or_else(|| anyhow!("Unknown personality: {}", personality))?;
        let app = self.registry.approach.get(approach)
            .ok_or_else(|| anyhow!("Unknown approach: {}", approach))?;

        let mut prompt = format!("# Composed Agent: {} {} {}\n\n", exp.name, pers.name, app.name);
        
        prompt.push_str("## Identity\n");
        prompt.push_str(&exp.description);
        prompt.push_str("\n\n");

        if let Some(ref fragment) = pers.prompt_fragment {
            prompt.push_str("## Personality\n");
            prompt.push_str(fragment);
            prompt.push_str("\n\n");
        }

        if let Some(ref fragment) = app.prompt_fragment {
            prompt.push_str("## Approach\n");
            prompt.push_str(fragment);
            prompt.push_str("\n\n");
        }

        Ok(prompt)
    }

    pub fn verifier_mode(&self) -> Result<String> {
        // PAI Standard: The Skeptical Verifier
        self.compose_agent("technical", "skeptical", "adversarial")
    }
}
