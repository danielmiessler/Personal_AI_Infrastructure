# B2E Document Processing Pipeline - Product Exploration

> Exploring enterprise document intelligence as a separate product opportunity

## The Opportunity

Your existing infrastructure already handles:
- ✅ Multi-format document extraction (PDF, DOCX, images)
- ✅ AI-powered classification and routing
- ✅ Structured metadata extraction
- ✅ Archive naming conventions (`{TYPE} - {DATE} - {Description} - {CATEGORY}`)
- ✅ Cloud sync (Dropbox)
- ✅ Receipt/invoice OCR with amount extraction

**This is 80% of an enterprise document processing product.**

---

## B2E vs B2C Positioning

| Aspect | B2C (CortexDrop) | B2E (New Product) |
|--------|------------------|-------------------|
| **Target** | Knowledge workers, PKM enthusiasts | Finance teams, Legal, Operations |
| **Use Case** | Personal notes, voice memos, clips | Contracts, invoices, agreements |
| **Value Prop** | "Boost your recall" | "Never lose a document, always audit-ready" |
| **Pricing** | $12/mo per user | $500-5000/mo per org |
| **Volume** | ~100 docs/month | ~1000+ docs/month |
| **Compliance** | Nice to have | Must have |
| **Integration** | Telegram, Obsidian | Xero, MYOB, Salesforce, Slack |

---

## B2E Product Concept

### Problem Statement

**For SMBs and growing companies:**
- Financial documents scattered across email, Dropbox, Google Drive
- No consistent naming or organization
- Can't find contracts when needed
- Audit prep is painful (weeks of searching)
- Manual data entry from invoices/receipts
- No visibility into document status or expiry

### Solution: Intelligent Document Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE DOCUMENT INTELLIGENCE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT CHANNELS                        PROCESSING                           │
│  ┌──────────────────┐                 ┌─────────────────────────────────┐  │
│  │ 📧 Email Forward │──┐              │  ┌─────────────┐                │  │
│  │ (invoices@...)   │  │              │  │ CLASSIFY    │                │  │
│  └──────────────────┘  │              │  │ Contract    │                │  │
│  ┌──────────────────┐  │              │  │ Invoice     │                │  │
│  │ 📁 Dropbox/GDrive│──┼──────────────┼─▶│ Agreement   │                │  │
│  │   Watch Folder   │  │              │  │ Receipt     │                │  │
│  └──────────────────┘  │              │  │ Statement   │                │  │
│  ┌──────────────────┐  │              │  └──────┬──────┘                │  │
│  │ 🔌 API Upload    │──┤              │         │                        │  │
│  │                  │  │              │         ▼                        │  │
│  └──────────────────┘  │              │  ┌─────────────┐                │  │
│  ┌──────────────────┐  │              │  │ EXTRACT     │                │  │
│  │ 📱 Mobile App    │──┤              │  │ • Vendor    │                │  │
│  │   (Receipt Snap) │  │              │  │ • Amount    │                │  │
│  └──────────────────┘  │              │  │ • Date      │                │  │
│  ┌──────────────────┐  │              │  │ • Parties   │                │  │
│  │ 💬 Slack/Teams   │──┘              │  │ • Terms     │                │  │
│  │   Bot           │                  │  │ • Expiry    │                │  │
│  └──────────────────┘                 │  └──────┬──────┘                │  │
│                                       │         │                        │  │
│  OUTPUT                               │         ▼                        │  │
│  ┌──────────────────┐                 │  ┌─────────────┐                │  │
│  │ 📊 Dashboard     │◀────────────────┼──│ ORGANIZE    │                │  │
│  │ Search, Filter   │                 │  │ Auto-name   │                │  │
│  └──────────────────┘                 │  │ Tag         │                │  │
│  ┌──────────────────┐                 │  │ Archive     │                │  │
│  │ 🔗 Integrations  │◀────────────────┼──│ Alert       │                │  │
│  │ Xero, MYOB, etc  │                 │  └─────────────┘                │  │
│  └──────────────────┘                 └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. **Intelligent Classification**
```
Input: Random PDF attachment
Output: {
  type: "CONTRACT",
  subtype: "Service Agreement",
  confidence: 0.94,
  suggestedCategory: "VENDOR"
}
```

#### 2. **Data Extraction**
```
Input: Invoice PDF
Output: {
  vendor: "Xero Limited",
  invoiceNumber: "INV-2025-001234",
  amount: 299.00,
  currency: "NZD",
  dueDate: "2025-01-15",
  lineItems: [...],
  gstAmount: 39.00
}
```

#### 3. **Smart Naming & Organization**
```
Input: "document.pdf" (unnamed invoice)
Output: "INVOICE - 20251204 - Xero Limited (Monthly Subscription, $299) - SOFTWARE.pdf"
```

#### 4. **Contract Intelligence**
- Expiry date tracking & alerts
- Auto-renewal detection
- Key terms extraction
- Party identification
- Amendment tracking

#### 5. **Audit Trail**
- Every document timestamped
- Processing history logged
- Search across all documents
- Export for auditors

---

## Product Name Ideas

### Professional/Enterprise Feel

| Name | Domain Check | Concept |
|------|--------------|---------|
| **DocPipe** | Check .ai, .com, .co.nz | Document + Pipeline |
| **PaperTrail** | Likely taken | Audit trail reference |
| **DocIngest** | Check | Direct/technical |
| **ArchiveFlow** | Check | Flow + Archive |
| **DocRoute** | Check | Routing emphasis |
| **ParseDocs** | Check | Technical, parsing |
| **DocVault** | Check | Security emphasis |
| **IngestHub** | Check | Central hub concept |

### Finance-Specific

| Name | Domain Check | Concept |
|------|--------------|---------|
| **FinDocs** | Check | Finance + Documents |
| **LedgerFlow** | Check | Accounting reference |
| **InvoiceIQ** | Check | Invoice intelligence |
| **ReceiptFlow** | Check | Receipt automation |
| **ExpenseCapture** | Check | Expense management |

### Contract-Specific

| Name | Domain Check | Concept |
|------|--------------|---------|
| **ContractPipe** | Check | Contract pipeline |
| **AgreementHub** | Check | Central agreements |
| **SignedDocs** | Check | Executed documents |
| **ContractVault** | Check | Secure contracts |

### Modern/Tech

| Name | Domain Check | Concept |
|------|--------------|---------|
| **DocLayer** | Check | AI layer reference |
| **ParseLayer** | Check | Processing layer |
| **IngestAI** | Check | AI-powered ingest |
| **DocMind** | Check | Intelligence |

---

## Market Validation

### Target Customers (NZ/AU Focus)

1. **Accounting Firms** (500+ in NZ)
   - Pain: Client document chaos
   - Value: Auto-organize client docs by entity

2. **Law Firms** (1000+ in NZ)
   - Pain: Contract management
   - Value: Never miss a renewal, instant search

3. **Property Management** (growing market)
   - Pain: Lease tracking, tenant docs
   - Value: Expiry alerts, compliance docs

4. **Construction/Trades**
   - Pain: Receipts, invoices, compliance certs
   - Value: GST-ready expense tracking

5. **SMB Finance Teams**
   - Pain: Month-end doc hunting
   - Value: Everything organized, audit-ready

### Competitive Landscape

| Competitor | Focus | Gap |
|------------|-------|-----|
| **Dext (Receipt Bank)** | Expense receipts | No contracts, limited doc types |
| **Hubdoc** | Bookkeeper workflow | Xero-only, no contract mgmt |
| **DocuSign** | Signing | No document intelligence |
| **PandaDoc** | Proposals/contracts | No financial doc processing |
| **Dropbox** | Storage | No intelligence, manual org |

**Gap in market:** Unified document intelligence across ALL business document types.

---

## Technical Leverage

### What You Already Have

```typescript
// Existing capabilities to reuse:
- processDocument()     // PDF/DOCX extraction
- generateArchiveName() // Smart naming
- detectDocumentType()  // AI classification  
- extractIntent()       // LLM-based parsing
- syncToDropbox()       // Cloud sync
- searchArchive()       // Archive search
```

### What to Add for B2E

```typescript
// New B2E capabilities needed:
- Multi-tenant isolation
- Team/org management
- Webhook integrations (Xero, MYOB, Slack)
- Email ingestion (receive@yourdomain.com)
- Audit logging
- Retention policies
- Role-based access control
- API for integrations
- Contract expiry tracking
- Dashboard UI
```

---

## Go-to-Market

### Phase 1: MVP (4-6 weeks)
- Email forwarding ingestion
- PDF/image processing
- Auto-naming & organization
- Simple web dashboard
- Dropbox/Google Drive sync

### Phase 2: Integrations (4 weeks)
- Xero integration (NZ market leader)
- Slack notifications
- API access

### Phase 3: Contract Intelligence (4 weeks)
- Expiry tracking
- Key terms extraction
- Renewal alerts

### Pricing Model

| Tier | Price (NZD) | Docs/month | Features |
|------|-------------|------------|----------|
| **Starter** | $49/mo | 100 | Basic processing, 1 user |
| **Business** | $199/mo | 500 | Team (5), integrations |
| **Professional** | $499/mo | 2000 | Unlimited users, API, priority |
| **Enterprise** | Custom | Unlimited | SSO, dedicated support |

---

## Domain Research Results

### 🏆 TOP PICK: PaperIQ

| Domain | Status | Price | Notes |
|--------|--------|-------|-------|
| **paperiq.ai** | ✅ Available | **$71.98** | Standard price! |
| **paperiq.com** | 💰 Premium | **$990** | Affordable premium for B2E! |
| paperiq.io | ✅ Available | ~$25 | Alt TLD |

**Why PaperIQ works for B2E:**
- "Paper" = Documents (invoices, contracts, receipts)
- "IQ" = Intelligence (AI-powered processing)
- Professional feel, not too techy
- Memorable and brandable
- Affordable to secure both .ai and .com

### ✅ Available B2E Domains

| Name | .ai | .com | Notes |
|------|-----|------|-------|
| **paperiq** | ✅ $72 | 💰 $990 | 🏆 TOP PICK |
| **docpipe** | ✅ $72 | 💰 $3,995 | Good but .com expensive |
| **parsedocs** | ✅ $72 | ❌ Taken | .ai only available |

### ❌ Taken B2E Domains

| Name | Status |
|------|--------|
| ledgerflow.ai | Taken |
| docintel.ai | Taken |
| parsedocs.com | Taken |

### Regional (.nz / .au)

For NZ/AU regional presence, check separately via:
- **NZ:** [dnc.org.nz/whois](https://dnc.org.nz/whois/) or [Freeparking](https://www.freeparking.co.nz/)
- **AU:** [ausregistry.com.au](https://www.ausregistry.com.au/) or [VentraIP](https://ventraip.com.au/)

---

## Decision: One Product or Two?

### Option A: Single Brand, Two Tiers
- **CortexDrop Personal** - B2C ($12/mo)
- **CortexDrop Business** - B2E ($199+/mo)
- Pros: Unified brand, shared tech
- Cons: Confusing positioning

### Option B: Separate Brands (Recommended)
- **CortexDrop** - Personal knowledge (B2C)
- **PaperIQ** - Business documents (B2E)
- Pros: Clear positioning, different GTM
- Cons: Split focus, two brands to build

### Recommendation: **Option B with PaperIQ**

The use cases are different enough that separate brands make sense:
- **CortexDrop** (B2C): Voice memos, articles, ideas → *"Drop ideas into your cortex"*
- **PaperIQ** (B2E): Invoices, contracts, compliance → *"Intelligence for your paperwork"*

**Domain Strategy:**
| Product | Primary | Secondary | Total Investment |
|---------|---------|-----------|------------------|
| CortexDrop | cortexdrop.ai ($72) | cortexdrop.com ($7) | **~$80** |
| PaperIQ | paperiq.ai ($72) | paperiq.com ($990) | **~$1,062** |

---

## Next Steps

1. [x] Check domain availability for B2E names ✅ **PaperIQ available!**
2. [ ] Secure domains: paperiq.ai ($72) + paperiq.com ($990)
3. [ ] Validate problem with 5-10 NZ SMB finance people
4. [ ] Build MVP landing page for PaperIQ
5. [ ] Create demo video showing document processing
6. [ ] Soft launch to accountant network

---

## Summary: Two-Product Strategy

| Product | Target | Domain | Tagline |
|---------|--------|--------|---------|
| **CortexDrop** | Individuals (B2C) | cortexdrop.ai/.com | *"Your AI-powered second brain"* |
| **PaperIQ** | Businesses (B2E) | paperiq.ai/.com | *"Intelligence for your paperwork"* |

Both products share the same core tech but have distinct positioning and GTM strategies.

---

*Created: December 4, 2025*
*Updated: December 4, 2025 - Domain research completed*

