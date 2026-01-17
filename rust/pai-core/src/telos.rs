use std::path::PathBuf;

pub struct TelosEngine {
    root_dir: PathBuf,
}

#[derive(Debug, Clone)]
pub enum TelosCategory {
    Mission,
    Beliefs,
    Goals,
    Projects,
    Models,
    Strategies,
    Narratives,
    Learned,
    Challenges,
    Ideas,
}

impl TelosEngine {
    pub fn new(root_dir: PathBuf) -> Self {
        Self { root_dir }
    }

    pub fn get_file_path(&self, category: TelosCategory) -> PathBuf {
        let filename = match category {
            TelosCategory::Mission => "MISSION.md",
            TelosCategory::Beliefs => "BELIEFS.md",
            TelosCategory::Goals => "GOALS.md",
            TelosCategory::Projects => "PROJECTS.md",
            TelosCategory::Models => "MODELS.md",
            TelosCategory::Strategies => "STRATEGIES.md",
            TelosCategory::Narratives => "NARRATIVES.md",
            TelosCategory::Learned => "LEARNED.md",
            TelosCategory::Challenges => "CHALLENGES.md",
            TelosCategory::Ideas => "IDEAS.md",
        };
        self.root_dir.join("skills").join("CORE").join("USER").join("TELOS").join(filename)
    }

    pub fn load_deep_context(&self, categories: &[TelosCategory]) -> anyhow::Result<String> {
        let mut context = String::from("# DEEP CONTEXT (TELOS)\n\n");
        for cat in categories {
            let path = self.get_file_path(cat.clone());
            if path.exists() {
                let content = std::fs::read_to_string(path)?;
                context.push_str(&content);
                context.push_str("\n---\n\n");
            }
        }
        Ok(context)
    }
}