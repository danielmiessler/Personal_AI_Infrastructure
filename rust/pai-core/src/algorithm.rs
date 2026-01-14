use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlgorithmPhase {
    Observe,
    Think,
    Plan,
    Build,
    Execute,
    Verify,
    Learn,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, PartialOrd)]
pub enum EffortLevel {
    Trivial,
    Quick,
    Standard,
    Thorough,
    Determined,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ISCRequirement {
    pub id: u32,
    pub description: String,
    pub source: ISCSource,
    pub status: ISCStatus,
    pub capability: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ISCSource {
    Explicit,
    Inferred,
    Implicit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ISCStatus {
    Pending,
    Active,
    Done,
    Adjusted(String),
    Blocked(String),
}

pub struct AlgorithmState {
    pub phase: AlgorithmPhase,
    pub effort: EffortLevel,
    pub requirements: Vec<ISCRequirement>,
    pub iteration: u32,
}

pub struct AlgorithmEngine {
    state: Arc<Mutex<AlgorithmState>>,
}

impl AlgorithmEngine {
    pub fn new(effort: EffortLevel) -> Self {
        Self {
            state: Arc::new(Mutex::new(AlgorithmState {
                phase: AlgorithmPhase::Observe,
                effort,
                requirements: Vec::new(),
                iteration: 1,
            })),
        }
    }

    pub fn add_requirement(&self, description: &str, source: ISCSource) -> u32 {
        let mut state = self.state.lock().unwrap();
        let id = (state.requirements.len() + 1) as u32;
        state.requirements.push(ISCRequirement {
            id,
            description: description.to_string(),
            source,
            status: ISCStatus::Pending,
            capability: None,
        });
        id
    }

    pub fn set_status(&self, id: u32, status: ISCStatus) -> bool {
        let mut state = self.state.lock().unwrap();
        if let Some(req) = state.requirements.iter_mut().find(|r| r.id == id) {
            req.status = status;
            true
        } else {
            false
        }
    }

    pub fn advance_phase(&self) -> bool {
        let mut state = self.state.lock().unwrap();
        match state.phase {
            AlgorithmPhase::Observe => state.phase = AlgorithmPhase::Think,
            AlgorithmPhase::Think => state.phase = AlgorithmPhase::Plan,
            AlgorithmPhase::Plan => state.phase = AlgorithmPhase::Build,
            AlgorithmPhase::Build => state.phase = AlgorithmPhase::Execute,
            AlgorithmPhase::Execute => state.phase = AlgorithmPhase::Verify,
            AlgorithmPhase::Verify => state.phase = AlgorithmPhase::Learn,
            AlgorithmPhase::Learn => return false,
        }
        true
    }

    pub fn get_current_phase(&self) -> AlgorithmPhase {
        self.state.lock().unwrap().phase.clone()
    }

    pub fn generate_isc_table(&self) -> String {
        let state = self.state.lock().unwrap();
        let mut table = format!("## ISC: Phase {:?} | Effort {:?}\n\n", state.phase, state.effort);
        table.push_str("| # | Requirement | Source | Status |\n");
        table.push_str("|---|-------------|--------|--------|\n");
        for req in &state.requirements {
            let status_str = match &req.status {
                ISCStatus::Pending => "⏳ PENDING",
                ISCStatus::Active => "🔄 ACTIVE",
                ISCStatus::Done => "✅ DONE",
                ISCStatus::Adjusted(r) => &format!("🔧 ADJUSTED ({})", r),
                ISCStatus::Blocked(r) => &format!("🚫 BLOCKED ({})", r),
            };
            table.push_str(&format!("| {} | {} | {:?} | {} |\n", req.id, req.description, req.source, status_str));
        }
        table
    }
}