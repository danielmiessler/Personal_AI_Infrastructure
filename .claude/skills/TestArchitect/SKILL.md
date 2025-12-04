---
name: TestArchitect
description: Test-first development strategy for PAI projects. USE WHEN user needs test strategy, coverage analysis, ATDD workflows, risk-based testing, or quality gates. Ensures tests are written before code, not after bugs appear.
---

# TestArchitect

Test strategy before code: prevent defects through acceptance test-driven development (ATDD).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreateTestStrategy | Planning new feature or sprint | Comprehensive test strategy with test types and coverage targets |
| DefineCoverage | Analyzing existing code or setting quality gates | Coverage analysis report with gaps and improvement plan |
| AcceptanceTestDrivenDevelopment | Starting development on user story | Acceptance tests in Given-When-Then format, test automation code |
| RiskBasedTesting | Prioritizing test efforts for sprint/release | Risk matrix with coverage targets by risk level, test effort allocation |
| CiCdQualityGates | Setting up or improving CI/CD pipeline | Quality gate definitions, CI/CD configuration (GitHub Actions/GitLab CI) |

## Examples

### Example 1: Create test strategy for feature
```
User: "Create test strategy for user authentication"
Skill loads: TestArchitect → CreateTestStrategy workflow
Output: Test types (unit/integration/E2E), coverage targets (90% for auth), test scenarios
```

### Example 2: Analyze test coverage gaps
```
User: "Analyze test coverage for the payment module"
Skill loads: TestArchitect → DefineCoverage workflow
Output: Coverage report (65% → 85% target), gap analysis, improvement plan
```

### Example 3: Define tests for user story
```
User: "What tests do we need for password reset feature?"
Skill loads: TestArchitect → CreateTestStrategy workflow (focused on password reset)
Output: Test scenarios (happy path, expired token, invalid email, etc.)
```

### Example 4: Write acceptance tests for user story
```
User: "Write acceptance tests for US-42 (password reset)"
Skill loads: TestArchitect → AcceptanceTestDrivenDevelopment workflow
Output: Given-When-Then scenarios, Playwright/Cypress test automation code, test data fixtures
```

### Example 5: Assess risk and prioritize testing
```
User: "What should we focus testing on this sprint?"
Skill loads: TestArchitect → RiskBasedTesting workflow
Output: Risk matrix (auth=Critical 90%, cart=Medium 70%), test effort allocation (40 hours)
```

### Example 6: Set up CI/CD quality gates
```
User: "Configure quality gates for GitHub Actions"
Skill loads: TestArchitect → CiCdQualityGates workflow
Output: GitHub Actions YAML config, coverage thresholds, security gates, bundle size limits
```

## Integration

- Works with AgilePm skill (adds test requirements to user stories)
- Works with Security skill (security test scenarios from threat model)
- Follows test pyramid (70% unit, 20% integration, 10% E2E)
- Generates test-strategy.md and coverage reports

## Methodology

This skill follows test-first principles:
- ATDD (Acceptance Test-Driven Development)
- Test Pyramid (Martin Fowler)
- Risk-based testing (ISO 29119)
- Coverage targets by risk (Critical: 90%, High: 80%, Medium: 70%, Low: 50%)

Based on industry standards: ATDD, Test Pyramid, Risk-Based Testing, TDD.
