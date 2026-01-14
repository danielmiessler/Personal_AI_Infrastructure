use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use anyhow::Result;

pub mod algorithm;
pub mod memory;
pub mod identity;
pub mod agents;
pub mod prompting;
pub mod prosody;
pub mod recovery;
pub mod telos;
pub mod skills;
pub mod fabric;
pub mod classifier;
pub mod config;
pub mod enrichment;
pub mod hardening;
pub mod compliance;
pub mod swarm;
pub mod privacy;
pub mod orchestration;
pub mod oracle;
pub mod learning;
pub mod visuals;
pub mod manifest;
pub mod upgrades;
pub mod observability;
pub mod safety;
pub mod hooks;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HookEventType {
    SessionStart,
    SessionEnd,
    PreToolUse,
    PostToolUse,
    UserPromptSubmit,
    Stop,
    SubagentStop,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookEvent {
    pub event_type: HookEventType,
    pub session_id: String,
    pub payload: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[async_trait]
pub trait PAIHook: Send + Sync {
    fn name(&self) -> &str;
    async fn on_event(&self, event: &HookEvent) -> Result<HookAction>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HookAction {
    Continue,
    Block(String),
    Modify(serde_json::Value),
}

#[derive(Default)]
pub struct HookManager {
    hooks: Vec<Arc<dyn PAIHook>>,
}

impl HookManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn register(&mut self, hook: Arc<dyn PAIHook>) {
        self.hooks.push(hook);
    }

    pub async fn trigger(&self, event: &HookEvent) -> Result<HookAction> {
        let mut current_payload = event.payload.clone();
        let mut modified = false;

        for hook in &self.hooks {
            // Efficiency: Only construct a new event if we have a modified payload to inject
            let action = if modified {
                let mut e = event.clone();
                e.payload = current_payload.clone();
                hook.on_event(&e).await?
            } else {
                hook.on_event(event).await?
            };

            match action {
                HookAction::Continue => continue,
                HookAction::Block(reason) => return Ok(HookAction::Block(reason)),
                HookAction::Modify(val) => {
                    current_payload = val;
                    modified = true;
                }
            }
        }

        if modified {
            Ok(HookAction::Modify(current_payload))
        } else {
            Ok(HookAction::Continue)
        }
    }
}

#[cfg(test)]
mod hook_tests {
    use super::*;

    struct CounterHook;
    #[async_trait]
    impl PAIHook for CounterHook {
        fn name(&self) -> &str { "Counter" }
        async fn on_event(&self, e: &HookEvent) -> Result<HookAction> {
            let mut p = e.payload.clone();
            p["count"] = serde_json::json!(p["count"].as_u64().unwrap_or(0) + 1);
            Ok(HookAction::Modify(p))
        }
    }

    #[tokio::test]
    async fn test_hook_manager_large_chain() {
        let mut hm = HookManager::new();
        for _ in 0..100 {
            hm.register(Arc::new(CounterHook));
        }

        let event = HookEvent {
            event_type: HookEventType::SessionStart,
            session_id: "test".to_string(),
            payload: serde_json::json!({"count": 0}),
            timestamp: chrono::Utc::now(),
        };

        let action = hm.trigger(&event).await.unwrap();
        if let HookAction::Modify(p) = action {
            assert_eq!(p["count"], 100);
        } else {
            panic!("Expected Modify action");
        }
    }

    #[tokio::test]
    async fn test_hook_manager_deep_nesting() {
        let mut hm = HookManager::new();
        // Hook that just returns the payload
        struct IdentityHook;
        #[async_trait]
        impl PAIHook for IdentityHook {
            fn name(&self) -> &str { "Identity" }
            async fn on_event(&self, e: &HookEvent) -> Result<HookAction> {
                Ok(HookAction::Modify(e.payload.clone()))
            }
        }
        hm.register(Arc::new(IdentityHook));

        // Create a deeply nested JSON object
        let mut deep = serde_json::json!({"level": 0});
        for i in 1..100 {
            deep = serde_json::json!({"level": i, "next": deep});
        }

        let event = HookEvent {
            event_type: HookEventType::SessionStart,
            session_id: "test".to_string(),
            payload: deep.clone(),
            timestamp: chrono::Utc::now(),
        };

        let action = hm.trigger(&event).await.unwrap();
        if let HookAction::Modify(p) = action {
            assert_eq!(p, deep);
        } else {
            panic!("Expected Modify action");
        }
    }
}
