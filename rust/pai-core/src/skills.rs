use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use anyhow::Result;
use regex::Regex;

use crate::config::ConfigLoader;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub path: PathBuf,
    pub triggers: Vec<String>,
    pub customized: bool,
}

pub struct SkillRegistry {
    skills: HashMap<String, SkillMetadata>,
    custom_dir: Option<PathBuf>,
}

impl SkillRegistry {
    pub fn new() -> Self {
        Self { 
            skills: HashMap::new(),
            custom_dir: None,
        }
    }

    pub fn with_customization(mut self, custom_dir: PathBuf) -> Self {
        self.custom_dir = Some(custom_dir);
        self
    }

    pub fn scan_directory(&mut self, skills_dir: &Path) -> Result<usize> {
        if !skills_dir.exists() { return Ok(0); }

        let use_when_re = Regex::new(r"USE WHEN\s+([^.]+)")?;
        let mut count = 0;

        for entry in std::fs::read_dir(skills_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    let content = std::fs::read_to_string(&skill_md)?;
                    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("Unknown").to_string();
                    
                    let mut customized = false;
                    if let Some(ref c_dir) = self.custom_dir {
                        let custom_file = c_dir.join(&name).join("EXTEND.yaml");
                        if custom_file.exists() {
                            customized = true;
                        }
                    }

                    // Extract triggers
                    let mut triggers = Vec::new();
                    if let Some(caps) = use_when_re.captures(&content) {
                        let trigger_list = caps.get(1).map_or("", |m| m.as_str());
                        triggers = trigger_list.split(',')
                            .map(|s| s.trim().to_lowercase())
                            .filter(|s| !s.is_empty())
                            .collect();
                    }

                    self.skills.insert(name.to_lowercase(), SkillMetadata {
                        name,
                        description: "Parsed from SKILL.md".to_string(),
                        path: skill_md,
                        triggers,
                        customized,
                    });
                    count += 1;
                }
            }
        }
        Ok(count)
    }

    pub fn find_matching_skills(&self, query: &str) -> Vec<&SkillMetadata> {
        let query_lower = query.to_lowercase();
        self.skills.values()
            .filter(|s| {
                s.name.to_lowercase().contains(&query_lower) ||
                s.triggers.iter().any(|t| query_lower.contains(t))
            })
            .collect()
    }
}
