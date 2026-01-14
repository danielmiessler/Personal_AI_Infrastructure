use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

pub struct TaskAlgorithm {
    pub phase: AlgorithmPhase,
    pub effort: EffortLevel,
    pub requirements: Vec<ISCRequirement>,
}

impl TaskAlgorithm {
    pub fn new(effort: EffortLevel) -> Self {
        Self {
            phase: AlgorithmPhase::Observe,
            effort,
            requirements: Vec::new(),
        }
    }

    pub fn advance(&mut self) -> bool {
        match self.phase {
            AlgorithmPhase::Observe => self.phase = AlgorithmPhase::Think,
            AlgorithmPhase::Think => self.phase = AlgorithmPhase::Plan,
            AlgorithmPhase::Plan => self.phase = AlgorithmPhase::Build,
            AlgorithmPhase::Build => self.phase = AlgorithmPhase::Execute,
            AlgorithmPhase::Execute => self.phase = AlgorithmPhase::Verify,
            AlgorithmPhase::Verify => self.phase = AlgorithmPhase::Learn,
            AlgorithmPhase::Learn => return false, // Finished
        }
        true
    }
}
