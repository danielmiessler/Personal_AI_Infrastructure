use handlebars::Handlebars;
use serde::Serialize;
use anyhow::Result;
use std::path::Path;

pub struct PromptEngine<'a> {
    registry: Handlebars<'a>,
}

impl<'a> PromptEngine<'a> {
    pub fn new() -> Self {
        let mut hb = Handlebars::new();
        hb.set_strict_mode(true);
        Self { registry: hb }
    }

    pub fn register_template(&mut self, name: &str, path: &Path) -> Result<()> {
        let content = std::fs::read_to_string(path)?;
        self.registry.register_template_string(name, content)?;
        Ok(())
    }

    pub fn render<T: Serialize>(&self, template_name: &str, data: &T) -> Result<String> {
        let rendered = self.registry.render(template_name, data)?;
        Ok(rendered)
    }
}
