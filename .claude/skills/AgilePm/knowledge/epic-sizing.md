# Epic Sizing Guide

Quick reference for estimating epic size based on complexity, features, and effort.

---

## Size Categories

| Size | Story Points | Duration | Features | Complexity |
|------|--------------|----------|----------|------------|
| **S (Small)** | 8-13 | 1-2 sprints | 2-4 | Low-Medium |
| **M (Medium)** | 21-34 | 3-5 sprints | 5-8 | Medium-High |
| **L (Large)** | 55+ | 6+ sprints | 9+ | High |

---

## Sizing Examples

### Small Epic (8-13 points)

**Example**: Basic User Authentication
- Features (3):
  - Email/password login
  - Password reset
  - Basic profile management
- Complexity: Low (well-known patterns)
- Duration: 1-2 sprints
- **Size**: 13 points

**Indicators of Small Epic**:
- Few dependencies
- Well-understood technical solution
- Limited integration points
- Can be completed in 1-2 sprints

---

### Medium Epic (21-34 points)

**Example**: Enhanced Security & Compliance
- Features (6):
  - OAuth2 integration
  - Two-factor authentication
  - Email verification
  - Session management (device list)
  - Account recovery
  - Audit logging
- Complexity: Medium-High (some unknowns)
- Duration: 3-5 sprints
- **Size**: 34 points

**Indicators of Medium Epic**:
- Multiple integration points
- Some technical unknowns
- Moderate dependencies
- Requires 3-5 sprints

---

### Large Epic (55+ points)

**Example**: Advanced Analytics Platform
- Features (10+):
  - Data ingestion pipeline
  - Real-time processing
  - Custom dashboard builder
  - Multiple visualization types
  - Report scheduling
  - Export capabilities
  - User-defined metrics
  - Team collaboration
  - API for third-party integration
  - Admin analytics console
- Complexity: High (significant unknowns)
- Duration: 6+ sprints
- **Size**: 89 points

**Indicators of Large Epic**:
- Many complex features
- High technical uncertainty
- Multiple teams/services involved
- Would take 6+ sprints

**Recommendation**: Split into 2-3 smaller epics

---

## Sizing Factors

### Factor 1: Number of Features

| Features | Typical Size |
|----------|--------------|
| 2-4 | Small |
| 5-8 | Medium |
| 9+ | Large (consider splitting) |

### Factor 2: Technical Complexity

| Complexity | Examples | Size Impact |
|------------|----------|-------------|
| **Low** | CRUD operations, known patterns | +0-5 points |
| **Medium** | API integration, moderate logic | +5-13 points |
| **High** | Real-time processing, ML, complex algorithms | +21+ points |

### Factor 3: Dependencies

| Dependencies | Impact | Size Adjustment |
|--------------|--------|-----------------|
| **None** | Can start immediately | +0 points |
| **Few** | 1-2 other epics | +3-5 points |
| **Many** | 3+ epics, external services | +8-13 points |

### Factor 4: Uncertainty

| Uncertainty | Examples | Size Adjustment |
|-------------|----------|-----------------|
| **Low** | Well-understood, done before | +0 points |
| **Medium** | Some unknowns, prototyping needed | +5-8 points |
| **High** | Research required, unproven tech | +13+ points |

---

## Sizing Formula (Rule of Thumb)

```
Epic Size = (Avg Story Points × Number of Stories) + Complexity Buffer

Where:
- Avg Story Points = 3-5 (typical story size)
- Number of Stories = Count of user stories in epic
- Complexity Buffer = 0-20% for unknowns
```

**Example Calculation**:
- 6 stories × 4 points avg = 24 points
- Medium complexity buffer (+20%) = +5 points
- **Total**: 29 points (Medium epic)

---

## When to Split an Epic

**Split if**:
- Epic > 55 points
- Duration > 6 sprints
- Multiple independent value streams
- High uncertainty (reduce risk by splitting)
- Team changes mid-epic

**How to Split**:
1. **By user value**: Separate distinct value themes
2. **By phase**: Foundation → Enhancement → Advanced
3. **By risk**: Tackle high-risk parts first
4. **By dependency**: Independent chunks that can be parallelized

**Example Split**:

**Original Large Epic** (89 points): Analytics Platform

**Split into 3 Medium Epics**:
1. **Epic A**: Core Analytics (34 pts)
   - Data ingestion
   - Basic dashboards
   - Simple visualizations

2. **Epic B**: Advanced Features (34 pts)
   - Custom dashboard builder
   - Report scheduling
   - Export capabilities

3. **Epic C**: Collaboration & API (21 pts)
   - Team collaboration features
   - Third-party API
   - Admin console

---

## Validation Checklist

Before finalizing epic size:

- [ ] Feature count is reasonable (2-8 features)
- [ ] Complexity assessed (Low/Medium/High)
- [ ] Dependencies identified and quantified
- [ ] Uncertainty/risk evaluated
- [ ] Duration is realistic (1-5 sprints for S/M epics)
- [ ] If >55 points, split into smaller epics
- [ ] Size aligns with team's velocity

---

## Common Sizing Mistakes

### Mistake 1: Underestimating Complexity
- **Problem**: Treating complex epic as simple
- **Fix**: Add complexity buffer (10-20%)
- **Example**: "Simple" OAuth2 integration → Actually 21 points, not 8

### Mistake 2: Ignoring Dependencies
- **Problem**: Not accounting for blocking epics
- **Fix**: Add dependency buffer (+3-5 points per dependency)

### Mistake 3: Kitchen Sink Epic
- **Problem**: Throwing all features into one epic
- **Fix**: Split by user value or phase

### Mistake 4: Too Granular
- **Problem**: Making epics too small (<8 points)
- **Fix**: Combine related small features into meaningful epic

### Mistake 5: No Uncertainty Buffer
- **Problem**: Perfect-world estimates
- **Fix**: Add 10-20% buffer for unknowns

---

## Epic Sizing Anti-Patterns

### ❌ Anti-Pattern 1: "The Everything Epic"
- **Problem**: 150+ point epic with 20 features
- **Why Bad**: Unmaintainable, can't finish in reasonable time
- **Fix**: Split into 3-4 epics by value theme

### ❌ Anti-Pattern 2: "The Feature List Epic"
- **Problem**: Random collection of unrelated features
- **Why Bad**: No cohesive user value
- **Fix**: Group features by what value they deliver together

### ❌ Anti-Pattern 3: "The Technical Layer Epic"
- **Problem**: "Backend API Epic", "Frontend Epic"
- **Why Bad**: No user-facing value until all layers done
- **Fix**: Vertical slices (full features, not horizontal layers)

### ❌ Anti-Pattern 4: "The Micro-Epic"
- **Problem**: 3-point "epic" with 1 story
- **Why Bad**: Not really an epic, just a story
- **Fix**: Combine with related work or call it a story

---

## Velocity Considerations

Your epic sizing should align with team velocity:

**Solo Developer** (10 points/week):
- Small epic (13 pts) = 1-2 weeks
- Medium epic (34 pts) = 3-4 weeks
- Large epic (55 pts) = 5-6 weeks

**Small Team** (40 points/week):
- Small epic = 1 week or less
- Medium epic = 1-2 weeks
- Large epic = 2 weeks

**Adjust sizing** if your epics consistently take longer than estimated.

---

## Quick Reference

| Epic Size | Points | Features | Duration (Solo) | Duration (Team) |
|-----------|--------|----------|-----------------|-----------------|
| **XS** | <8 | 1-2 | <1 week | <1 week |
| **S** | 8-13 | 2-4 | 1-2 weeks | 1 week |
| **M** | 21-34 | 5-8 | 3-4 weeks | 1-2 weeks |
| **L** | 55+ | 9+ | 5+ weeks | 2+ weeks |

**Rule of Thumb**: If duration > 6 weeks (solo) or 2 weeks (team), **split the epic**.

---

**Version**: 1.0
**Last Updated**: 2025-12-02
