use std::path::PathBuf;
use anyhow::Result;

pub struct SkillRegistry {
    skills: std::collections::HashMap<String, SkillMetadata>,
    custom_dir: Option<PathBuf>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: String,
    pub path: PathBuf,
    pub triggers: Vec<String>,
    pub customized: bool,
    pub implements_science: bool,
    pub science_cycle_time: Option<String>,
}

impl SkillRegistry {
    pub fn new() -> Self {
        Self { 
            skills: std::collections::HashMap::new(),
            custom_dir: None,
        }
    }

    pub fn with_customization(mut self, custom_dir: PathBuf) -> Self {
        self.custom_dir = Some(custom_dir);
        self
    }

    pub fn scan_directory(&mut self, skills_dir: &std::path::Path) -> Result<usize> {
        if !skills_dir.exists() { return Ok(0); }

        let use_when_re = regex::Regex::new(r"USE WHEN\s+([^.]+)")?;
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

                    let implements_science = content.contains("implements: Science");
                    let science_cycle_time = if implements_science {
                        let re = regex::Regex::new(r"science_cycle_time:\s*(\w+)")?;
                        re.captures(&content).map(|c| c[1].to_string())
                    } else {
                        None
                    };

                    let version = regex::Regex::new(r"version:\s*([^\n]+)")?
                        .captures(&content).map_or("1.0.0".to_string(), |c| c[1].trim().to_string());
                    let author = regex::Regex::new(r"author:\s*([^\n]+)")?
                        .captures(&content).map_or("Unknown".to_string(), |c| c[1].trim().to_string());

                    self.skills.insert(name.to_lowercase(), SkillMetadata {
                        name,
                        description: "Parsed from SKILL.md".to_string(),
                        version,
                        author,
                        path: skill_md,
                        triggers,
                        customized,
                        implements_science,
                        science_cycle_time,
                    });
                    count += 1;
                }
            }
        }
        Ok(count)
    }

    pub fn find_matching_skills(&self, query: &str) -> Vec<(&SkillMetadata, u32)> {
        let query_lower = query.to_lowercase();
        let mut results = Vec::new();

        for skill in self.skills.values() {
            let mut score = 0;
            if skill.name.to_lowercase().contains(&query_lower) {
                score += 10;
            }
            for trigger in &skill.triggers {
                if query_lower.contains(trigger) {
                    score += 5;
                }
            }

            if score > 0 {
                results.push((skill, score));
            }
        }

        results.sort_by(|a, b| b.1.cmp(&a.1));
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::fs;

    #[test]
    fn test_scan_non_existent_dir() {
        let mut registry = SkillRegistry::new();
        let res = registry.scan_directory(std::path::Path::new("/tmp/ghost-dir-123"));
        assert_eq!(res.unwrap(), 0);
    }

    #[test]
    fn test_scan_malformed_metadata() {
        let tmp = tempdir().unwrap();
        let skill_dir = tmp.path().join("BadSkill");
        fs::create_dir_all(&skill_dir).unwrap();
        // Missing name and other fields, should use fallbacks
        fs::write(skill_dir.join("SKILL.md"), "--- \n version: invalid \n ---").unwrap();

        let mut registry = SkillRegistry::new();
        registry.scan_directory(tmp.path()).unwrap();
        
        let skill = &registry.skills["badskill"];
        assert_eq!(skill.name, "BadSkill");
        assert_eq!(skill.version, "invalid");
        assert_eq!(skill.author, "Unknown");
    }

    #[test]
    fn test_matching_case_insensitivity() {
        let tmp = tempdir().unwrap();
        let skill_dir = tmp.path().join("TestSkill");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(skill_dir.join("SKILL.md"), "--- \n name: Test \n --- \n USE WHEN Rust Query").unwrap();

        let mut registry = SkillRegistry::new();
        registry.scan_directory(tmp.path()).unwrap();
        
        let matches = registry.find_matching_skills("this is a RUST QUERY");
        assert_eq!(matches.len(), 1);
    }
}