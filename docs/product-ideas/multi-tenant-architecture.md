# CortexDrop Multi-Tenant Architecture

> Exploring how the context management system scales to a hosted SaaS product

## The Question

How does CortexDrop work in a multi-tenant environment? Would we host a protected vault environment, with Telegram bot as one UX option?

**Short answer:** Yes, exactly. The core is a **hosted vault service** with multiple input channels (Telegram, Web, API, Mobile) and multiple output channels (Web UI, API, Obsidian Sync).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CORTEXDROP MULTI-TENANT SAAS                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  INPUT CHANNELS                         CORE PLATFORM                           │
│  ┌──────────────────┐                  ┌───────────────────────────────────────┐│
│  │ 📱 Telegram Bot  │──┐               │                                       ││
│  │   (per-user)     │  │               │  ┌─────────────────────────────────┐  ││
│  └──────────────────┘  │               │  │     INGESTION PIPELINE          │  ││
│  ┌──────────────────┐  │               │  │  ┌─────────┐ ┌─────────────────┐│  ││
│  │ 🌐 Web Clipper   │──┼───────────────┼─▶│  │ Queue   │→│ Process Workers ││  ││
│  │   (Extension)    │  │               │  │  │ (Redis) │ │ (Transcribe,    ││  ││
│  └──────────────────┘  │               │  │  └─────────┘ │  Extract, Tag)  ││  ││
│  ┌──────────────────┐  │               │  │              └─────────────────┘│  ││
│  │ 📲 Mobile App    │──┤               │  └─────────────────────────────────┘  ││
│  │   (iOS/Android)  │  │               │                    │                   ││
│  └──────────────────┘  │               │                    ▼                   ││
│  ┌──────────────────┐  │               │  ┌─────────────────────────────────┐  ││
│  │ 🔌 API           │──┤               │  │     TENANT VAULTS               │  ││
│  │   (REST/GraphQL) │  │               │  │  ┌──────────┐ ┌──────────┐      │  ││
│  └──────────────────┘  │               │  │  │ User A   │ │ User B   │ ...  │  ││
│  ┌──────────────────┐  │               │  │  │ Vault    │ │ Vault    │      │  ││
│  │ ⌨️  CLI Tool     │──┘               │  │  │ (S3)     │ │ (S3)     │      │  ││
│  │   (power users)  │                  │  │  └──────────┘ └──────────┘      │  ││
│  └──────────────────┘                  │  └─────────────────────────────────┘  ││
│                                        │                    │                   ││
│  OUTPUT CHANNELS                       │                    ▼                   ││
│  ┌──────────────────┐                  │  ┌─────────────────────────────────┐  ││
│  │ 🖥️  Web Dashboard │◀─────────────────┼──│     SEMANTIC INDEX              │  ││
│  │   (React/Next.js)│                  │  │  ┌──────────────────────────────┐│  ││
│  └──────────────────┘                  │  │  │ PostgreSQL + pgvector       ││  ││
│  ┌──────────────────┐                  │  │  │ Per-tenant embeddings       ││  ││
│  │ 📚 Obsidian Sync │◀─────────────────┼──│  │ Chunk-level similarity      ││  ││
│  │   (Optional)     │                  │  │  └──────────────────────────────┘│  ││
│  └──────────────────┘                  │  └─────────────────────────────────┘  ││
│  ┌──────────────────┐                  │                                       ││
│  │ 🤖 MCP Server    │◀─────────────────┼───────────────────────────────────────┘│
│  │   (AI Agents)    │                  │                                        │
│  └──────────────────┘                  └────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Tenant Vault System

Each user gets an isolated "vault" - a secure, encrypted storage space for their content.

```typescript
interface Tenant {
  id: string;                    // uuid
  email: string;
  plan: 'free' | 'pro' | 'team';
  createdAt: Date;
  settings: TenantSettings;
}

interface TenantVault {
  tenantId: string;
  storageProvider: 'supabase' | 's3' | 'r2';  // Cloud storage
  storagePath: string;           // Isolated path per tenant
  encryptionKey: string;         // At-rest encryption
  quotaUsedMB: number;
  quotaLimitMB: number;
}

interface VaultNote {
  id: string;
  tenantId: string;
  path: string;                  // Virtual path (e.g., "inbox/my-idea.md")
  content: string;               // Encrypted markdown
  frontmatter: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  embeddings?: number[];         // Vector for semantic search
}
```

**Storage Options:**

| Provider | Pros | Cons | Cost |
|----------|------|------|------|
| **Supabase Storage** | Integrated with auth, easy | Vendor lock-in | ~$25/mo base |
| **AWS S3** | Battle-tested, cheap | More setup | ~$0.023/GB |
| **Cloudflare R2** | No egress fees | Newer | ~$0.015/GB |

### 2. Input Channels

#### Telegram Bot (Primary)

The Telegram bot becomes a **shared service** where users connect their own integration:

```typescript
// User connects Telegram to CortexDrop
interface TelegramIntegration {
  tenantId: string;
  botToken?: string;           // User brings their own bot (BYOB)
  channelId?: string;          // Or uses shared bot with private channel
  connectionType: 'own_bot' | 'shared_bot';
  webhookUrl: string;          // Per-tenant webhook endpoint
}

// Webhook handler routes to correct tenant
app.post('/webhook/telegram/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const message = req.body;
  
  // Validate tenant owns this integration
  const integration = await getIntegration(tenantId);
  if (!validateSignature(req, integration)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Queue for processing
  await queue.add('process-message', {
    tenantId,
    message,
    source: 'telegram'
  });
  
  res.sendStatus(200);
});
```

**Two Telegram Models:**

| Model | User Experience | Setup | Our Cost |
|-------|-----------------|-------|----------|
| **Shared Bot** | User adds @CortexDropBot to private channel | 1-click | We manage |
| **BYOB (Bring Your Own Bot)** | User creates bot via @BotFather, provides token | Power users | User pays |

#### Web Clipper (Browser Extension)

```typescript
// Chrome/Firefox extension
interface ClipperPayload {
  url: string;
  title: string;
  selectedText?: string;
  fullPage?: string;
  screenshot?: Blob;
  tags?: string[];
  note?: string;
}

// Send to CortexDrop API
async function sendToVault(payload: ClipperPayload) {
  const token = await getAuthToken();  // OAuth or API key
  
  await fetch('https://api.cortexdrop.ai/v1/capture', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
```

#### Mobile App (iOS/Android)

- Share sheet integration (like current iOS shortcuts)
- Voice memo capture
- Photo/receipt capture
- Offline queue → sync when online

#### REST/GraphQL API

For developers and integrations:

```typescript
// OpenAPI spec
POST /v1/capture           // Ingest any content
POST /v1/capture/voice     // Audio file → transcription
POST /v1/capture/document  // PDF/DOCX extraction
POST /v1/capture/url       // Web page extraction

GET  /v1/search            // Full-text search
GET  /v1/search/semantic   // Vector similarity search
GET  /v1/notes             // List notes
GET  /v1/notes/:id         // Get note content
PUT  /v1/notes/:id         // Update note
DELETE /v1/notes/:id       // Delete note

GET  /v1/tags              // List all tags
GET  /v1/tags/:tag/notes   // Notes with tag
```

### 3. Processing Pipeline (Multi-Tenant)

The current pipeline scales with **job queues** and **worker pools**:

```typescript
// Job queue (Bull/BullMQ with Redis)
interface ProcessJob {
  id: string;
  tenantId: string;
  source: 'telegram' | 'api' | 'web' | 'mobile';
  contentType: 'voice' | 'document' | 'url' | 'text' | 'photo';
  payload: any;
  priority: number;        // Pro users get higher priority
  attempts: number;
  createdAt: Date;
}

// Worker processes jobs from queue
const worker = new Worker('process', async (job) => {
  const { tenantId, contentType, payload } = job.data;
  
  // Load tenant config (API keys, preferences)
  const tenant = await getTenant(tenantId);
  
  // Check quota
  if (await isOverQuota(tenantId)) {
    throw new Error('Quota exceeded');
  }
  
  // Process based on content type
  const result = await processContent(contentType, payload, tenant);
  
  // Save to tenant's vault
  await saveToVault(tenantId, result);
  
  // Update embeddings
  await updateEmbeddings(tenantId, result.noteId);
  
  // Track usage
  await trackUsage(tenantId, contentType);
});
```

**Scaling Strategy:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  API Gateway (Cloudflare / AWS ALB)                             │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Web       │    │   Worker    │    │   Worker    │   ...   │
│  │   Server    │───▶│   Pool A    │    │   Pool B    │         │
│  │   (API)     │    │   (voice)   │    │   (docs)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│       │                   │                  │                   │
│       ▼                   ▼                  ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Redis (Job Queue)                         ││
│  │   - High priority queue (Pro users)                          ││
│  │   - Normal priority queue (Free users)                       ││
│  │   - Dead letter queue (failed jobs)                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           PostgreSQL + pgvector (Tenant Data)               ││
│  │   - Notes, frontmatter, paths                                ││
│  │   - Embeddings (pgvector)                                    ││
│  │   - User accounts, billing                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Cloud Storage (S3/R2) - Note Content           ││
│  │   /tenants/{tenant_id}/vault/...                            ││
│  │   /tenants/{tenant_id}/archive/...                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 4. Semantic Search (Per-Tenant)

Each tenant gets their own embedding space:

```sql
-- PostgreSQL with pgvector
CREATE TABLE note_chunks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  note_id UUID NOT NULL REFERENCES notes(id),
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Tenant isolation via RLS
  CONSTRAINT tenant_isolation CHECK (tenant_id IS NOT NULL)
);

-- Row-Level Security for tenant isolation
ALTER TABLE note_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON note_chunks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- Semantic search query (tenant-scoped)
SELECT 
  n.id,
  n.path,
  n.frontmatter,
  c.content as chunk,
  c.embedding <=> $1 as distance
FROM note_chunks c
JOIN notes n ON c.note_id = n.id
WHERE c.tenant_id = $2
  AND c.embedding <=> $1 < 0.5  -- Similarity threshold
ORDER BY distance
LIMIT 10;
```

### 5. Output Channels

#### Web Dashboard

```typescript
// Next.js + React dashboard
interface DashboardFeatures {
  inbox: boolean;           // Unprocessed items
  search: boolean;          // Full-text + semantic
  tags: boolean;            // Tag browser/cloud
  graph: boolean;           // Note connections (future)
  editor: boolean;          // In-browser markdown editor
  settings: boolean;        // Integrations, API keys
}
```

**Dashboard Mockup:**

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 CortexDrop                      🔍 Search...    [Andreas] ▼ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐                                                    │
│  │ 📥 Inbox │  12 new                                           │
│  │ 📚 Notes │  1,247                                            │
│  │ 🏷️  Tags  │  89                                               │
│  │ 📁 Archive│  234                                              │
│  │ ⚡ Recent │                                                   │
│  │ ⚙️  Settings│                                                  │
│  └─────────┘                                                    │
│                 ┌─────────────────────────────────────────────┐ │
│                 │ 📝 Meeting Notes - Data Platform            │ │
│                 │    2025-12-04 • #meeting #project/pai       │ │
│                 │                                             │ │
│                 │ # Meeting Notes                             │ │
│                 │                                             │ │
│                 │ Discussed the multi-tenant architecture...  │ │
│                 │                                             │ │
│                 └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Obsidian Sync (Optional Add-on)

For users who want to keep using Obsidian as their primary interface:

```typescript
interface ObsidianSyncConfig {
  tenantId: string;
  enabled: boolean;
  direction: 'push' | 'pull' | 'bidirectional';
  localVaultPath?: string;      // If using desktop plugin
  conflictResolution: 'remote_wins' | 'local_wins' | 'manual';
  syncInterval: number;         // Minutes
}

// Sync protocol
// 1. Compare note hashes (MD5 of content)
// 2. Identify changes (new, modified, deleted)
// 3. Apply changes based on direction
// 4. Handle conflicts based on setting
```

**Integration Options:**

| Method | Description | User Experience |
|--------|-------------|-----------------|
| **Obsidian Plugin** | Direct sync from desktop | Native feel |
| **Obsidian Remote Vault** | Use CortexDrop as remote vault | Seamless |
| **Export/Import** | Manual ZIP export | Simple |
| **Obsidian Publish** | Read-only web view | Sharing |

#### MCP Server (AI Agent Access)

Expose vault as MCP tools for AI agents:

```typescript
// MCP Server for CortexDrop
const server = new MCPServer({
  name: 'cortexdrop',
  version: '1.0.0',
  tools: [
    {
      name: 'search_vault',
      description: 'Search notes by text or semantic similarity',
      parameters: {
        query: { type: 'string', description: 'Search query' },
        type: { type: 'string', enum: ['text', 'semantic', 'tag'] },
        limit: { type: 'number', default: 10 }
      },
      handler: async ({ query, type, limit }, context) => {
        const tenantId = context.auth.tenantId;
        return await searchVault(tenantId, query, type, limit);
      }
    },
    {
      name: 'get_note',
      description: 'Get full content of a note',
      parameters: {
        noteId: { type: 'string' }
      },
      handler: async ({ noteId }, context) => {
        return await getNote(context.auth.tenantId, noteId);
      }
    },
    {
      name: 'capture',
      description: 'Save new content to the vault',
      parameters: {
        content: { type: 'string' },
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      handler: async (params, context) => {
        return await captureNote(context.auth.tenantId, params);
      }
    }
  ]
});
```

---

## Data Model

### Core Schema

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);

-- Notes (metadata only, content in S3)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  path VARCHAR(1024) NOT NULL,          -- Virtual path
  title VARCHAR(512),
  frontmatter JSONB DEFAULT '{}',
  content_hash VARCHAR(64),              -- For sync
  storage_key VARCHAR(1024),             -- S3 key
  word_count INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, path)
);

-- Tags (denormalized for performance)
CREATE TABLE note_tags (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  tag VARCHAR(255) NOT NULL,
  PRIMARY KEY (note_id, tag)
);

CREATE INDEX idx_note_tags_tenant_tag ON note_tags(tenant_id, tag);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL,             -- telegram, dropbox, obsidian
  config JSONB NOT NULL,                 -- Encrypted credentials
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processing queue history
CREATE TABLE processing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source VARCHAR(50),
  content_type VARCHAR(50),
  status VARCHAR(50),
  note_id UUID REFERENCES notes(id),
  error_message TEXT,
  processing_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking (for billing)
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  period_start DATE NOT NULL,
  notes_created INT DEFAULT 0,
  storage_mb DECIMAL(10,2) DEFAULT 0,
  api_calls INT DEFAULT 0,
  voice_minutes DECIMAL(10,2) DEFAULT 0,
  semantic_searches INT DEFAULT 0,
  
  UNIQUE(tenant_id, period_start)
);
```

### Tenant Isolation

All queries are tenant-scoped using:

1. **Application-level:** Every query includes `WHERE tenant_id = ?`
2. **Row-Level Security:** PostgreSQL RLS as second layer
3. **API middleware:** Validates tenant ownership

```typescript
// Middleware example
async function tenantMiddleware(req, res, next) {
  const tenantId = req.auth.tenantId;
  
  // Set PostgreSQL session variable for RLS
  await db.query(`SET app.current_tenant = '${tenantId}'`);
  
  req.tenantId = tenantId;
  next();
}
```

---

## Pricing Model

### Tiers

| Feature | Free | Pro ($12/mo) | Team ($29/mo per seat) |
|---------|------|--------------|------------------------|
| Notes | 100 | Unlimited | Unlimited |
| Storage | 100 MB | 10 GB | 50 GB |
| Voice minutes/mo | 10 | 120 | 300 |
| Semantic searches/mo | 50 | Unlimited | Unlimited |
| Integrations | Telegram only | All | All + Admin |
| API access | ❌ | ✅ | ✅ |
| Obsidian sync | ❌ | ✅ | ✅ |
| Priority processing | ❌ | ✅ | ✅ |
| MCP Server access | ❌ | ✅ | ✅ |
| Shared vaults | ❌ | ❌ | ✅ |

### Usage-Based Add-ons

| Resource | Free Included | Overage Price |
|----------|---------------|---------------|
| Voice transcription | 10 min/mo | $0.10/min |
| Document processing | 20/mo | $0.05/doc |
| Storage | Per plan | $0.10/GB/mo |

---

## Security Considerations

### Data Protection

```typescript
interface SecurityMeasures {
  // At rest
  storageEncryption: 'AES-256-GCM';    // S3 server-side encryption
  databaseEncryption: 'TDE';            // PostgreSQL TDE
  
  // In transit
  tlsVersion: '1.3';
  apiAuthentication: 'JWT + API Key';
  
  // Access control
  tenantIsolation: 'RLS + App-level';
  apiRateLimiting: true;
  auditLogging: true;
}
```

### Compliance

- **GDPR:** Data export, deletion, portability
- **SOC 2:** (Future) For enterprise customers
- **Data residency:** Option for EU-only storage

### User Data Rights

```typescript
// GDPR endpoints
POST /v1/account/export          // Export all data as ZIP
DELETE /v1/account               // Delete account + all data
GET /v1/account/data-processing  // View processing history
```

---

## Technology Stack

### Recommended Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Next.js 14 + React | SSR, great DX, Vercel deployment |
| **API** | Next.js API Routes or Hono | Edge-ready, TypeScript |
| **Database** | Supabase (PostgreSQL + pgvector) | Managed, auth included |
| **Queue** | Inngest or Trigger.dev | Serverless-friendly |
| **Storage** | Supabase Storage or R2 | Cost-effective |
| **Voice** | OpenAI Whisper API or Deepgram | Quality vs cost tradeoff |
| **Embeddings** | OpenAI text-embedding-3-small | Industry standard |
| **Auth** | Supabase Auth or Clerk | OAuth, magic links |
| **Payments** | Stripe | Subscriptions + usage billing |
| **Hosting** | Vercel + Supabase | Minimal ops |

### Alternative: Self-Hostable Stack

For users who want to self-host:

| Component | Self-Host Option |
|-----------|------------------|
| Database | PostgreSQL + pgvector |
| Queue | Redis + BullMQ |
| Storage | MinIO (S3-compatible) |
| Auth | Keycloak or Authentik |
| Hosting | Docker Compose / K8s |

---

## MVP Roadmap

### Phase 1: Core Platform (4-6 weeks)
- [ ] User auth (Supabase)
- [ ] Note storage (S3)
- [ ] Basic ingestion API
- [ ] Web dashboard (list/view notes)
- [ ] Telegram integration (shared bot)

### Phase 2: Intelligence (4 weeks)
- [ ] Voice transcription
- [ ] Document extraction
- [ ] Semantic search
- [ ] AI tagging

### Phase 3: Integrations (4 weeks)
- [ ] Web clipper extension
- [ ] iOS Share Extension
- [ ] Obsidian sync plugin
- [ ] API documentation

### Phase 4: Growth (Ongoing)
- [ ] Team features
- [ ] MCP server
- [ ] Mobile apps
- [ ] Enterprise features

---

## Competitive Differentiation

| Feature | CortexDrop | Notion | Obsidian | Mem.ai |
|---------|------------|--------|----------|--------|
| **Voice-first capture** | ✅ Native | ❌ | ❌ | ✅ |
| **Telegram integration** | ✅ Core | ❌ | ❌ | ❌ |
| **Local-first option** | ✅ | ❌ | ✅ | ❌ |
| **AI routing** | ✅ | ❌ | ❌ | ✅ |
| **Semantic search** | ✅ | ✅ | Plugin | ✅ |
| **Obsidian compatible** | ✅ | ❌ | N/A | ❌ |
| **Open API** | ✅ | ✅ | ❌ | ❌ |
| **MCP support** | ✅ | ❌ | ❌ | ❌ |
| **Archive management** | ✅ | ❌ | ❌ | ❌ |

**Unique selling points:**
1. **Telegram as UI** - Capture from anywhere, any device
2. **Obsidian bridge** - Not replacing, enhancing existing workflows
3. **MCP-native** - Built for the AI agent era
4. **Voice-first** - Dictate ideas, get structured notes
5. **Archive pipeline** - Documents with naming conventions, not just notes

---

## Open Questions

1. **Pricing validation:** Is $12/mo competitive? Should there be a lifetime deal for early adopters?
2. **Obsidian relationship:** Partner with Obsidian team? Build as official plugin?
3. **Self-host option:** Offer self-hosted version? Open source core?
4. **Mobile apps:** Build native or PWA first?
5. **AI model choice:** Let users bring their own API keys? Use our keys with usage billing?

---

*Last updated: December 4, 2025*

