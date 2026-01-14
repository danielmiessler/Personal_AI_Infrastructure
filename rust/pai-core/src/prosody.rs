use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use regex::Regex;
use crate::privacy::PrivacyGuard;

#[derive(Error, Debug)]
pub enum ProsodyError {
    #[error("Failed to compile regex pattern: {0}")]
    RegexError(#[from] regex::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionalSettings {
    pub stability: f32,
    pub similarity_boost: f32,
}

pub struct ProsodyEngine {
    presets: HashMap<String, EmotionalSettings>,
    marker_regex: Regex,
    privacy: PrivacyGuard,
    // Pre-compiled cleaning regexes
    code_block_re: Regex,
    link_re: Regex,
    emoji_re: Regex,
}

impl ProsodyEngine {
    pub fn new() -> Result<Self, ProsodyError> {
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

        // Pattern: [emoji emotion-name]
        let marker_regex = Regex::new(r"\[(.+?)\s+(\w+)\]")?;
        let privacy = PrivacyGuard::new();

        Ok(Self { 
            presets, 
            marker_regex,
            privacy,
            code_block_re: Regex::new(r"```[\s\S]*?```")?,
            link_re: Regex::new(r"\[([^\]]+)\]\([^\s\)]+\)")?,
            emoji_re: Regex::new(r"[\x{1F300}-\x{1F9FF}]")?,
        })
    }

    pub fn detect_and_clean(&self, message: &str) -> (String, Option<EmotionalSettings>) {
        let mut best_settings = None;
        let mut max_priority = -1;
        let mut tags_to_remove = Vec::new();

        // Intensity Scale for Priority
        let priorities: HashMap<&str, i32> = [
            ("urgent", 10), ("caution", 9), ("debugging", 8), ("success", 7),
            ("excited", 6), ("celebration", 5), ("insight", 4), ("learning", 3)
        ].iter().cloned().collect();

        for caps in self.marker_regex.captures_iter(message) {
            let full_tag = &caps[0];
            let emotion_name = &caps[2];
            if let Some(s) = self.presets.get(emotion_name) {
                let priority = *priorities.get(emotion_name).unwrap_or(&0);
                if priority > max_priority {
                    max_priority = priority;
                    best_settings = Some(s.clone());
                }
                tags_to_remove.push(full_tag.to_string());
            }
        }

        let mut cleaned = message.to_string();
        // Clean ONLY valid markers found in presets
        for tag in tags_to_remove {
            cleaned = cleaned.replace(&tag, "");
        }
        
        let speech_ready = self.clean_for_speech(&cleaned);
        // Apply Privacy Redaction
        let redacted = self.privacy.redact(&speech_ready);

        (redacted, best_settings)
    }

    fn clean_for_speech(&self, input: &str) -> String {
        // PAI Standard Speech Cleaning Pipeline
        let mut s = input.to_string();
        
        // 1. Strip code blocks
        s = self.code_block_re.replace_all(&s, "[code omitted]").to_string();

        // 2. Strip inline backticks
        s = s.replace('`', "");

        // 3. Normalize markdown links: [text](url) -> text
        s = self.link_re.replace_all(&s, "$1").to_string();

        // 4. Strip bold/italic markers
        s = s.replace("**", "").replace("__", "").replace('*', "");
        s = s.replace('_', " ");

        // 5. Remove system markers, brackets, and extra whitespace
        s = s.replace("🗣️", "").replace("📋", "").replace("🔍", "");
        s = s.replace('[', "").replace(']', "");
        
        // Remove common emojis
        s = self.emoji_re.replace_all(&s, "").to_string();
        
        s.split_whitespace().collect::<Vec<_>>().join(" ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_emotion_priority_high_wins() {
        let engine = ProsodyEngine::new().unwrap();
        // urgent (10) > learning (3)
        let (_, settings) = engine.detect_and_clean("[📚 learning] [🚨 urgent] message");
        assert_eq!(settings.unwrap().stability, 0.3);
    }

    #[test]
    fn test_emotion_priority_order_independent() {
        let engine = ProsodyEngine::new().unwrap();
        // urgent (10) > success (7)
        let (_, settings_a) = engine.detect_and_clean("[🚨 urgent] [✨ success] message");
        let (_, settings_b) = engine.detect_and_clean("[✨ success] [🚨 urgent] message");
        assert_eq!(settings_a.unwrap().stability, 0.3);
        assert_eq!(settings_b.unwrap().stability, 0.3);
    }

    #[test]
    fn test_cleaning_nested_markdown() {
        let engine = ProsodyEngine::new().unwrap();
        let input = "Check ***[Bold Link](url)*** and `code`";
        let cleaned = engine.clean_for_speech(input);
        assert_eq!(cleaned, "Check Bold Link and code");
    }

    #[test]
    fn test_cleaning_multiple_code_blocks() {
        let engine = ProsodyEngine::new().unwrap();
        let input = "Start ```a``` middle ```b``` end";
        let cleaned = engine.clean_for_speech(input);
        assert_eq!(cleaned, "Start code omitted middle code omitted end");
    }

    #[test]
    fn test_unknown_emotion_ignored() {
        let engine = ProsodyEngine::new().unwrap();
        let (cleaned, settings) = engine.detect_and_clean("[👽 alien] hello");
        assert!(settings.is_none());
        assert!(cleaned.contains("alien hello"), "Cleaned output was: '{}'", cleaned); 
    }
}