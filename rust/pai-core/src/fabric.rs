use std::path::PathBuf;
use anyhow::{Result, anyhow};

pub struct FabricRegistry {
    patterns_dir: PathBuf,
}

impl FabricRegistry {
    pub fn new(root_dir: PathBuf) -> Self {
        Self {
            patterns_dir: root_dir.join("Tools").join("fabric").join("Patterns"),
        }
    }

    pub fn get_pattern(&self, name: &str) -> Result<String> {
        let pattern_path = self.patterns_dir.join(name).join("system.md");
        if !pattern_path.exists() {
            return Err(anyhow!("Fabric pattern '{}' not found at {:?}", name, pattern_path));
        }
        
        let content = std::fs::read_to_string(pattern_path)?;
        Ok(content)
    }

    pub fn list_patterns(&self) -> Result<Vec<String>> {
        if !self.patterns_dir.exists() { return Ok(vec![]); }
        
        let mut patterns = Vec::new();
        for entry in std::fs::read_dir(&self.patterns_dir)? {
            let entry = entry?;
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    patterns.push(name.to_string());
                }
            }
        }
        patterns.sort();
        Ok(patterns)
    }
}