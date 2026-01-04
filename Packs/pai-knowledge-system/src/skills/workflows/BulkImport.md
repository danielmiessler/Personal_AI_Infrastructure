# Bulk Import Workflow

**Objective:** Import multiple documents or knowledge sources into the knowledge graph in a single operation for rapid knowledge base population.

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification BulkImport PaiKnowledgeSystem
```

**Output to user:**
```
Running the **BulkImport** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Identify Import Sources

**Determine what to import:**

**File-Based Sources:**
- Markdown files (.md)
- Text files (.txt)
- JSON datasets (.json)
- Code repositories
- Documentation folders
- Note exports (Obsidian, Notion, etc.)

**Content Types:**
- Project documentation
- Meeting notes
- Research papers
- Technical specifications
- Personal notes
- Code documentation
- Wiki content

**Get from user:**
1. Source paths or URLs
2. File patterns (e.g., `*.md`, `docs/**/*`)
3. Any metadata or context to add

---

## Step 3: Plan Import Strategy

**Assess import scope:**

```markdown
📋 **Import Plan**

**Sources Identified:**
- [X] markdown files
- [Y] text files
- [Z] JSON files

**Estimated Episodes:** [Total file count]
**Estimated Processing Time:** [File count × ~10 seconds]

**Recommended Approach:**
[Batch size and parallelization strategy]

⚠️ **Warning:** Large imports may consume significant API tokens and take considerable time.

Proceed with import? (Type "yes" to continue)
```

**Batch Size Recommendations:**
- Small import (<50 files): Process all at once
- Medium import (50-200 files): Batches of 50
- Large import (>200 files): Batches of 100

**Concurrency Consideration:**
- SEMAPHORE_LIMIT controls parallel processing
- Lower limit = slower but fewer API errors
- Higher limit = faster but may hit rate limits

---

## Step 4: Prepare File List

**Collect files to import:**

```bash
# Find files by pattern
find /path/to/source -name "*.md" -type f

# Or from specific directory
ls /path/to/docs/*.md

# Or recursive
find /path/to/project -type f \( -name "*.md" -o -name "*.txt" \)
```

**Create import manifest:**
```typescript
const importManifest = [
  {
    path: "/path/to/file1.md",
    name: "Descriptive Episode Name",
    source_description: "Project documentation"
  },
  {
    path: "/path/to/file2.md",
    name: "Another Episode Name",
    source_description: "Meeting notes"
  }
  // ... more files
];
```

---

## Step 5: Execute Import Batches

**Process files in batches:**

```typescript
// For each batch of files
for (const batch of batches) {
  for (const file of batch) {
    // Read file content
    const content = await readFile(file.path);

    // Create episode
    await add_episode({
      name: file.name || generateNameFromPath(file.path),
      episode_body: content,
      source_description: file.source_description || `Imported from ${file.path}`,
      source: determineSourceType(file.path)
    });
  }

  // Brief pause between batches to avoid rate limits
  await sleep(2000);
}
```

**Source type detection:**
```typescript
function determineSourceType(path) {
  if (path.endsWith('.json')) return 'json';
  if (path.includes('meeting') || path.includes('conversation')) return 'messages';
  return 'text';  // Default
}
```

---

## Step 6: Monitor Progress

**Track import progress:**

```markdown
📊 **Import Progress**

**Batch [X] of [Y]**
✓ Processed: [current] / [total] files
🔄 Current: [filename]
⏱️  Time: [elapsed] / [estimated]

**Success Rate:**
✓ Successful: [X]
✗ Failed: [Y]
⏳  Pending: [Z]

**API Usage:**
- Estimated tokens used: [X]
- Rate limit warnings: [Y]

[Progress bar: ████░░░░░░ 40%]
```

**Handle failures gracefully:**
```typescript
try {
  await add_episode({...});
  successCount++;
} catch (error) {
  failedCount++;
  failures.push({
    file: file.path,
    error: error.message
  });
}
```

---

## Step 7: Present Import Results

**Summarize import operation:**

```markdown
✅ **Bulk Import Complete**

**Import Summary:**

**Files Processed:** [Total]
- ✓ Successfully imported: [X]
- ✗ Failed: [Y]
- ⏭️  Skipped: [Z]

**Episodes Created:** [Successful count]

**Knowledge Added:**
- New Entities: [Approximate count]
- New Relationships: [Approximate count]

**Time Taken:** [Duration]
**Average Speed:** [Files per minute]

---

**Failed Imports:**
[If any failures, list them with error reasons]

1. [file path]
   Error: [error message]
   Suggestion: [how to fix]

---

**💡 Next Steps:**

1. **Verify Import Quality**
   → Use SearchKnowledge to test retrieval
   → Use GetRecent to see what was added

2. **Explore Your Knowledge**
   → Search for topics you just imported
   → Check relationships between concepts

3. **Fill Gaps**
   → Manually capture missing context
   → Add connections between episodes

🎉 Your knowledge base now has [X] episodes to work with!
```

---

## Best Practices

**File Organization:**
- Use descriptive filenames that become episode names
- Group related files together
- Include metadata in front matter if supported
- Clean up formatting before importing

**Content Preparation:**
- Remove duplicate content
- Fix broken links/references
- Add context where missing
- Standardize formatting

**Import Strategy:**
- Start with highest-value documents
- Import in priority order
- Test with small batch first
- Monitor API usage and rate limits

**Episode Naming:**
```typescript
// Good names
"PAI_Skill_Canonical_Structure"
"Graphiti_MCP_Server_Setup"
"Podman_Volume_Mounting_Procedure"

// Bad names
"doc1"
"import_12345"
"notes"
```

---

## Import Patterns

**Project Documentation:**
```typescript
// Import all markdown from a project
const docs = await find('/project/docs', '*.md');
docs.forEach(doc => {
  add_episode({
    name: doc.basename,
    episode_body: doc.content,
    source_description: `Project documentation: ${doc.path}`
  });
});
```

**Meeting Notes:**
```typescript
// Import meeting notes with temporal context
const meetings = await find('/notes/meetings', 'meeting-*.md');
meetings.forEach(meeting => {
  const date = extractDateFromFilename(meeting.name);
  add_episode({
    name: `Meeting: ${meeting.basename}`,
    episode_body: meeting.content,
    source_description: `Meeting notes from ${date}`,
    reference_date: date
  });
});
```

**Research Papers:**
```typescript
// Import academic papers or research
const papers = await find('/research/papers', '*.pdf.txt');
papers.forEach(paper => {
  add_episode({
    name: `Paper: ${paper.title}`,
    episode_body: paper.content,
    source_description: `Research paper: ${paper.authors}`
  });
});
```

**Code Documentation:**
```typescript
// Import README files from code repositories
const readmes = await find('/projects', '*/README.md');
readmes.forEach(readme => {
  const project = readme.dirname;
  add_episode({
    name: `${Project}_Documentation`,
    episode_body: readme.content,
    source_description: `Project README: ${project}`
  });
});
```

---

## Content Quality Tips

**Before Import:**
✅ Remove boilerplate text
✅ Fix broken formatting
✅ Standardize date formats
✅ Resolve broken links
✅ Add missing context
✅ Deduplicate content

**After Import:**
- Search for topics to verify retrieval
- Check entity extraction quality
- Identify gaps in coverage
- Manually add missing connections
- Update failed imports

---

## Error Handling

**Common Import Failures:**

**File Not Readable:**
```markdown
Error: Cannot read file [path]

Solution: Check file permissions and encoding
```

**Content Too Large:**
```markdown
Error: Episode body exceeds token limit

Solution: Split into multiple episodes
- Part 1: Overview and context
- Part 2: Technical details
- Part 3: Examples and usage
```

**API Rate Limit:**
```markdown
Error: 429 Too Many Requests

Solution:
1. Reduce batch size
2. Increase delay between batches
3. Lower SEMAPHORE_LIMIT
4. Wait and retry failed imports
```

**Poor Entity Extraction:**
```markdown
Warning: Low entity extraction quality

Solution:
- Content may be too brief or vague
- Consider adding more context
- Split into more focused episodes
- Manually supplement with targeted captures
```

---

## Performance Optimization

**Import Speed:**

```typescript
// Fast import (may hit rate limits)
SEMAPHORE_LIMIT: 20
Batch size: 100
Delay: 1s

// Balanced import (recommended)
SEMAPHORE_LIMIT: 10
Batch size: 50
Delay: 2s

// Safe import (slow but reliable)
SEMAPHORE_LIMIT: 5
Batch size: 25
Delay: 5s
```

**API Cost Estimation:**

Rough calculation:
- 1 page ≈ 500 tokens
- Processing ≈ 1000 tokens per page (LLM overhead)
- 100 pages ≈ 100,000 tokens ≈ $0.10 (gpt-4o-mini)

Budget accordingly for large imports.

---

## Alternative: Incremental Import

**Instead of bulk import, consider:**

```markdown
🔄 **Incremental Import Strategy**

Import documents gradually over time:

**Week 1:** Core documentation and procedures
**Week 2:** Meeting notes and decisions
**Week 3:** Research and references
**Week 4:** Archive materials

**Benefits:**
- Spreads API cost over time
- Allows quality checking between batches
- Knowledge graph evolves organically
- Can adjust strategy based on early results
```

---

## Post-Import Verification

**Quality Checks:**

```markdown
**Verify Import Success:**

1. **Search Test**
   → Search for key topics from imported docs
   → Check if results are relevant

2. **Recent Episodes Check**
   → Use GetRecent to see imports
   → Verify episode names are descriptive

3. **Relationship Check**
   → Use SearchFacts for key entities
   → Confirm relationships were created

4. **Coverage Review**
   → Are all major topics represented?
   → Any gaps that need filling?

If issues found, consider re-importing problematic content.
```

---

**Related Workflows:**
- `CaptureEpisode.md` - Manual import of individual items
- `GetRecent.md` - Verify what was imported
- `SearchKnowledge.md` - Test retrieval of imported knowledge
- `GetStatus.md` - Check system health before large import
