use std::path::{Path, PathBuf};
use regex::Regex;

pub struct PrivacyGuard {
    protected_patterns: Vec<Regex>,
}

impl PrivacyGuard {
    pub fn new() -> Self {
        Self {
            protected_patterns: vec![
                Regex::new(r"MISSION\.md").unwrap(),
                Regex::new(r"BELIEFS\.md").unwrap(),
                Regex::new(r"TELOS/.*").unwrap(),
                Regex::new(r"\.env").unwrap(),
                Regex::new(r"history/.*").unwrap(),
            ],
        }
    }

    pub fn is_leak(&self, path: &str) -> bool {
        self.protected_patterns.iter().any(|re| re.is_match(path))
    }
}
