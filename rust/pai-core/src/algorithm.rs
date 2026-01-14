use serde::{Deserialize, Serialize};
use std::sync::{RwLock, atomic::{AtomicU32, Ordering}};

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
    Looping(u32), // Current iteration count
    Done,
    Adjusted(String),
    Blocked(String),
}

// Deprecated: Kept for compatibility if used as DTO, but AlgorithmEngine uses granular locks now.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlgorithmState {
    pub phase: AlgorithmPhase,
    pub effort: EffortLevel,
    pub requirements: Vec<ISCRequirement>,
    pub iteration: u32,
    pub completion_promise: Option<String>,
}

pub struct AlgorithmEngine {
    phase: RwLock<AlgorithmPhase>,
    effort: RwLock<EffortLevel>,
    requirements: RwLock<Vec<ISCRequirement>>,
    iteration: AtomicU32,
    completion_promise: RwLock<Option<String>>,
}

impl AlgorithmEngine {
    pub fn new(effort: EffortLevel) -> Self {
        Self {
            phase: RwLock::new(AlgorithmPhase::Observe),
            effort: RwLock::new(effort),
            requirements: RwLock::new(Vec::new()),
            iteration: AtomicU32::new(1),
            completion_promise: RwLock::new(None),
        }
    }

    pub fn set_promise(&self, promise: &str) {
        let mut promise_lock = self.completion_promise.write().unwrap();
        *promise_lock = Some(promise.to_string());
    }

    pub fn check_promise(&self, output: &str) -> bool {
        let promise_lock = self.completion_promise.read().unwrap();
        if let Some(ref promise) = *promise_lock {
            output.contains(promise) || output.contains(&format!("<promise>{}</promise>", promise))
        } else {
            true
        }
    }

    pub fn increment_loop(&self, id: u32) -> Option<u32> {
        let mut reqs = self.requirements.write().unwrap();
        if let Some(req) = reqs.iter_mut().find(|r| r.id == id) {
            let count = match req.status {
                ISCStatus::Looping(c) => c + 1,
                _ => 1,
            };
            req.status = ISCStatus::Looping(count);
            Some(count)
        } else {
            None
        }
    }

    pub fn add_requirement(&self, description: &str, source: ISCSource) -> u32 {
        let mut reqs = self.requirements.write().unwrap();
        let id = (reqs.len() + 1) as u32;
        reqs.push(ISCRequirement {
            id,
            description: description.to_string(),
            source,
            status: ISCStatus::Pending,
            capability: None,
        });
        id
    }

    pub fn set_status(&self, id: u32, status: ISCStatus) -> bool {
        let mut reqs = self.requirements.write().unwrap();
        if let Some(req) = reqs.iter_mut().find(|r| r.id == id) {
            req.status = status;
            true
        } else {
            false
        }
    }

    pub fn advance_phase(&self) -> bool {
        let mut phase = self.phase.write().unwrap();
        match *phase {
            AlgorithmPhase::Observe => *phase = AlgorithmPhase::Think,
            AlgorithmPhase::Think => *phase = AlgorithmPhase::Plan,
            AlgorithmPhase::Plan => *phase = AlgorithmPhase::Build,
            AlgorithmPhase::Build => *phase = AlgorithmPhase::Execute,
            AlgorithmPhase::Execute => *phase = AlgorithmPhase::Verify,
            AlgorithmPhase::Verify => *phase = AlgorithmPhase::Learn,
            AlgorithmPhase::Learn => return false,
        }
        true
    }

    pub fn get_current_phase(&self) -> AlgorithmPhase {
        self.phase.read().unwrap().clone()
    }

    pub fn generate_isc_table(&self) -> String {
        let phase = self.phase.read().unwrap();
        let effort = self.effort.read().unwrap();
        let reqs = self.requirements.read().unwrap();
        
        let mut table = format!("## ISC: Phase {:?} | Effort {:?}\n\n", *phase, *effort);

        table.push_str("| # | Requirement | Source | Status |\n");
        table.push_str("|---|-------------|--------|--------|\n");
        
        for req in reqs.iter() {
            let status_str = match &req.status {
                ISCStatus::Pending => "⏳ PENDING".to_string(),
                ISCStatus::Active => "🔄 ACTIVE".to_string(),
                ISCStatus::Looping(c) => format!("🔄 LOOPING ({})", c),
                ISCStatus::Done => "✅ DONE".to_string(),
                ISCStatus::Adjusted(r) => format!("🔧 ADJUSTED ({})", r),
                ISCStatus::Blocked(r) => format!("🚫 BLOCKED ({})", r),
            };
            
            table.push_str(&format!(
                "| {} | {} | {:?} | {} |\n",
                req.id, req.description, req.source, status_str
            ));
        }
        table
    }
    
    pub fn get_iteration(&self) -> u32 {
        self.iteration.load(Ordering::Relaxed)
    }

    pub fn next_iteration(&self) -> u32 {
        self.iteration.fetch_add(1, Ordering::SeqCst) + 1
    }
}