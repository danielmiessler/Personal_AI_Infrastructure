use serde::{Deserialize, Serialize};
use crate::HookEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PAIEvent {
    pub r#type: String,
    pub data: HookEvent,
}

pub struct ObservabilityStreamer;

impl ObservabilityStreamer {
    pub fn format_for_dashboard(event: HookEvent) -> String {
        let wrapped = PAIEvent {
            r#type: "event".to_string(),
            data: event,
        };
        serde_json::to_string(&wrapped).unwrap_or_default()
    }
}
