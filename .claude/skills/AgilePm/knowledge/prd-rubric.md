# PRD Quality Rubric

**Purpose**: Objective scoring for PRD quality (used in Week 2 validation gate)

**Passing Score**: ≥8 out of 10 points

---

## Scoring Categories

### 1. Executive Summary (2 points)

**2 points** - Excellent:
- Clear, concise (1-2 paragraphs)
- Answers: What, Why, Who, When, Success
- Compelling business case
- Measurable success metrics included

**1 point** - Adequate:
- Covers most elements
- Somewhat verbose or missing minor details
- Success metrics present but not fully measurable

**0 points** - Poor:
- Missing key elements (What/Why/Who)
- Too long (>3 paragraphs) or too short (<1 paragraph)
- No success metrics
- Business value unclear

---

### 2. System Architecture (2 points)

**2 points** - Excellent:
- Clear high-level architecture (diagram or detailed description)
- All components identified and described
- Technology choices justified
- Integration points specified

**1 point** - Adequate:
- Architecture present but missing some details
- Components listed but descriptions shallow
- Technology choices mentioned but not justified

**0 points** - Poor:
- No architecture section
- Vague or incomplete component list
- No technology choices specified

---

### 3. Feature Breakdown (2 points)

**2 points** - Excellent:
- Features prioritized (Must/Should/Could/Won't)
- User value articulated for each feature
- Comprehensive coverage of all capabilities
- Explicit exclusions documented

**1 point** - Adequate:
- Features listed but prioritization weak
- User value missing for some features
- Most features covered but some gaps

**0 points** - Poor:
- Features not prioritized
- No user value statements
- Incomplete or vague feature list

---

### 4. Implementation Checklist (2 points)

**2 points** - Excellent:
- Comprehensive, actionable checklist
- Organized by category (Setup, Backend, Frontend, Testing, etc.)
- All major tasks covered
- Specific enough to guide implementation

**1 point** - Adequate:
- Checklist present but missing some categories
- Some items too vague
- Covers most tasks but gaps exist

**0 points** - Poor:
- No implementation checklist
- Checklist too vague to be actionable
- Major gaps in task coverage

---

### 5. Clarity & Usability (2 points)

**2 points** - Excellent:
- Well-organized, easy to navigate
- Clear headings and structure
- No ambiguity in requirements
- Developer could implement without clarification

**1 point** - Adequate:
- Mostly clear but some confusion possible
- Structure present but could be improved
- Minor ambiguities that need clarification

**0 points** - Poor:
- Confusing organization
- Ambiguous requirements
- Developer would need significant clarification

---

## Scoring Examples

### Example 1: High-Quality PRD (10/10)

**Executive Summary**: ✅ 2/2 - Clear, concise, measurable metrics
**Architecture**: ✅ 2/2 - Detailed mermaid diagram, all components described
**Features**: ✅ 2/2 - Prioritized, user value clear, exclusions documented
**Checklist**: ✅ 2/2 - Comprehensive, actionable, well-organized
**Clarity**: ✅ 2/2 - Perfectly clear, developer-ready

**Total**: 10/10 - **EXCELLENT** - Ready for implementation

---

### Example 2: Adequate PRD (8/10)

**Executive Summary**: ✅ 2/2 - Good summary with metrics
**Architecture**: ⚠️ 1/2 - Architecture present but light on detail
**Features**: ✅ 2/2 - Well-prioritized with user value
**Checklist**: ⚠️ 1/2 - Present but missing some tasks
**Clarity**: ✅ 2/2 - Clear and usable

**Total**: 8/10 - **PASSING** - Ready with minor improvements

---

### Example 3: Poor PRD (4/10)

**Executive Summary**: ⚠️ 1/2 - Missing success metrics
**Architecture**: ❌ 0/2 - No architecture section
**Features**: ⚠️ 1/2 - Listed but not prioritized
**Checklist**: ✅ 2/2 - Good checklist (bright spot)
**Clarity**: ❌ 0/2 - Confusing, needs clarification

**Total**: 4/10 - **FAILING** - Needs major rework

---

## Validation Process

### Week 2 Validation Gate

1. **Self-Review**: Score your own PRD using this rubric
2. **Peer Review**: Have another developer score it
3. **Calculate**: Average the two scores
4. **Pass/Fail**: ≥8/10 = Pass, <8/10 = Revise and resubmit

### Tips for Scoring

- **Be honest**: Score objectively, not optimistically
- **Use the rubric**: Don't add personal preferences
- **Explain scores**: Note why you gave each score
- **Suggest improvements**: For any score <2, note what's missing

---

## Improvement Checklist

If PRD scores <8/10, use this checklist to improve:

**Executive Summary (<2)**:
- [ ] Add clear What/Why/Who statements
- [ ] Include measurable success metrics
- [ ] Tighten to 1-2 paragraphs

**Architecture (<2)**:
- [ ] Add architecture diagram or detailed description
- [ ] Describe all components
- [ ] Justify technology choices

**Features (<2)**:
- [ ] Prioritize with Must/Should/Could/Won't
- [ ] Add user value for each feature
- [ ] Document explicit exclusions

**Checklist (<2)**:
- [ ] Organize by category (Setup, Backend, Frontend, etc.)
- [ ] Make items actionable (not vague)
- [ ] Cover all major tasks

**Clarity (<2)**:
- [ ] Reorganize for better structure
- [ ] Remove ambiguity
- [ ] Test: Can developer implement without questions?

---

## Common Pitfalls

### Pitfall 1: "Everything is a Must Have"
- **Problem**: No real prioritization
- **Fix**: Be ruthless - what's truly MVP vs. v1.1?

### Pitfall 2: "Technical Jargon in Executive Summary"
- **Problem**: Executives can't understand it
- **Fix**: Write for non-technical audience

### Pitfall 3: "Vague Implementation Checklist"
- **Problem**: Items like "Build backend" are too broad
- **Fix**: Break into specific tasks ("Design schema", "Implement auth API")

### Pitfall 4: "Missing Success Metrics"
- **Problem**: Can't measure if successful
- **Fix**: Add quantitative metrics (X users, Y% engagement, <Z seconds)

### Pitfall 5: "No Architecture"
- **Problem**: Developers don't know how to build it
- **Fix**: Add high-level component diagram or description

---

## Rubric Version

**Version**: 1.0
**Created**: 2025-12-02
**Purpose**: MVP Release 0.1 validation gate (Week 2)

**Pass Rate Target**: >90% of PRDs score ≥8/10 after first review
