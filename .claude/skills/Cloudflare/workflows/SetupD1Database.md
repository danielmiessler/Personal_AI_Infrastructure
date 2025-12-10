# SetupD1Database Workflow

Create and configure a D1 SQLite database with schema and migrations.

## Inputs

- **database_name**: Name for the database
- **location_hint** (optional): wnam, enam, weur, eeur, apac
- **schema** (optional): Initial table definitions

## Steps

### 1. Create Database

Use MCP tool:
```
create_d1_database:
  name: "{{database_name}}"
  primary_location_hint: "{{location_hint}}"
```

Save the returned UUID for wrangler.toml binding.

### 2. Create Migration Directory

```
project/
├── migrations/
│   ├── 0001_initial.sql
│   └── ...
└── wrangler.toml
```

### 3. Write Initial Migration

Create `migrations/0001_initial.sql`:

```sql
-- Migration: Initial schema
-- Created: {{date}}

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
```

### 4. Apply Migrations

Via wrangler CLI:
```bash
npx wrangler d1 migrations apply {{database_name}}
```

Or via MCP tool:
```
query_d1_database:
  database_id: "{{uuid}}"
  sql: "{{migration_sql}}"
```

### 5. Configure Worker Binding

Add to wrangler.toml:
```toml
[[d1_databases]]
binding = "DB"
database_name = "{{database_name}}"
database_id = "{{uuid}}"
```

### 6. Verify Setup

Query to verify:
```
get_d1_schema:
  database_id: "{{uuid}}"
```

Should return created tables and indexes.

## Output

- D1 database created with UUID
- Initial schema applied
- Migration files created
- wrangler.toml binding configured
- TypeScript types for database (if requested)

## Best Practices

1. **Always use migrations** - Never modify schema directly
2. **Add indexes** - For any column used in WHERE clauses
3. **Use INTEGER PRIMARY KEY** - For auto-increment IDs
4. **TEXT for dates** - SQLite stores dates as TEXT
5. **Parameterized queries** - Always use `?` placeholders

## Common Schemas

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### Posts Table
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Key-Value Table
```sql
CREATE TABLE kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TEXT
);
CREATE INDEX idx_kv_expires ON kv(expires_at);
```

## MCP Tools Used

- `create_d1_database`
- `query_d1_database`
- `get_d1_schema`
