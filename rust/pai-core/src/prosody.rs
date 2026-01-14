use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionalSettings {
    pub stability: f32,
    pub similarity_boost: f32,
}

pub struct ProsodyEngine {
    presets: HashMap<String, EmotionalSettings>,
}

impl ProsodyEngine {
    pub fn new() -> Self {
        let mut presets = HashMap::new();
        
        // PAI Standard Emotional Presets
        presets.insert("excited".to_string(), EmotionalSettings { stability: 0.7, similarity_boost: 0.9 });
        presets.insert("celebration".to_string(), EmotionalSettings { stability: 0.65, similarity_boost: 0.85 });
        presets.insert("insight".to_string(), EmotionalSettings { stability: 0.55, similarity_boost: 0.8 });
        presets.insert("success".to_string(), EmotionalSettings { stability: 0.6, similarity_boost: 0.8 });
        presets.insert("investigating".to_string(), EmotionalSettings { stability: 0.6, similarity_boost: 0.85 });
        presets.insert("debugging".to_string(), EmotionalSettings { stability: 0.55, similarity_boost: 0.8 });
        presets.insert("caution".to_string(), EmotionalSettings { stability: 0.4, similarity_boost: 0.6 });
        presets.insert("urgent".to_string(), EmotionalSettings { stability: 0.3, similarity_boost: 0.9 });

        Self { presets }
    }

    pub fn detect_and_clean(&self, message: &str) -> (String, Option<EmotionalSettings>) {
        // Pattern: [emoji emotion-name]
        // Examples: [✨ success], [🔍 investigating]
        let re = regex::Regex::new(r"\[(?:\p{Emoji})\s+(\w+)\]").unwrap();
        
        if let Some(caps) = re.captures(message) {
            let emotion_name = &caps[1];
            if let Some(settings) = self.presets.get(emotion_name) {
                let cleaned = re.replace(message, "").to_string();
                return (cleaned.trim().to_string(), Some(settings.clone()));
            }
        }

        (message.to_string(), None)
    }
}
