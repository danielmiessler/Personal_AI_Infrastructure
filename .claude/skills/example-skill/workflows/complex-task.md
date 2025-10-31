# Complex Task Workflow

## Trigger
User says: "complex example", "multi-step task", "show me a complex workflow"

## Purpose
Demonstrate a multi-step workflow with validation, dependencies, and error handling.

## Workflow

### Phase 1: Preparation
1. **Validate Input**
   - Check required parameters provided
   - Verify format and type
   - Ensure prerequisites met

2. **Gather Resources**
   - Load necessary assets
   - Check dependencies
   - Prepare working environment

### Phase 2: Execution
3. **Step 1: Initial Operation**
   - Perform first task
   - Validate result
   - Store intermediate output

4. **Step 2: Dependent Operation**
   - Use output from Step 1
   - Execute dependent task
   - Validate compatibility

5. **Step 3: Integration**
   - Combine results from Steps 1-2
   - Apply business logic
   - Validate final state

### Phase 3: Finalization
6. **Quality Checks**
   - Verify all requirements met
   - Run validation tests
   - Check edge cases

7. **Cleanup and Return**
   - Clean temporary resources
   - Format final output
   - Provide user feedback

## Error Handling

```
If validation fails:
  → Report specific issue
  → Suggest fix
  → Stop execution

If operation fails:
  → Log error details
  → Attempt recovery if possible
  → Rollback if necessary

If dependencies missing:
  → List what's needed
  → Provide installation help
  → Exit gracefully
```

## Example

**User Request:** "Show me a complex multi-step example"

**Execution Flow:**
```
1. Validate: User wants complex workflow demo ✓
2. Gather: Load workflow template ✓
3. Execute Step 1: Show preparation phase ✓
4. Execute Step 2: Show execution phase ✓
5. Execute Step 3: Show finalization phase ✓
6. Quality Check: Verify demonstration complete ✓
7. Return: This workflow demonstrates the pattern ✓
```

## Pattern Demonstrated

**Complex workflows include:**
- Multiple phases
- Validation at each step
- Dependency management
- Error handling
- State tracking
- Rollback capability

## When to Use
- Multi-step processes
- Dependent operations
- Critical workflows
- Production systems
- Workflows requiring validation

## Dependencies
- Previous steps must complete
- Resources must be available
- Prerequisites must be met
- Environment must be ready

## Best Practices
- ✅ Validate inputs early
- ✅ Check dependencies first
- ✅ Handle errors gracefully
- ✅ Provide clear feedback
- ✅ Enable rollback if needed
- ❌ Don't assume success
- ❌ Don't skip validation
- ❌ Don't ignore errors

## Template
```markdown
# Complex Workflow Name

## Phase 1: Preparation
1. Validate
2. Gather

## Phase 2: Execution
3. Step A
4. Step B (depends on A)
5. Step C (depends on B)

## Phase 3: Finalization
6. Validate
7. Return

## Error Handling
[Specific error scenarios]

## Dependencies
[What must exist first]
```

This demonstrates a robust multi-step workflow suitable for production use.
