use crate::algorithm::EffortLevel;
use regex::Regex;
use std::sync::OnceLock;

pub struct EffortClassifier;

impl EffortClassifier {
    pub fn new() -> Self {
        Self
    }

    pub fn classify(&self, query: &str) -> EffortLevel {
        static QUICK_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();
        static THOROUGH_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();
        static DETERMINED_PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();

        let quick = QUICK_PATTERNS.get_or_init(|| vec![
            Regex::new(r"quick").unwrap(),
            Regex::new(r"simple").unwrap(),
            Regex::new(r"typo").unwrap(),
            Regex::new(r"just").unwrap(),
        ]);

        let thorough = THOROUGH_PATTERNS.get_or_init(|| vec![
            Regex::new(r"thorough").unwrap(),
            Regex::new(r"comprehensive").unwrap(),
            Regex::new(r"refactor").unwrap(),
            Regex::new(r"architect").unwrap(),
        ]);

        let determined = DETERMINED_PATTERNS.get_or_init(|| vec![
            Regex::new(r"until done").unwrap(),
            Regex::new(r"don't stop").unwrap(),
            Regex::new(r"whatever it takes").unwrap(),
        ]);

        let q = query.to_lowercase();
        
        if determined.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Determined;
        }
        
        if thorough.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Thorough;
        }
        
        if quick.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Quick;
        }

        EffortLevel::Standard
    }
}
