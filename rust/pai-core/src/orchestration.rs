use serde::{Deserialize, Serialize};
use crate::algorithm::EffortLevel;

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
