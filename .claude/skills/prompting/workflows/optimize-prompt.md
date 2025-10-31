# Optimize Prompt Workflow

## Trigger
User says: "optimize this prompt", "improve my prompt", "make this prompt better"

## Purpose
Improve an existing prompt using context engineering principles.

## Workflow

1. **Analyze Current Prompt**
   - Identify verbose language
   - Find redundant information
   - Look for vague instructions
   - Note missing structure

2. **Apply Optimization Techniques**
   - **Remove Redundancy**: Cut duplicate information
   - **Increase Directness**: Convert suggestions to imperatives
   - **Add Structure**: Use clear markdown sections
   - **Sharpen Language**: Replace verbose with concise

3. **Context Optimization**
   - Move lengthy examples to references
   - Use just-in-time loading for details
   - Create structured sections vs paragraphs

4. **Before/After Comparison**
   - Show token count reduction
   - Verify clarity maintained/improved
   - Ensure all requirements covered

5. **Test Results**
   - Compare outputs before/after
   - Measure performance improvement
   - Iterate if needed

## Common Patterns

**Verbose → Direct**
- ❌ "You should consider using..."
- ✅ "Use X tool for Y"

**Paragraph → List**
- ❌ Long paragraph of requirements
- ✅ Bulleted constraint list

**Full Data → Reference**
- ❌ Entire JSON schema in prompt
- ✅ "See schema.json for structure"

## Reference
See main prompting skill for detailed optimization principles.
