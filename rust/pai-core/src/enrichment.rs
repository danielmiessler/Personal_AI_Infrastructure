use serde::{Deserialize, Serialize};
use crate::{HookEvent, HookEventType};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AgentMetadata {
    pub agent_type: String,
    pub instance_number: u32,
    pub parent_session_id: Option<String>,
}

pub struct EnrichmentEngine;

impl EnrichmentEngine {
    pub fn enrich(event: &mut HookEvent) {
        if let HookEventType::PreToolUse = event.event_type {
            if event.payload["tool_name"] == "Task" {
                let description = event.payload["tool_input"]["description"].as_str().unwrap_or("");
                
                // PAI Standard Pattern: [agent-type-N]
                let re = regex::Regex::new(r"\[([a-z-]+)-(\d+)\]").unwrap();
                if let Some(caps) = re.captures(description) {
                    let agent_type = caps[1].to_string();
                    let instance_number = caps[2].parse::<u32>().unwrap_or(0);
                    
                    event.payload["agent_metadata"] = serde_json::json!({
                        "agent_type": agent_type,
                        "instance_number": instance_number,
                        "parent_session_id": event.session_id.clone()
                    });
                }
            }
        }
    }
}
