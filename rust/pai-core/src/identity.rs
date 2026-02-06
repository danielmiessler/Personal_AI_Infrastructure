use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PAIIdentity {
    pub name: String,
    pub display_name: String,
    pub role: String,
    pub color: String,
    pub voice_id: Option<String>,
}

impl Default for PAIIdentity {
    fn default() -> Self {
        Self {
            name: "PAI".to_string(),
            display_name: "PAI".to_string(),
            role: "AI Assistant".to_string(),
            color: "#3B82F6".to_string(),
            voice_id: None,
        }
    }
}

pub struct ResponseFormatter {
    identity: PAIIdentity,
}

impl ResponseFormatter {
    pub fn new(identity: PAIIdentity) -> Self {
        Self { identity }
    }

    pub fn format_response(&self, summary: &str, analysis: &str, actions: &[&str], results: &str, voice_msg: &str) -> String {
        let mut output = format!("📋 SUMMARY: {}\n", summary);
        output.push_str(&format!("🔍 ANALYSIS: {}\n", analysis));
        output.push_str("⚡ ACTIONS:\n");
        for action in actions {
            output.push_str(&format!("  - {}\n", action));
        }
        output.push_str(&format!("✅ RESULTS: {}\n", results));
        output.push_str(&format!("🗣️ {}: {}\n", self.identity.name, voice_msg));
        output
    }
}
