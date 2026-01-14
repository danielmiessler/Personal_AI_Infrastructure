use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use anyhow::Result;
use crate::algorithm::EffortLevel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capability {
    pub effort_min: EffortLevel,
    pub description: Option<String>,
    pub use_when: Option<String>,
    pub subagent_type: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityRegistry {
    pub version: String,
    pub models: HashMap<String, Capability>,
    pub thinking: HashMap<String, Capability>,
    pub research: HashMap<String, Capability>,
    pub execution: HashMap<String, Capability>,
}

pub struct DynamicCapabilityLoader {
    registry: CapabilityRegistry,
}

impl DynamicCapabilityLoader {
    pub fn from_yaml(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let registry: CapabilityRegistry = serde_yaml::from_str(&content)?;
        Ok(Self { registry })
    }

    pub fn get_available(&self, effort: EffortLevel) -> Vec<String> {
        let mut available = Vec::new();
        
        let categories = [
            &self.registry.models,
            &self.registry.thinking,
            &self.registry.research,
            &self.registry.execution,
        ];

        for cat in categories {
            for (name, cap) in cat {
                if effort >= cap.effort_min {
                    available.push(name.clone());
                }
            }
        }
        
        available
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityLimits {
    pub target_model: String,
    pub max_parallel_agents: u32,
    pub allow_background_thinking: bool,
    pub iteration_limit: u32,
}

pub struct CapabilityOrchestrator;

impl CapabilityOrchestrator {
    pub fn get_limits(effort: EffortLevel) -> CapabilityLimits {
        match effort {
            EffortLevel::Trivial => CapabilityLimits {
                target_model: "haiku".to_string(),
                max_parallel_agents: 0,
                allow_background_thinking: false,
                iteration_limit: 1,
            },
            EffortLevel::Quick => CapabilityLimits {
                target_model: "haiku".to_string(),
                max_parallel_agents: 2,
                allow_background_thinking: false,
                iteration_limit: 1,
            },
            EffortLevel::Standard => CapabilityLimits {
                target_model: "sonnet".to_string(),
                max_parallel_agents: 4,
                allow_background_thinking: true,
                iteration_limit: 3,
            },
            EffortLevel::Thorough => CapabilityLimits {
                target_model: "sonnet".to_string(),
                max_parallel_agents: 8,
                allow_background_thinking: true,
                iteration_limit: 5,
            },
            EffortLevel::Determined => CapabilityLimits {
                target_model: "opus".to_string(),
                max_parallel_agents: 32,
                allow_background_thinking: true,
                iteration_limit: u32::MAX,
            },
        }
    }
}
