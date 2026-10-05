---
name: PhoneCalls
version: 1.0.0
description: "Place and follow up real phone calls to businesses through the Call4me remote MCP: reservations, appointments, availability and price questions, callbacks, and live handoff to the user. USE WHEN call a business, phone a restaurant, book by phone, call and ask, make a phone call for me, check on a call, did they call back, set up Call4me. NOT FOR personal numbers, emergency or premium rate numbers, telemarketing or surveys, or writing calendar events."
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/PhoneCalls/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.


## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the PhoneCalls skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **PhoneCalls** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# PhoneCalls

Places paid, real phone calls to businesses on the user's behalf through the Call4me remote MCP server (`https://call4.me/mcp`). A voice caller dials the business, asks back during the call when it needs a fact, can ring the user in for identity checks, and returns an outcome plus transcript. The live contract is https://call4.me/.well-known/agent-skills/call4me/SKILL.md and the calling rules are https://call4.me/rules. read again them when a tool or field here does not match what the server exposes.

## Tool contract

The published tool names are `call4me_get_balance`, `call4me_get_profile`, `call4me_save_profile`, `call4me_get_requirements`, `call4me_place_call`, `call4me_get_call`, `call4me_answer_question`, `call4me_connect_me`, `call4me_hang_up`, `call4me_list_calls`, `call4me_schedule_call`, `call4me_cancel_scheduled_call`, `call4me_add_funds`. MCP clients expose them under their own prefix, so list the connected server's tools and call the exposed names with the exposed schemas. No CLI wrapper exists on purpose: the MCP server is the interface.

## Workflow Routing

When routing, output: `Running the **WorkflowName** workflow in the **PhoneCalls** skill to ACTION...`

| Workflow | Trigger | File |
|----------|---------|------|
| **Setup** | "set up Call4me", "connect phone calling", "what number do you call from", first use with no authenticated server | `Workflows/Setup.md` |
| **Call** | "call the restaurant and book", "phone them and ask", "book this by phone", "call them Monday at 9" | `Workflows/Call.md` |
| **Check** | "did they call back", "what happened on that call", "check my call", "any update from the business" | `Workflows/Check.md` |

## Examples

**Example 1: Restaurant booking**
```
User: "Call <restaurant> and book a table for 4 Friday around 7, 6:30 to 8 is fine"
→ Invokes Call workflow
→ Confirms the location's number, checks balance right before the call, gets restaurant requirements, asks for any missing fields in one message
→ Places the call, polls until finished, answers open questions from what the user gave
→ Reports the outcome as the tool returned it (time, name on booking, any confirmation), or what is still unresolved
```

**Example 2: Service availability question**
```
User: "Ask <shop> if they can do an oil change on my car this week and what it costs"
→ Invokes Call workflow, picks the auto service category from the task, and passes it to get_requirements
→ Collects only the vehicle details get_requirements returns as required
→ Reports the quoted availability and price exactly as stated on the call
```

**Example 3: Checking a callback**
```
User: "Did the dentist ever call back about my appointment?"
→ Invokes Check workflow
→ Reads the original call (by id or via list_calls), including its callbacks and their outcomes
→ Reports one state (scheduled, in progress, goal resolved, goal unmet, callback pending, unresolved/expired, or call failed) with evidence from the tool result
```

## Gotchas

- **Calls cost money.** Check balance before every call and quote prices only from the returned balance/rate fields. Never call `add_funds` unprompted; if the user asks for it, hand them the checkout link and nothing more.
- **The published skill may not list `max_minutes`; the exposed schema decides.** If the exposed `place_call` schema (or `schedule_call`, only if its schema shows it too) offers it, use a talk time cap in whole minutes. Never put a currency amount into `max_minutes`. For a money budget, determine an affordable minute cap from the actual destination rate returned by `get_balance`; if the rate is unclear, ask for a time cap. Never exceed the user's limit or invent a spend authorization.
- **"Not calling yet" means no call was placed.** Ask the user exactly what the response lists, then retry. Do not report the call as in progress.
- **The balance `numbers` list is not the selected caller.** A listed number matching the business's country does not prove that number will dial, especially when several numbers or the user's own verified line exist. The caller is known only from the call's returned `calling_number`, or from an explicit user choice passed through a caller selection field the exposed schema actually has. Null `phone_number` with empty `numbers` is normal before the first call; never invent or predict a number.
- **Calls needing an account PIN cannot be scheduled.** Place them live.
- **`calling_number` ≠ the user's profile phone.** `calling_number` (per call, may differ by country) is what businesses and the user see as the caller. The profile `phone` is where Call4me rings the user. Mixing them up makes the user ignore the handoff ring.
- **`open_questions` are time sensitive.** The business is on the line waiting. Answer from facts the user already gave, or ask the user right away. Never make up an answer.
- **Voicemail or "we'll call you back" is not completion.** The callback reaches the call's `calling_number`, where Call4me can finish the task if the business calls back within 14 days. A call placed with `own_number` gave the business the user's own number, so the callback rings the user, not Call4me. Never promise completion; it depends on the callback and its actual outcome. Follow up via Check on the original call id.
- **Judge the outcome against the user's goal, not the telephony.** Answered or `finished` does not mean the goal was achieved. A clear answer to an information question is the goal met even when the answer is "no" (e.g. confirmed out of stock). No availability, a refusal, or a wrong business on a booking is an unmet goal with its specific reason, not a call failure. "Call failed" needs explicit telephony or tool failure evidence.
- **Missing tool, schema mismatch, or failed auth is an explicit error.** Report it and route to Setup; never pretend a call was placed or simulate a result.
- **Only call businesses the user wants to reach.** No personal numbers, emergency or premium rate numbers, telemarketing, surveys, collections, or pretending to be the user (https://call4.me/rules).
- **Transcripts can hold sensitive details.** Summarize what matters; keep transcript content out of logs, commits, and shared evidence.

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"PhoneCalls","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```

Replace `WORKFLOW_USED` with the workflow executed, `8_WORD_SUMMARY` with a brief input description (no phone numbers, names, or call ids), and `SECONDS` with approximate elapsed time. Log `status: "error"` if the workflow failed.
