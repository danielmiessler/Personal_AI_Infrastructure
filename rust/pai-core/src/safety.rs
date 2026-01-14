use async_trait::async_trait;
use regex::Regex;
use crate::{PAIHook, HookEvent, HookEventType, HookAction};
use anyhow::Result;

pub struct SecurityValidator {
    blocked_patterns: Vec<(Regex, String)>,
}

impl SecurityValidator {
    pub fn new() -> Self {
        let patterns = vec![
            // Tier 1: Catastrophic
            (r"rm\s+(-rf?|--recursive)\s+[\/~]", "🚨 BLOCKED: Catastrophic deletion/destruction detected"),
            (r"rm\s+(-rf?|--recursive)\s+\*", "🚨 BLOCKED: Catastrophic deletion/destruction detected"),
            (r">\s*/dev/sd[a-z]", "🚨 BLOCKED: Disk overwrite attempt"),
            (r"mkfs\.", "🚨 BLOCKED: Filesystem format attempt"),
            
            // Tier 2: Reverse Shells
            (r"bash\s+-i\s+>&\s*/dev/tcp", "🚨 BLOCKED: Reverse shell pattern detected"),
            (r"nc\s+(-e|--exec)\s+/bin/(ba)?sh", "🚨 BLOCKED: Netcat shell attempt"),
            
            // Tier 3: Data Exfiltration
            (r"curl.*(@|--upload-file)", "🚨 BLOCKED: Data exfiltration pattern detected"),
            (r"wget.*(--post-file|--post-data)", "🚨 BLOCKED: Data exfiltration pattern detected"),
            
            // Tier 4: PAI Infrastructure Protection
            (r"rm.*\.config/pai", "🚨 BLOCKED: PAI infrastructure protection triggered"),
            (r"git\s+push.*PAI.*public", "🚨 BLOCKED: Attempt to push private PAI to public repository"),

            // Tier 5: Shell Injection & Evasion
            (r"[;&|`$]", "🚨 BLOCKED: Shell operator detected"),
            (r"\b(python|perl|ruby|php|node)\b", "🚨 BLOCKED: Script interpreter execution detected"),
        ];

        let blocked_patterns = patterns.into_iter()
            .map(|(p, r)| (Regex::new(p).unwrap(), r.to_string()))
            .collect();

        Self { blocked_patterns }
    }
}

#[async_trait]
impl PAIHook for SecurityValidator {
    fn name(&self) -> &str {
        "SecurityValidator"
    }

    async fn on_event(&self, event: &HookEvent) -> Result<HookAction> {
        if let HookEventType::PreToolUse = event.event_type {
            if event.payload["tool_name"] == "Bash" {
                if let Some(command) = event.payload["tool_input"]["command"].as_str() {
                    for (regex, reason) in &self.blocked_patterns {
                        if regex.is_match(command) {
                            return Ok(HookAction::Block(reason.clone()));
                        }
                    }
                }
            }
        }
        Ok(HookAction::Continue)
    }
}
