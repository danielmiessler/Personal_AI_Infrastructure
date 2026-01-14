use serde::{Deserialize, Serialize};
use crate::HookEvent;
use crate::algorithm::AlgorithmPhase;
use tracing::{info, span, Level};

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

    pub fn trace_phase(session_id: &str, phase: &AlgorithmPhase) {
        let phase_name = format!("{:?}", phase);
        let span = span!(Level::INFO, "algorithm_phase", session_id = %session_id, phase = %phase_name);
        let _enter = span.enter();
        info!("Transitioned to phase: {}", phase_name);
    }
}
