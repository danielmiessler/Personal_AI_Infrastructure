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
        
        // PAI Standard Emotional Presets (13 Total)
        // High Energy / Positive
        presets.insert("excited".to_string(), EmotionalSettings { stability: 0.7, similarity_boost: 0.9 });
        presets.insert("celebration".to_string(), EmotionalSettings { stability: 0.65, similarity_boost: 0.85 });
        presets.insert("insight".to_string(), EmotionalSettings { stability: 0.55, similarity_boost: 0.8 });
        presets.insert("creative".to_string(), EmotionalSettings { stability: 0.5, similarity_boost: 0.75 });

        // Success / Achievement
        presets.insert("success".to_string(), EmotionalSettings { stability: 0.6, similarity_boost: 0.8 });
        presets.insert("progress".to_string(), EmotionalSettings { stability: 0.55, similarity_boost: 0.75 });

        // Analysis / Investigation
        presets.insert("investigating".to_string(), EmotionalSettings { stability: 0.6, similarity_boost: 0.85 });
        presets.insert("debugging".to_string(), EmotionalSettings { stability: 0.55, similarity_boost: 0.8 });
        presets.insert("learning".to_string(), EmotionalSettings { stability: 0.5, similarity_boost: 0.75 });

        // Thoughtful / Careful
        presets.insert("pondering".to_string(), EmotionalSettings { stability: 0.65, similarity_boost: 0.8 });
        presets.insert("focused".to_string(), EmotionalSettings { stability: 0.7, similarity_boost: 0.85 });
        presets.insert("caution".to_string(), EmotionalSettings { stability: 0.4, similarity_boost: 0.6 });

        // Urgent / Critical
        presets.insert("urgent".to_string(), EmotionalSettings { stability: 0.3, similarity_boost: 0.9 });

        Self { presets }
    }

    pub fn detect_and_clean(&self, message: &str) -> (String, Option<EmotionalSettings>) {
        // ... (Emotion detection remains same)
        let re = regex::Regex::new(r"\[(?:\p{Emoji})\s+(\w+)\]").unwrap();
        
        let mut cleaned = message.to_string();
        let mut settings = None;

        if let Some(caps) = re.captures(message) {
            let emotion_name = &caps[1];
            if let Some(s) = self.presets.get(emotion_name) {
                cleaned = re.replace(message, "").to_string();
                settings = Some(s.clone());
            }
        }

        (self.clean_for_speech(&cleaned), settings)
    }

    fn clean_for_speech(&self, input: &str) -> String {
        // PAI Standard Speech Cleaning Pipeline
        let mut s = input.to_string();
        
        // 1. Strip code blocks
        let code_re = regex::Regex::new(r"```[\s\S]*?```").unwrap();
        s = code_re.replace_all(&s, "[code omitted]").to_string();

        // 2. Strip inline backticks
        s = s.replace('`', "");

        // 3. Normalize markdown links: [text](url) -> text
        let link_re = regex::Regex::new(r"\[([^\]]+)\]\([^\)]+\)").unwrap();
        s = link_re.replace_all(&s, "$1").to_string();

        // 4. Strip bold/italic markers
        s = s.replace("**", "").replace("__", "").replace('*', "").replace('_', "");

        // 5. Remove system markers and extra whitespace
        s = s.replace("🗣️", "").replace("📋", "").replace("🔍", "");
        
        s.split_whitespace().collect::<Vec<_>>().join(" ")
    }
}
