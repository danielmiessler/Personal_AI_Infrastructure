use handlebars::{Handlebars, Renderable, HelperDef, Helper, Context, RenderContext, Output, HelperResult};
use serde::Serialize;
use thiserror::Error;
use std::path::Path;

#[derive(Error, Debug)]
pub enum PromptError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Template registration error: {0}")]
    Template(#[from] handlebars::TemplateError),
    #[error("Template rendering error: {0}")]
    Render(#[from] handlebars::RenderError),
}

pub struct RepeatHelper;

impl HelperDef for RepeatHelper {
    fn call<'reg: 'rc, 'rc>(
        &self,
        h: &Helper<'rc>,
        r: &'reg Handlebars<'reg>,
        ctx: &'rc Context,
        rc: &mut RenderContext<'reg, 'rc>,
        out: &mut dyn Output,
    ) -> HelperResult {
        let count = h.param(0).and_then(|v| v.value().as_u64()).unwrap_or(0);
        
        // If it's used as a simple helper {{repeat 3 '*'}}
        if let Some(s) = h.param(1).and_then(|v| v.value().as_str()) {
            for _ in 0..count {
                out.write(s)?;
            }
        } 
        // If it's used as a block helper {{#repeat 3}}...{{/repeat}}
        else if let Some(t) = h.template() {
            for _ in 0..count {
                t.render(r, ctx, rc, out)?;
            }
        }
        Ok(())
    }
}

pub struct PromptEngine<'a> {
    registry: Handlebars<'a>,
}

impl<'a> PromptEngine<'a> {
    pub fn new() -> Self {
        let mut hb = Handlebars::new();
        hb.set_strict_mode(true);

        // Register the Repeat block helper
        hb.register_helper("repeat", Box::new(RepeatHelper));

        // Port all other 17 PAI Standard Helpers
        hb.register_helper("uppercase", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let param = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            out.write(&param.to_uppercase())?;
            Ok(())
        }));

        hb.register_helper("lowercase", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let param = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            out.write(&param.to_lowercase())?;
            Ok(())
        }));

        hb.register_helper("titlecase", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let param = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            let mut buffer = String::with_capacity(param.len());
            let mut next_upper = true;
            for c in param.chars() {
                if c.is_whitespace() {
                    next_upper = true;
                    buffer.push(c);
                } else if next_upper {
                    for uc in c.to_uppercase() { buffer.push(uc); }
                    next_upper = false;
                } else {
                    for lc in c.to_lowercase() { buffer.push(lc); }
                }
            }
            out.write(&buffer)?;
            Ok(())
        }));

        hb.register_helper("pluralize", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let count = h.param(0).and_then(|v| v.value().as_u64()).unwrap_or(0);
            let singular = h.param(1).and_then(|v| v.value().as_str()).unwrap_or("");
            let plural_fallback = format!("{}s", singular);
            let plural = h.param(2).and_then(|v| v.value().as_str()).unwrap_or(&plural_fallback);
            
            let res = if count == 1 { singular } else { plural };
            out.write(res)?;
            Ok(())
        }));

        hb.register_helper("join", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let list = h.param(0).and_then(|v| v.value().as_array());
            let separator = h.param(1).and_then(|v| v.value().as_str()).unwrap_or(", ");
            if let Some(arr) = list {
                let res = arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(separator);
                out.write(&res)?;
            }
            Ok(())
        }));

        hb.register_helper("eq", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let a = h.param(0).map(|v| v.value());
            let b = h.param(1).map(|v| v.value());
            if a == b { out.write("true")?; }
            Ok(())
        }));

        hb.register_helper("json", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let param = h.param(0).map(|v| v.value());
            if let Some(val) = param {
                out.write(&serde_json::to_string(val).unwrap_or_default())?;
            }
            Ok(())
        }));

        hb.register_helper("codeblock", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let code = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            let lang = h.param(1).and_then(|v| v.value().as_str()).unwrap_or("");
            out.write(&format!("```{}\n{}\n```", lang, code))?;
            Ok(())
        }));

        hb.register_helper("indent", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let text = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            let spaces = h.param(1).and_then(|v| v.value().as_u64()).unwrap_or(2) as usize;
            let indent = " ".repeat(spaces);
            let res = text.lines().map(|line| format!("{}{}", indent, line)).collect::<Vec<_>>().join("\n");
            out.write(&res)?;
            Ok(())
        }));

        hb.register_helper("now", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let format = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("iso");
            let now = chrono::Utc::now();
            let res = if format == "date" { now.format("%Y-%m-%d").to_string() } else { now.to_rfc3339() };
            out.write(&res)?;
            Ok(())
        }));

        hb.register_helper("gt", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let a = h.param(0).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            let b = h.param(1).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            if a > b { out.write("true")?; }
            Ok(())
        }));

        hb.register_helper("lt", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let a = h.param(0).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            let b = h.param(1).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            if a < b { out.write("true")?; }
            Ok(())
        }));

        hb.register_helper("includes", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let list = h.param(0).and_then(|v| v.value().as_array());
            let val = h.param(1).and_then(|v| v.value().as_str()).unwrap_or("");
            if let Some(arr) = list {
                if arr.iter().any(|v| v.as_str() == Some(val)) {
                    out.write("true")?;
                }
            }
            Ok(())
        }));

        hb.register_helper("formatNumber", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let num = h.param(0).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            out.write(&num.to_string())?;
            Ok(())
        }));

        hb.register_helper("percent", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let val = h.param(0).and_then(|v| v.value().as_f64()).unwrap_or(0.0);
            let total = h.param(1).and_then(|v| v.value().as_f64()).unwrap_or(1.0);
            let res = (val / total * 100.0).round() as u64;
            out.write(&format!("{}%", res))?;
            Ok(())
        }));

        hb.register_helper("truncate", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let text = h.param(0).and_then(|v| v.value().as_str()).unwrap_or("");
            let len = h.param(1).and_then(|v| v.value().as_u64()).unwrap_or(100) as usize;
            if text.len() > len {
                out.write(&format!("{}...", &text[..len]))?;
            } else {
                out.write(text)?;
            }
            Ok(())
        }));

        hb.register_helper("default", Box::new(|h: &handlebars::Helper, _: &handlebars::Handlebars, _: &handlebars::Context, _: &mut handlebars::RenderContext, out: &mut dyn handlebars::Output| {
            let val = h.param(0).map(|v| v.value());
            let fallback = h.param(1).and_then(|v| v.value().as_str()).unwrap_or("");
            match val {
                Some(serde_json::Value::Null) | None => out.write(fallback)?,
                Some(v) => out.write(&v.as_str().unwrap_or(""))?,
            }
            Ok(())
        }));

        Self { registry: hb }
    }

    pub fn register_template(&mut self, name: &str, path: &Path) -> Result<(), PromptError> {
        let content = std::fs::read_to_string(path)?;
        self.registry.register_template_string(name, content)?;
        Ok(())
    }

    pub fn render<T: Serialize>(&self, template_name: &str, data: &T) -> Result<String, PromptError> {
        let rendered = self.registry.render(template_name, data)?;
        Ok(rendered)
    }
}
