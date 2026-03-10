# Architecture Preferences

**Your preferred architectural patterns, design principles, and system design approach.**

This file helps your AI make architectural decisions that align with your preferences.

---

## Core Principles

### Design Philosophy
[Your high-level approach to system design, e.g.:]
- Simplicity over cleverness
- Explicit over implicit
- Composition over inheritance
- Fail fast, recover gracefully

### Trade-off Preferences
When faced with trade-offs, I generally prefer:

| Trade-off | Preference | Notes |
|-----------|------------|-------|
| Speed vs Correctness | [Correctness] | [Except for prototypes] |
| DRY vs Clarity | [Clarity] | [Some duplication is OK] |
| Flexibility vs Simplicity | [Simplicity] | [YAGNI] |
| Performance vs Readability | [Readability] | [Optimize later] |

---

## Code Architecture

### Preferred Patterns
- [e.g., "Clean Architecture for backends"]
- [e.g., "Feature-based folder structure"]
- [e.g., "Repository pattern for data access"]

### Anti-Patterns to Avoid
- [e.g., "God classes/functions"]
- [e.g., "Deep inheritance hierarchies"]
- [e.g., "Magic strings/numbers"]

### Code Organization
```
project/
├── src/
│   ├── features/      # Feature-based modules
│   ├── shared/        # Shared utilities
│   ├── lib/           # External integrations
│   └── types/         # Type definitions
├── tests/
└── docs/
```

---

## System Architecture

### Preferred Approaches
- [e.g., "Monolith-first, extract services when needed"]
- [e.g., "Event-driven for async operations"]
- [e.g., "API-first design"]

### Infrastructure Preferences
- **Compute:** [Serverless / Containers / VMs]
- **Database:** [PostgreSQL / MongoDB / etc.]
- **Caching:** [Redis / In-memory / etc.]
- **Queue:** [SQS / RabbitMQ / etc.]

---

## API Design

### Style
- [REST / GraphQL / gRPC]
- [Versioning strategy]

### Conventions
- [e.g., "Use plural nouns for resources"]
- [e.g., "Return 201 for creation"]
- [e.g., "Include pagination metadata"]

---

## Data Design

### Database Preferences
- [e.g., "Prefer normalized schemas"]
- [e.g., "Use UUIDs for primary keys"]
- [e.g., "Always include created_at/updated_at"]

### Data Modeling
- [e.g., "Domain-driven design for complex domains"]
- [e.g., "CQRS for read-heavy systems"]

---

## Security Architecture

### Authentication
- [e.g., "JWT for stateless auth"]
- [e.g., "OAuth2 for third-party integration"]

### Authorization
- [e.g., "RBAC for user permissions"]
- [e.g., "Principle of least privilege"]

### Data Protection
- [e.g., "Encrypt at rest and in transit"]
- [e.g., "Never log PII"]

---

## Scalability Considerations

### When to Scale
- [e.g., "Optimize only when metrics indicate need"]
- [e.g., "Horizontal scaling over vertical"]

### Caching Strategy
- [e.g., "Cache at the edge for static content"]
- [e.g., "Application cache for expensive computations"]

---

*This file guides architectural decisions. Update as your preferences evolve.*
