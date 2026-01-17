use async_trait::async_trait;
use crate::{PAIHook, HookEvent, HookAction};
use anyhow::Result;

pub struct LoggerHook;

#[async_trait]
impl PAIHook for LoggerHook {
    fn name(&self) -> &str {
        "LoggerHook"
    }

    async fn on_event(&self, event: &HookEvent) -> Result<HookAction> {
        tracing::info!("PAI Hook Event: {:?}", event.event_type);
        Ok(HookAction::Continue)
    }
}
