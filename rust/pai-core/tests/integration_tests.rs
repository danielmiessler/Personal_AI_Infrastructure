use pai_core::{HookManager, HookEvent, HookEventType, HookAction};
use pai_core::safety::SecurityValidator;
use pai_core::algorithm::{AlgorithmEngine, EffortLevel, ISCSource, ISCStatus};
use pai_core::prosody::ProsodyEngine;
use pai_core::privacy::PrivacyGuard;
use pai_core::learning::{LearningEngine, Signal, SignalType};
use std::sync::Arc;
use tempfile::tempdir;
use std::fs;

#[tokio::test]
async fn test_security_validator() {
    let validator = Arc::new(SecurityValidator::new());
    let mut hm = HookManager::new();
    hm.register(validator);

    // Test safe command
    let safe_event = HookEvent {
        event_type: HookEventType::PreToolUse,
        session_id: "test".to_string(),
        payload: serde_json::json!({
            "tool_name": "Bash",
            "tool_input": { "command": "ls -la" }
        }),
        timestamp: chrono::Utc::now(),
    };
    assert!(matches!(hm.trigger(&safe_event).await.unwrap(), HookAction::Continue));

    // Test dangerous command
    let danger_event = HookEvent {
        event_type: HookEventType::PreToolUse,
        session_id: "test".to_string(),
        payload: serde_json::json!({
            "tool_name": "Bash",
            "tool_input": { "command": "rm -rf /" }
        }),
        timestamp: chrono::Utc::now(),
    };
    assert!(matches!(hm.trigger(&danger_event).await.unwrap(), HookAction::Block(_)));
}

#[test]
fn test_algorithm_engine() {
    let engine = AlgorithmEngine::new(EffortLevel::Standard);
    let id = engine.add_requirement("Test requirement", ISCSource::Explicit);
    
    assert_eq!(id, 1);
    assert!(engine.set_status(1, ISCStatus::Active));
    
    let table = engine.generate_isc_table();
    assert!(table.contains("ACTIVE"));
    assert!(table.contains("Test requirement"));
    
    assert!(engine.advance_phase());
    assert_ne!(engine.get_current_phase(), pai_core::algorithm::AlgorithmPhase::Observe);
}

#[test]
fn test_prosody_engine() {
    let engine = ProsodyEngine::new();
    let input = "[✨ success] Task completed successfully! Check the `code` here: [Link](http://example.com)";
    let (cleaned, settings) = engine.detect_and_clean(input);
    
    assert!(settings.is_some());
    assert_eq!(settings.unwrap().stability, 0.6);
    assert!(!cleaned.contains("[✨ success]"));
    assert!(!cleaned.contains("`"));
    assert!(!cleaned.contains("[Link]"));
    assert!(cleaned.contains("Task completed successfully!"));
}

#[test]
fn test_privacy_guard() {
    let guard = PrivacyGuard::new();
    assert!(guard.is_leak("path/to/MISSION.md"));
    assert!(guard.is_leak(".env"));
    assert!(!guard.is_leak("src/main.rs"));
}

#[test]
fn test_learning_engine() {
    let tmp = tempdir().unwrap();
    let engine = LearningEngine::new(tmp.path().to_path_buf());
    
    let signal = Signal {
        timestamp: chrono::Utc::now(),
        session_id: "test".to_string(),
        signal_type: SignalType::Rating(10),
        phase: "Learn".to_string(),
        reason: "Excellent work".to_string(),
    };
    
    assert!(engine.capture_signal(signal).is_ok());
    
    let stats_path = tmp.path().join("State").join("algorithm-stats.json");
    assert!(stats_path.exists());
}
