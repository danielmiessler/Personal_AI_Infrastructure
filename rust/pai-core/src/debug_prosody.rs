use pai_core::prosody::ProsodyEngine;

fn main() {
    let engine = ProsodyEngine::new();
    let (cleaned, _) = engine.detect_and_clean("[👽 alien] hello");
    println!("DEBUG: '{}'", cleaned);
}
