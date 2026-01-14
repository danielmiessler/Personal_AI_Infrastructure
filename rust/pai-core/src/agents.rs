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
pub struct AgentRegistry {
    pub expertise: HashMap<String, Trait>,
    pub personality: HashMap<String, Trait>,
    pub approach: HashMap<String, Trait>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn from_yaml(path: &Path) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let registry: AgentRegistry = serde_yaml::from_str(&content)?;
        Ok(registry)
    }

    pub async fn load_from_yaml(path: &Path) -> Result<Self> {
        let content = tokio::fs::read_to_string(path).await?;
        let registry: AgentRegistry = serde_yaml::from_str(&content)?;
        Ok(registry)
    }

    pub fn get_expertise(&self, key: &str) -> Option<&Trait> {
        self.expertise.get(key)
    }

    pub fn get_personality(&self, key: &str) -> Option<&Trait> {
        self.personality.get(key)
    }

    pub fn get_approach(&self, key: &str) -> Option<&Trait> {
        self.approach.get(key)
    }
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self {
            expertise: HashMap::new(),
            personality: HashMap::new(),
            approach: HashMap::new(),
        }
    }
}

impl Default for AgentFactory {
    fn default() -> Self {
        Self {
            registry: AgentRegistry::default(),
        }
    }
}

pub struct AgentFactory {
    registry: AgentRegistry,
}

impl AgentFactory {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_registry(registry: AgentRegistry) -> Self {
        Self { registry }
    }

    pub fn from_yaml(path: &Path) -> Result<Self> {
        let registry = AgentRegistry::from_yaml(path)?;
        Ok(Self { registry })
    }

    pub async fn load_from_yaml(path: &Path) -> Result<Self> {
        let registry = AgentRegistry::load_from_yaml(path).await?;
        Ok(Self { registry })
    }

    pub fn compose_agent(&self, expertise: &str, personality: &str, approach: &str) -> Result<String> {
        let exp = self.registry.get_expertise(expertise)
            .ok_or_else(|| anyhow!("Unknown expertise: {}", expertise))?;
        let pers = self.registry.get_personality(personality)
            .ok_or_else(|| anyhow!("Unknown personality: {}", personality))?;
        let app = self.registry.get_approach(approach)
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs;

    #[tokio::test]
    async fn test_agent_factory_async_load() {
        let tmp = tempdir().unwrap();
        let path = tmp.path().join("traits.yaml");
        fs::write(&path, r#" 
expertise: {}
personality: {}
approach: {}
"#).unwrap();

        let factory = AgentFactory::load_from_yaml(&path).await.unwrap();
        assert!(factory.registry.expertise.is_empty());
    }
}