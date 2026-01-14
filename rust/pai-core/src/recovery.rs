use std::path::PathBuf;
use std::fs;
use anyhow::Result;

pub struct RecoveryJournal {
    backup_dir: PathBuf,
    max_file_size: u64,
}

impl RecoveryJournal {
    pub fn new(root_dir: PathBuf) -> Self {
        Self {
            backup_dir: root_dir.join("History").join("backups"),
            max_file_size: 10 * 1024 * 1024, // 10MB Default limit
        }
    }

    pub fn snapshot(&self, file_to_backup: &std::path::Path) -> Result<Option<PathBuf>> {
        if !file_to_backup.exists() || !file_to_backup.is_file() {
            return Ok(None);
        }

        // Black Swan Protection: Prevent massive file copies from exhausting disk
        let metadata = fs::metadata(file_to_backup)?;
        if metadata.len() > self.max_file_size {
            return Err(anyhow::anyhow!("File too large for snapshot ({} bytes)", metadata.len()));
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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::io::Write;

    #[test]
    fn test_snapshot_size_limit() {
        let tmp = tempdir().unwrap();
        let mut journal = RecoveryJournal::new(tmp.path().to_path_buf());
        journal.max_file_size = 100; // 100 bytes

        let large_file = tmp.path().join("large.txt");
        let mut f = fs::File::create(&large_file).unwrap();
        f.write_all(&[0u8; 200]).unwrap();

        let res = journal.snapshot(&large_file);
        assert!(res.is_err());
        assert!(res.unwrap_err().to_string().contains("too large"));
    }
}