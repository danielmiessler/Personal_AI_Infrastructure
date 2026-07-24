# Fabric Pattern Reference

Quick-reference for the **Fabric** skill: which category for which task, and the key patterns in each. Counts are derived from the actual `Patterns/` directory — **235 patterns total**. Category counts are by dominant verb prefix and do not sum to 235 (many patterns use other verbs like `ask_`, `check_`, `compare_`, `convert_`, `clean_`).

## Categories

| Category | Count | Key patterns |
|----------|-------|--------------|
| **Extraction** (`extract_*`) | 38 | `extract_wisdom`, `extract_insights`, `extract_main_idea`, `extract_recommendations`, `extract_predictions`, `extract_questions`, `extract_references` |
| **Summarization** | 20 | `summarize`, `create_5_sentence_summary`, `create_micro_summary`, `summarize_paper`, `summarize_meeting`, `youtube_summary` |
| **Analysis** (`analyze_*`) | 33 | `analyze_claims`, `analyze_code`, `analyze_paper`, `analyze_logs`, `analyze_threat_report`, `analyze_incident`, `analyze_risk`, `analyze_prose` |
| **Creation** (`create_*`) | 57 | `create_threat_model`, `create_prd`, `create_design_document`, `create_mermaid_visualization`, `create_keynote`, `create_academic_paper`, `create_command` |
| **Improvement** (`improve_*`/`review_*`/`refine_*`) | 7 | `improve_writing`, `improve_prompt`, `improve_academic_writing`, `review_code`, `review_design`, `refine_design_document` |
| **Security** (cross-cutting) | ~15 | `create_stride_threat_model`, `create_sigma_rules`, `write_semgrep_rule`, `write_nuclei_template_rule`, `analyze_malware`, `analyze_threat_report`, `ask_secure_by_design_questions` |
| **Rating** (`rate_*`/`judge_*`/`label_*`) | 6 | `rate_content`, `rate_ai_response`, `rate_value`, `judge_output`, `label_and_rate`, `check_agreement` |

*Security patterns are cross-cutting — they live under `create_*`, `analyze_*`, and `write_*` prefixes rather than a single namespace.*

## Which category for which task

- **"Pull the signal out of this"** — a talk, article, transcript → **Extraction** (`extract_wisdom`, `extract_insights`).
- **"Make this shorter"** — condense without losing the point → **Summarization** (`summarize`, `create_5_sentence_summary`).
- **"Pick this apart"** — claims, code, logs, a threat report → **Analysis** (`analyze_claims`, `analyze_code`).
- **"Produce a new artifact"** — a PRD, threat model, diagram, keynote → **Creation** (`create_prd`, `create_mermaid_visualization`).
- **"Make this better"** — prose, a prompt, code → **Improvement** (`improve_writing`, `improve_prompt`, `review_code`).
- **"Model the attack surface / write a detection"** → **Security** (`create_stride_threat_model`, `create_sigma_rules`).
- **"Score or grade this"** — content quality, an AI response → **Rating** (`rate_content`, `judge_output`).

## Invocation (Hermes)

```
/skill Fabric
```
Then name the pattern (or the intent). The skill reads `Patterns/<name>/system.md` and applies it natively — no CLI round-trip. The `fabric` CLI is used only for YouTube transcript (`-y`) and URL fallback (`-u`).

Browse the full list: `LifeOS/install/skills/Fabric/Patterns/` (each subdirectory is one pattern, defined by its `system.md`).

## Cross-References

- Skill body + workflow routing: `SKILL.md` (Fabric)
- Execution workflow: `Workflows/ExecutePattern.md`
- Update workflow (`git pull` on Hermes): `Workflows/UpdatePatterns.md`
