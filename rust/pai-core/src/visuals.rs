use crate::algorithm::{AlgorithmPhase, EffortLevel, ISCStatus, AlgorithmEngine};
use serde::{Deserialize, Serialize};

pub struct VisualRenderer;

impl VisualRenderer {
    pub fn get_phase_color(phase: &AlgorithmPhase) -> (u8, u8, u8) {
        match phase {
            AlgorithmPhase::Observe => (102, 255, 255),    // Cyan
            AlgorithmPhase::Think => (204, 153, 255),      // Purple
            AlgorithmPhase::Plan => (153, 204, 255),       // Blue
            AlgorithmPhase::Build => (255, 204, 0),        // Yellow
            AlgorithmPhase::Execute => (255, 153, 0),      // Orange
            AlgorithmPhase::Verify => (153, 255, 153),     // Green
            AlgorithmPhase::Learn => (255, 153, 204),      // Pink
        }
    }

    pub fn get_effort_emoji(effort: EffortLevel) -> &'static str {
        match effort {
            EffortLevel::Trivial => "💭",
            EffortLevel::Quick => "⚡",
            EffortLevel::Standard => "📊",
            EffortLevel::Thorough => "🔬",
            EffortLevel::Determined => "🎯",
        }
    }

    pub fn render_progress_bar(current_phase: &AlgorithmPhase) -> String {
        let phases = [
            AlgorithmPhase::Observe,
            AlgorithmPhase::Think,
            AlgorithmPhase::Plan,
            AlgorithmPhase::Build,
            AlgorithmPhase::Execute,
            AlgorithmPhase::Verify,
            AlgorithmPhase::Learn,
        ];

        let mut bar = String::from("[ ");
        for phase in &phases {
            if phase == current_phase {
                bar.push_str("▶ ");
            } else if phases.iter().position(|p| p == phase) < phases.iter().position(|p| p == current_phase) {
                bar.push_str("✓ ");
            } else {
                bar.push_str("· ");
            }
        }
        bar.push_str("]");
        bar
    }
}
