pub struct PrivacyGuard {
    protected_paths: Vec<regex::Regex>,
    redaction_patterns: Vec<(regex::Regex, String)>,
}

impl PrivacyGuard {
    pub fn new() -> Self {
        let protected_paths = vec![
            regex::Regex::new("MISSION\\.md").unwrap(),
            regex::Regex::new("BELIEFS\\.md").unwrap(),
            regex::Regex::new("TELOS/.*").unwrap(),
            regex::Regex::new("\\.env").unwrap(),
            regex::Regex::new("history/.*").unwrap(),
        ];

        let redaction_patterns = vec![
            // API Keys: Generic pattern for common keys
            (regex::Regex::new("(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"].+?['\"]").unwrap(), "[REDACTED CREDENTIAL]".to_string()),
            // Bearer Tokens
            (regex::Regex::new("Bearer\\s+[a-zA-Z0-9\\-\\._~+/]+=*").unwrap(), "Bearer [REDACTED]".to_string()),
            // IPv4 Addresses (Potential internal probing)
            (regex::Regex::new(r"(10|127|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))(\.\d{1,3}){1,3}").unwrap(), "[INTERNAL IP]".to_string()),
        ];

        Self {
            protected_paths,
            redaction_patterns,
        }
    }

    pub fn is_leak(&self, path: &str) -> bool {
        self.protected_paths.iter().any(|re| re.is_match(path))
    }

    pub fn redact(&self, content: &str) -> String {
        let mut redacted = content.to_string();
        for (re, replacement) in &self.redaction_patterns {
            redacted = re.replace_all(&redacted, replacement).to_string();
        }
        redacted
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_redaction() {
        let guard = PrivacyGuard::new();
        let input = "My API_KEY = 'sk-12345' and Bearer abcd.1234.efgh. Also check 192.168.1.100";
        let output = guard.redact(input);
        
        assert!(output.contains("[REDACTED CREDENTIAL]"), "Output was: {}", output);
        assert!(output.contains("Bearer [REDACTED]"), "Output was: {}", output);
        assert!(output.contains("[INTERNAL IP]"), "Output was: {}", output);
        assert!(!output.contains("sk-12345"), "Output was: {}", output);
    }
}