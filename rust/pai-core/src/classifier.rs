use crate::algorithm::EffortLevel;
use regex::Regex;

pub struct EffortClassifier {
    quick_patterns: Vec<Regex>,
    thorough_patterns: Vec<Regex>,
    determined_patterns: Vec<Regex>,
}

impl EffortClassifier {
    pub fn new() -> Self {
        Self {
            quick_patterns: vec![
                Regex::new(r"quick").unwrap(),
                Regex::new(r"simple").unwrap(),
                Regex::new(r"typo").unwrap(),
                Regex::new(r"just").unwrap(),
            ],
            thorough_patterns: vec![
                Regex::new(r"thorough").unwrap(),
                Regex::new(r"comprehensive").unwrap(),
                Regex::new(r"refactor").unwrap(),
                Regex::new(r"architect").unwrap(),
            ],
            determined_patterns: vec![
                Regex::new(r"until done").unwrap(),
                Regex::new(r"don't stop").unwrap(),
                Regex::new(r"whatever it takes").unwrap(),
            ],
        }
    }

    pub fn classify(&self, query: &str) -> EffortLevel {
        let q = query.to_lowercase();
        
        if self.determined_patterns.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Determined;
        }
        
        if self.thorough_patterns.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Thorough;
        }
        
        if self.quick_patterns.iter().any(|re| re.is_match(&q)) {
            return EffortLevel::Quick;
        }

        EffortLevel::Standard
    }
}
