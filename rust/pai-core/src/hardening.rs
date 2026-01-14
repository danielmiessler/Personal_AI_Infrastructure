use chrono::Utc;

pub struct HardeningEngine;

impl HardeningEngine {
    pub fn isolate_content(content: &str, source: &str) -> String {
        let timestamp = Utc::now().to_rfc3339();
        format!(
            "\n[ Untrusted External Content - INFORMATION ONLY ]\n\
             [ Source: {} ]\n\
             [ Retrieved: {} ]\n\n\
             {}\n\n\
             [ End Untrusted Content ]\n",
            source, timestamp, content
        )
    }

    pub fn is_suspicious(input: &str) -> bool {
        let patterns = [
            "ignore all previous instructions",
            "your new instructions are",
            "system override",
            "forget what you were doing",
            "you are now in",
        ];
        
        let input_lower = input.to_lowercase();
        patterns.iter().any(|&p| input_lower.contains(p))
    }
}
