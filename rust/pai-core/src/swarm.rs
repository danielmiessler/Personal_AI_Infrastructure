use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub answer: String,
    pub quality_score: f32,
    pub risk_score: f32,
}

pub struct SwarmAggregator;

impl SwarmAggregator {
    pub fn select_pareto_winner(responses: &[AgentResponse]) -> Option<&AgentResponse> {
        // PAI Standard: Maximize Quality / Minimize Risk
        responses.iter().max_by(|a, b| {
            let score_a = a.quality_score * (1.0 - a.risk_score);
            let score_b = b.quality_score * (1.0 - b.risk_score);
            score_a.partial_cmp(&score_b).unwrap()
        })
    }

    pub fn steelman(responses: &[AgentResponse]) -> String {
        let mut aggregate = String::from("# Swarm Synthesis (Steelmanned)\n\n");
        for (i, res) in responses.iter().enumerate() {
            aggregate.push_str(&format!("### Perspective {}\n{}\n\n", i + 1, res.answer));
        }
        aggregate
    }
}
