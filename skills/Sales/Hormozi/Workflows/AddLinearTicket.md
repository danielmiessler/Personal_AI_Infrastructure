---
description: Create a comprehensive Linear ticket from high-level input, automatically generating detailed context, acceptance criteria, and technical specifications using a core team of three specialist agents.
argument-hint: "<high-level description of work needed>"
---

# Add Linear Ticket Command

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the AddLinearTicket workflow in the Hormozi skill to create tickets"}' \
  > /dev/null 2>&1 &
```

Running the **AddLinearTicket** workflow in the **Hormozi** skill to create tickets...

## Mission

Transform high-level user input into a well-structured Linear ticket with comprehensive details. This command uses a core team of three agents (`product-manager`, `ux-designer`, `senior-software-engineer`) to handle all feature planning and specification in parallel. It focuses on **pragmatic startup estimation** to ensure tickets are scoped for rapid, iterative delivery.

**Pragmatic Startup Philosophy**:
  - 🚀 **Ship Fast**: Focus on working solutions over perfect implementations
  - 💡 **80/20 Rule**: Deliver 80% of the value with 20% of the effort
  - 🎯 **MVP First**: Define the simplest thing that could possibly work

**Smart Ticket Scoping**: Automatically breaks down large work into smaller, shippable tickets if the estimated effort exceeds 2 days.

**Important**: This command ONLY creates the ticket(s). It does not start implementation or modify any code.

## Core Agent Workflow

For any feature request, this command follows a strict parallel execution rule using the core agent trio.

### The Core Trio (Always Run in Parallel)

1. **`architect`** (product-manager role): Defines the "Why" and "What." Focuses on user stories, business context, and acceptance criteria.
2. **`designer`** (ux-designer role): Defines the "How" for the user. Focuses on user flow, states, accessibility, and consistency.
3. **`engineer`** (senior-software-engineer role): Defines the "How" for the system. Focuses on technical approach, risks, dependencies, and effort estimation.

## Execution Steps

When this command is invoked, I will:

1. **Parse the Request**: Understand the high-level feature description
2. **Launch Parallel Agents**: Run all three agents simultaneously with specific prompts
3. **Synthesize Results**: Combine agent outputs into a comprehensive ticket
4. **Create Linear Ticket**: Use the Linear API to create the ticket

## Ticket Template

The final Linear ticket will include:

### Title
[Feature Name] - [Brief Description]

### Description

#### 🎯 Business Context & Purpose
[From product-manager agent]
- Problem being solved
- Target users
- Expected business impact
- Success metrics

#### 📋 User Stories & Acceptance Criteria
[From product-manager agent]
- As a [user], I want [feature] so that [benefit]
- Given [context], when [action], then [outcome]

#### 🎨 Design Specification
[From ux-designer agent]
- User flow
- UI components
- Interaction states
- Accessibility requirements
- Mobile responsiveness

#### 🔧 Technical Approach
[From senior-software-engineer agent]
- Architecture overview
- Implementation plan
- Database changes
- API endpoints
- Dependencies

#### ⚡ Performance & Security
- Performance targets
- Security considerations
- Data privacy requirements

#### 📊 Estimation
- Effort: [XS/S/M/L/XL]
- Timeline: [Days]
- Complexity: [Low/Medium/High]

#### ⚠️ Risks & Mitigations
- Technical risks
- Dependencies
- Mitigation strategies

#### ✅ Definition of Done
- [ ] Code implemented and tested
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Acceptance criteria met

### Labels
- `feature`
- `[priority-level]`
- `[team]`
- `[sprint]`

## Usage

To use this command, simply invoke it with a feature description:

```
/add-linear-ticket "Add user authentication with social login support"
```

The command will:
1. Launch three agents in parallel to analyze the request
2. Generate comprehensive specifications
3. Create a Linear ticket with all details
4. Return the ticket URL

## Implementation

```javascript
// Core execution logic
async function addLinearTicket(description) {
  // Launch agents in parallel
  const [prdResult, designResult, techResult] = await Promise.all([
    Task({
      subagent_type: 'architect',
      prompt: `Create a Product Requirements Document for: ${description}. Include user stories, business value, success metrics, and acceptance criteria.`,
      description: 'Create PRD'
    }),
    Task({
      subagent_type: 'designer', 
      prompt: `Design the user experience for: ${description}. Include user flows, UI components, states, accessibility requirements, and responsive design considerations.`,
      description: 'Design UX'
    }),
    Task({
      subagent_type: 'engineer',
      prompt: `Plan the technical implementation for: ${description}. Include architecture, database schema, API design, dependencies, effort estimation, and risks.`,
      description: 'Plan implementation'
    })
  ]);

  // Synthesize results into ticket
  const ticket = synthesizeTicket(prdResult, designResult, techResult);
  
  // Create Linear ticket
  const linear = new LinearIntegration();
  const createdTicket = await linear.createIssueFromPRD(ticket);
  
  return createdTicket.url;
}
```

## Notes

- This command leverages parallel agent execution for maximum efficiency
- Each agent works in their own context window to avoid interference
- The synthesis step ensures all perspectives are integrated coherently
- Tickets are automatically scoped to be completable within 2 days (following startup best practices)