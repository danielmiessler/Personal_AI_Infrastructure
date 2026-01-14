pub struct PrivacyGuard {
    protected_patterns: Vec<regex::Regex>,
}

impl PrivacyGuard {
    pub fn new() -> Self {
        Self {
            protected_patterns: vec![
                regex::Regex::new(r"MISSION\.md").unwrap(),
                regex::Regex::new(r"BELIEFS\.md").unwrap(),
                regex::Regex::new(r"TELOS/.*").unwrap(),
                regex::Regex::new(r"\.env").unwrap(),
                regex::Regex::new(r"history/.*").unwrap(),
            ],
        }
    }

    pub fn is_leak(&self, path: &str) -> bool {
        self.protected_patterns.iter().any(|re| re.is_match(path))
    }
}