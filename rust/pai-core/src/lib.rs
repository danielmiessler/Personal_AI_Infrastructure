use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use anyhow::Result;

pub mod hooks;
pub mod safety;
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
pub mod orchestration;
pub mod oracle;

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

pub struct HookManager {
    hooks: Vec<Arc<dyn PAIHook>>,
}

impl HookManager {
    pub fn new() -> Self {
        Self { hooks: Vec::new() }
    }

    pub fn register(&mut self, hook: Arc<dyn PAIHook>) {
        self.hooks.push(hook);
    }

    pub async fn trigger(&self, event: &HookEvent) -> Result<HookAction> {
        for hook in &self.hooks {
            let action = hook.on_event(event).await?;
            match action {
                HookAction::Continue => continue,
                HookAction::Block(reason) => return Ok(HookAction::Block(reason)),
                HookAction::Modify(val) => return Ok(HookAction::Modify(val)),
            }
        }
        Ok(HookAction::Continue)
    }
}