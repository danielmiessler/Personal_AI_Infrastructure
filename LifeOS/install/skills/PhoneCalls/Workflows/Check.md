# Check

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Check workflow in the PhoneCalls skill to check a call outcome"}' \
  > /dev/null 2>&1 &
```

Running **Check** in **PhoneCalls**...

---

**Deliverable:** the current state of a call the user asked about, classified as exactly one state from the table below, with the evidence from the tool result behind that label. Use the exposed tool names discovered in Setup.

## Find the call

- Use the call id the user gives. Otherwise `call4me_list_calls` (scheduled calls first, then recent, newest first) and confirm which one they mean.
- `call4me_get_call` on the **original** call id. It lists callbacks and their outcomes; a `sched_` id shows when it dials and, once it has, the call itself.

## Still live

If the call has `open_questions` or needs a handoff, handle it exactly as in `Workflows/Call.md` § Follow.

## Classify

Read state from whatever the returned result actually contains; do not assume field names the schema does not show.

| State | Evidence required |
|-------|-------------------|
| Scheduled (not dialed) | A `sched_` id whose result shows a future dial time and no call yet |
| In progress | The call is not `finished` yet (may have `open_questions`) |
| Goal resolved | The outcome or a callback outcome states the user's goal was met: a booking with time and name given, or an information question clearly answered, even negatively (e.g. confirmed out of stock) |
| Goal unmet | The business clearly answered but the goal cannot be met as asked: no availability for a booking, refusal, wrong business, or similar. Report the specific reason, not "failed" |
| Callback pending | Voicemail left or callback promised, no callback outcome yet, still within 14 days. Say who it reaches: Call4me at `calling_number`, or the user's own phone if the call used `own_number` (Call4me then cannot finish it) |
| Unresolved / expired | Finished without a clear answer to the goal, including a callback window that passed with nothing. Not proof the task failed |
| Call failed | Explicit telephony or tool failure evidence (e.g. the result reports the call could not connect, or the tool returned an error). Report that error as given |

Never mark a booking or appointment confirmed without that evidence, and do not write calendar events (out of scope). Summarize transcripts. Keep transcript content and phone numbers out of logs and public evidence.
