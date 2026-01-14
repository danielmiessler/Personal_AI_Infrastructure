use std::path::PathBuf;
use std::fs;
use anyhow::Result;

pub struct RecoveryJournal {
    backup_dir: PathBuf,
}

impl RecoveryJournal {
    pub fn new(root_dir: PathBuf) -> Self {
        Self {
            backup_dir: root_dir.join("History").join("backups"),
        }
    }

    pub fn snapshot(&self, file_to_backup: &std::path::Path) -> Result<Option<PathBuf>> {
        if !file_to_backup.exists() || !file_to_backup.is_file() {
            return Ok(None);
        }

        let now = chrono::Utc::now();
        let filename = file_to_backup.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
            
        let backup_name = format!("{}_{}_{}", 
            now.format("%Y%m%d_%H%M%S"),
            uuid::Uuid::new_v4().to_string().get(..8).unwrap_or("rand"),
            filename
        );
        
        fs::create_dir_all(&self.backup_dir)?;
        let backup_path = self.backup_dir.join(backup_name);
        
        fs::copy(file_to_backup, &backup_path)?;
        
        Ok(Some(backup_path))
    }
}