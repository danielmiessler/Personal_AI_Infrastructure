# Clear Graph Workflow

**Objective:** Completely clear all knowledge from the graph, deleting all entities, relationships, and episodes, then rebuild indices. **DESTRUCTIVE OPERATION - cannot be undone.**

---

## ⚠️ CRITICAL WARNING

**THIS IS A DESTRUCTIVE OPERATION**

- **ALL** knowledge will be permanently deleted
- **ALL** entities will be removed
- **ALL** relationships will be destroyed
- **ALL** episodes will be deleted
- **Cannot be undone** without backups

**Only perform this operation if:**
- Starting fresh with a new knowledge domain
- Graph is corrupted and needs reset
- Switching to completely different use case
- Explicitly requested by user

---

## Step 1: Announce Workflow

```bash
~/.claude/Tools/SkillWorkflowNotification ClearGraph PaiKnowledgeSystem
```

**Output to user:**
```
Running the **ClearGraph** workflow from the **PaiKnowledgeSystem** skill...
```

---

## Step 2: Confirm User Intent

**EXPLICIT CONFIRMATION REQUIRED**

Before proceeding, user must clearly state they want to clear the graph.

**Acceptable confirmations:**
- "Yes, clear it"
- "Confirm clear graph"
- "I understand, proceed with clearing"
- "Delete all knowledge"

**Unacceptable (ambiguous):**
- "ok"
- "sure"
- "go ahead"
- "do it"

**If confirmation not clear:**
```markdown
⚠️ **CONFIRMATION REQUIRED**

You are about to **PERMANENTLY DELETE** all knowledge from your graph.

This will remove:
- [Count] entities
- [Count] relationships
- [Count] episodes

**This operation CANNOT be undone.**

To confirm, type: **"Yes, clear the graph"**
To cancel, type: **"Cancel"**
```

---

## Step 3: Show What Will Be Lost

**Before clearing, display summary:**

```markdown
📋 **Knowledge Graph Summary**

**Current Contents:**

**Entities:** [Total count]
- Preferences: [X]
- Procedures: [X]
- Locations: [X]
- Events: [X]
- Organizations: [X]
- Documents: [X]
- Other: [X]

**Relationships:** [Total count]
**Episodes:** [Total count]

**Most Recent Knowledge:**
1. [Episode name] — [Date]
2. [Episode name] — [Date]
3. [Episode name] — [Date]

**Knowledge Domains:**
- [Domain 1] — [X] episodes
- [Domain 2] — [Y] episodes
- [Domain 3] — [Z] episodes

⚠️ **ALL OF THIS WILL BE PERMANENTLY DELETED**
```

---

## Step 4: Suggest Backup (Optional)

**Offer backup opportunity:**

```markdown
💾 **Backup Recommendation**

Before clearing, consider backing up your knowledge:

**Option 1: Export Recent Episodes**
- Use GetRecent with high limit
- Save output to file
- Can manually re-add important knowledge later

**Option 2: Podman Volume Backup**
```bash
# Stop container
podman stop graphiti-knowledge-graph-mcp

# Backup volume
podman volume inspect graphiti-data  # Find volume location
cp -r [volume_path] [backup_location]

# Restart container
podman start graphiti-knowledge-graph-mcp
```

**Option 3: Proceed without backup**
- If you're sure, continue to clear

Do you want to create a backup before clearing?
```

---

## Step 5: Execute Clear Operation

**After explicit confirmation:**

```typescript
// Use the clear_graph tool
clear_graph({})
```

**This operation:**
1. Deletes all entities from the graph
2. Deletes all relationships/edges
3. Deletes all episodes
4. Rebuilds indices
5. Resets graph to initial state

**Expected duration:**
- Small graphs (<1000 entities): <10 seconds
- Medium graphs (1000-10000): 10-60 seconds
- Large graphs (>10000): 1-5 minutes

---

## Step 6: Confirm Clear Operation

**Verify successful clear:**

```markdown
✅ **Knowledge Graph Cleared**

**All knowledge has been permanently deleted:**
- ✓ Entities deleted
- ✓ Relationships deleted
- ✓ Episodes deleted
- ✓ Indices rebuilt

**Current Status:**
- Total Entities: 0
- Total Relationships: 0
- Total Episodes: 0

**Knowledge graph is ready for fresh knowledge capture.**

💡 **Next Steps:**
1. Capture new knowledge using CaptureEpisode
2. Import documents using BulkImport
3. Start building your new knowledge base

---
🕊️ *In memoriam: [X] entities, [Y] relationships, [Z] episodes served*
```

---

## Error Handling

**If Clear Fails:**

```markdown
❌ **Clear Operation Failed**

**Error:** [Error message from MCP tool]

**Possible causes:**
1. Database connection lost
2. Server not responding
3. Insufficient permissions
4. Graph locked by another operation

**Troubleshooting:**
1. Check server status: GetStatus
2. Verify database connectivity
3. Check container logs: podman logs graphiti-knowledge-graph-mcp
4. Retry after resolving issue

⚠️ Graph may be in partial state. Verify status before proceeding.
```

---

## Post-Clear Actions

**Immediate Next Steps:**

```markdown
🎯 **Building Your Fresh Knowledge Base**

**Quick Start:**
1. Capture your current work/context
   → "Remember that I'm working on [project]"
   → "Log my current setup: [configuration details]"

2. Import recent documents
   → Use BulkImport for important files
   → Focus on high-value knowledge

3. Capture recurring patterns
   → Procedures you use regularly
   → Preferences and decisions
   → Project documentation

**Suggested First Captures:**
- Current project context and goals
- Development environment setup
- Key decisions and rationale
- Team structure and contacts
- Important workflows and procedures

💡 The knowledge graph compounds over time. Start capturing today!
```

---

## When to Use Clear Graph

**Appropriate Use Cases:**

✅ **Starting New Project**
- Switching to completely different domain
- Want clean slate for new initiative

✅ **Graph Corruption**
- Data inconsistencies that can't be fixed
- Entity extraction producing garbage results

✅ **Testing/Development**
- Testing knowledge capture workflows
- Development environment resets

✅ **Privacy Cleanup**
- Remove sensitive information
- Clean before sharing system

**Inappropriate Use Cases:**

❌ **Too Much Knowledge**
- Use topic filtering or multiple group_ids instead
- Consider archiving old knowledge to separate namespace

❌ **Poor Quality Knowledge**
- Use delete_episode for specific bad episodes
- Use delete_entity_edge for specific bad relationships

❌ **Performance Issues**
- Tune SEMAPHORE_LIMIT and model settings first
- Consider database optimization before clearing

❌ **Accidental Captures**
- Delete specific episodes instead
- Much more surgical than full clear

---

## Alternative: Selective Cleanup

**Before clearing, consider these alternatives:**

**Delete Specific Episodes:**
```typescript
// Remove bad episodes without clearing everything
delete_episode({
  episode_uuid: "specific-episode-uuid"
})
```

**Delete Specific Relationships:**
```typescript
// Remove incorrect relationships
delete_entity_edge({
  edge_uuid: "specific-edge-uuid"
})
```

**Use Multiple Group IDs:**
```typescript
// Keep old knowledge, start fresh in new namespace
group_id: "project-2"  // Instead of clearing "main"
```

---

## Recovery Options

**If you cleared by mistake:**

**Option 1: Restore from Volume Backup**
```bash
# Stop container
podman stop graphiti-knowledge-graph-mcp

# Restore backup
podman volume rm graphiti-data
podman volume create graphiti-data
cp -r [backup_location]/* [volume_path]/

# Restart
podman start graphiti-knowledge-graph-mcp
```

**Option 2: Recapture from Other Sources**
- Check if episodes were exported before clear
- Look for knowledge in other systems (notes, docs)
- Use BulkImport to rebuild from documents
- Manually re-capture critical knowledge

**Option 3: Accept and Rebuild**
- Knowledge graph improves over time
- Second time around is often better organized
- Focus on capturing highest-value knowledge first

---

## Safety Checklist

Before executing clear_graph:

- [ ] User has provided explicit confirmation
- [ ] User understands this is permanent
- [ ] User has seen what will be deleted
- [ ] Backup was offered (user may decline)
- [ ] No better alternative (selective delete, new group_id)
- [ ] Server and database are operational
- [ ] No other operations are running

---

**Related Workflows:**
- `GetStatus.md` - Check before clearing
- `GetRecent.md` - Review what will be lost
- `CaptureEpisode.md` - Start adding knowledge after clear
- `BulkImport.md` - Quickly rebuild knowledge base
