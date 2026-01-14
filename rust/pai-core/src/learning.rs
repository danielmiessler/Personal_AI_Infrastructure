use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs::{OpenOptions, write};
use std::io::Write;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signal {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub session_id: String,
    pub signal_type: SignalType,
    pub phase: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignalType {
    Failure,
    Loopback,
    Rating(u8),
    Anomaly,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PerformanceStats {
    pub total_tasks: u32,
    pub successful_tasks: u32,
    pub total_loopbacks: u32,
    pub algorithm_compliance_streak: u32,
}

pub struct LearningEngine {
    root_dir: PathBuf,
}

impl LearningEngine {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }

    pub fn capture_signal(&self, signal: Signal) -> Result<()> {
        let signal_dir = self.root_dir.join("History").join("Signals");
        std::fs::create_dir_all(&signal_dir)?;

        let filename = match signal.signal_type {
            SignalType::Failure => "failures.jsonl",
            SignalType::Loopback => "loopbacks.jsonl",
            SignalType::Rating(_) => "ratings.jsonl",
            SignalType::Anomaly => "anomalies.jsonl",
        };

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(signal_dir.join(filename))?;

        let json = serde_json::to_string(&signal)?;
        writeln!(file, "{}", json)?;

        // Update stats
        self.update_stats(&signal)?;

        Ok(())
    }

    fn update_stats(&self, signal: &Signal) -> Result<()> {
        let stats_path = self.root_dir.join("State").join("algorithm-stats.json");
        std::fs::create_dir_all(stats_path.parent().unwrap())?;

        let mut stats: PerformanceStats = if stats_path.exists() {
            let content = std::fs::read_to_string(&stats_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            PerformanceStats::default()
        };

        match signal.signal_type {
            SignalType::Failure => {
                stats.total_tasks += 1;
                stats.algorithm_compliance_streak = 0;
            }
            SignalType::Loopback => {
                stats.total_loopbacks += 1;
            }
            SignalType::Rating(r) if r >= 7 => {
                stats.total_tasks += 1;
                stats.successful_tasks += 1;
                stats.algorithm_compliance_streak += 1;
            }
            _ => {}
        }

        write(stats_path, serde_json::to_string_pretty(&stats)?)?;
        Ok(())
    }

    pub fn load_lessons(&self, query: &str) -> Result<String> {
        let mut lessons = String::from("# LESSONS LEARNED (Reinforcement Context)\n\n");
        let signal_dir = self.root_dir.join("History").join("Signals");
        
        let files = ["failures.jsonl", "loopbacks.jsonl"];
        let query_lower = query.to_lowercase();
        let mut count = 0;

        for filename in files {
            let path = signal_dir.join(filename);
            if path.exists() {
                let content = std::fs::read_to_string(&path)?;
                for line in content.lines().rev().take(50) { // Look at last 50 signals
                    if let Ok(signal) = serde_json::from_str::<Signal>(line) {
                        // Semantic check: does this signal relate to our current query?
                        if signal.reason.to_lowercase().contains(&query_lower) || 
                           query_lower.contains(&signal.phase.to_lowercase()) {
                            lessons.push_str(&format!("- **Phase:** {}\n", signal.phase));
                            lessons.push_str(&format!("  **Issue:** {}\n", signal.reason));
                            count += 1;
                        }
                    }
                    if count >= 5 { break; } // Max 5 relevant lessons
                }
            }
        }

        if count == 0 {
            Ok(String::from("No relevant previous failures detected for this task."))
        } else {
            Ok(lessons)
        }
    }
}
