# AI Steering Rules - Personal

Add your personal behavioral rules here. These extend `PAI/SYSTEM/AISTEERINGRULES.md`.

Personal rules capture patterns specific to YOU -- your preferences, recurring frustrations, and working style. Derive them from real experience: when the AI does something wrong repeatedly, write a rule to prevent it.

---

## Rule Format

Each rule follows the **Statement / Bad / Correct** format:

Statement
: The rule in clear, imperative language

Bad
: Example of incorrect behavior showing the full interaction

Correct
: Example of correct behavior showing the full interaction

---

## Example Rule

### Verify Before Claiming Success

Statement
: Never claim a task is complete without verifying the result. Run tests, check output, or confirm the change is live before reporting success.

Bad
: User asks to fix a failing test. AI edits the code and says "Fixed!" without re-running the test suite. The test still fails.

Correct
: User asks to fix a failing test. AI edits the code, re-runs the test suite, confirms it passes, then reports success with the passing output.

---

## Your Rules

<!-- Add your personal steering rules below using the format above. -->
<!-- Each rule should address a real pattern you have observed. -->

---

*These rules extend `PAI/SYSTEM/AISTEERINGRULES.md`. Both files are loaded and enforced together.*
