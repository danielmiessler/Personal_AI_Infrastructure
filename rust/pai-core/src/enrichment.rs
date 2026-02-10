use serde::{Deserialize, Serialize};
use crate::{HookEvent, HookEventType};
use std::sync::OnceLock;
use regex::Regex;

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
                static RE: OnceLock<Regex> = OnceLock::new();
                let re = RE.get_or_init(|| Regex::new(r"\[([a-z-]+)-(\d+)\]").unwrap());
                
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{HookEvent, HookEventType};
    use chrono::Utc;

    #[test]
    fn test_enrich_success() {
        let mut event = HookEvent {
            event_type: HookEventType::PreToolUse,
            session_id: "test".to_string(),
            payload: serde_json::json!({
                "tool_name": "Task",
                "tool_input": { "description": "Running [researcher-1]" }
            }),
            timestamp: Utc::now(),
        };
        EnrichmentEngine::enrich(&mut event);
        assert_eq!(event.payload["agent_metadata"]["agent_type"], "researcher");
        assert_eq!(event.payload["agent_metadata"]["instance_number"], 1);
    }

    #[test]
    fn test_enrich_wrong_tool() {
        let mut event = HookEvent {
            event_type: HookEventType::PreToolUse,
            session_id: "test".to_string(),
            payload: serde_json::json!({
                "tool_name": "Bash",
                "tool_input": { "description": "Running [researcher-1]" }
            }),
            timestamp: Utc::now(),
        };
        EnrichmentEngine::enrich(&mut event);
        assert!(event.payload["agent_metadata"].is_null());
    }

    #[test]
    fn test_enrich_malformed_pattern() {
        let mut event = HookEvent {
            event_type: HookEventType::PreToolUse,
            session_id: "test".to_string(),
            payload: serde_json::json!({
                "tool_name": "Task",
                "tool_input": { "description": "Running [researcher-abc]" }
            }),
            timestamp: Utc::now(),
        };
        EnrichmentEngine::enrich(&mut event);
        assert!(event.payload["agent_metadata"].is_null());
    }

    #[test]
    fn test_enrich_missing_fields() {
        let mut event = HookEvent {
            event_type: HookEventType::PreToolUse,
            session_id: "test".to_string(),
            payload: serde_json::json!({
                "tool_name": "Task"
            }),
            timestamp: Utc::now(),
        };
        EnrichmentEngine::enrich(&mut event);
        assert!(event.payload["agent_metadata"].is_null());
    }
}
