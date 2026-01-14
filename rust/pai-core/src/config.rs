use serde_json::Value;
use anyhow::Result;
use std::path::Path;
use std::fs;

pub struct ConfigLoader;

impl ConfigLoader {
    pub fn merge_configs(base: Value, extension: Value) -> Value {
        match (base, extension) {
            (Value::Object(mut base_map), Value::Object(ext_map)) => {
                for (k, v) in ext_map {
                    let base_v = base_map.entry(k).or_insert(Value::Null);
                    *base_v = Self::merge_configs(base_v.take(), v);
                }
                Value::Object(base_map)
            }
            (Value::Array(mut base_list), Value::Array(ext_list)) => {
                base_list.extend(ext_list);
                Value::Array(base_list)
            }
            (_, ext) => ext,
        }
    }

    pub fn load_with_customization(base_path: &Path, custom_path: &Path) -> Result<Value> {
        let base_content = fs::read_to_string(base_path)?;
        let base_json: Value = serde_json::from_str(&base_content)?;

        if custom_path.exists() {
            let custom_content = fs::read_to_string(custom_path)?;
            let custom_json: Value = serde_json::from_str(&custom_content)?;
            Ok(Self::merge_configs(base_json, custom_json))
        } else {
            Ok(base_json)
        }
    }
}
