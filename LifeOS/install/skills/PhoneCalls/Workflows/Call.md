# Call

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Call workflow in the PhoneCalls skill to call a business"}' \
  > /dev/null 2>&1 &
```

Running **Call** in **PhoneCalls**...

---

**Deliverable:** one paid call placed only on the user's explicit request, followed to `finished`, and reported in a line or two: what the result states, anything to note (confirmation number, arrival time), and what is still unresolved. Use the exposed tool names discovered in Setup; the names below are the published references.

## Before dialing (safety gate)

- The user explicitly asked to call this business. Inferring a call from context is not enough.
- Destination is a business the user wants to reach, the number is verified for the right location, and it is not a personal, emergency, or premium rate number (https://call4.me/rules).
- `call4me_get_balance` checked right before this call (and again before each later one). Quote cost only from the returned fields. Insufficient balance → tell the user; never call `add_funds` on your own.
- Time/cost cap: if the exposed `place_call` schema offers optional `max_minutes`, respect the user's stated time or cost limit, and ask for a cap if they gave none and one matters. The published skill may not list it; trust the exposed schema. Never invent a cap or authorize spend the user did not.
- Caller number: the balance `numbers` list shows assigned numbers, not the one that will dial; a country match proves nothing, especially with several numbers or the user's own verified line. The caller is known before dialing only if the user explicitly chose one and the exposed schema has a field to select it. Otherwise say it is not known yet and will be shown as soon as the call returns `calling_number`.
- Category picked from the task (the list is in the live source and tool schema), then passed to `call4me_get_requirements`. Ask for every missing required field in ONE message.
- `goal`, `details`, and `flexibility` come from the user. Never invent commitments (a deposit, a time, a membership) the user did not authorize.

## Place

`call4me_place_call` with `to`, `business`, `goal`, `category`, `details` (answers by field key), `flexibility`, and `max_minutes` when the exposed schema has it and a cap was set as above.

- "Not calling yet" → no call exists. Ask the user exactly what it lists, then retry.
- Show the returned `calling_number` as soon as the tool returns. On the first call, or when it differs from what the user has seen, suggest saving it as a Call4me contact.
- Before passing `connect_when` or `listen_in`, give a heads up that the user's phone may ring. If the caller is not established as above, say it may come from a number other than the ones they have seen, then show the actual `calling_number` the moment the call returns. Never pick one from the `numbers` list.

## Follow

Poll `call4me_get_call` with `wait_seconds: 30` until `finished`.

- `open_questions` → the business is waiting. Answer with `call4me_answer_question` from facts the user already gave, or ask the user right now. Never make one up.
- Handoff (identity check, user wants to talk) → read the call's actual `calling_number` from `call4me_get_call`, tell the user to expect a ring from that number, then `call4me_connect_me` (`mode: "listen"` to listen silently). They press 1 to join and press * or hang up to hand back. Never describe the profile phone as the number calling them.
- Call going nowhere or the user changed their mind → `call4me_hang_up`.

## Report

- Outcome only from the tool result, judged against the user's goal. "Answered" or `finished` is not the goal achieved. A clear answer to an information question is the goal met, even when the answer is negative. No availability, refusal, or wrong business is an unmet goal: state the specific reason. Call it a failed call only on explicit telephony or tool failure evidence.
- Voicemail or a promised callback → callback pending, not yet resolved. Say who the callback reaches: normally the call's `calling_number`, where Call4me answers within 14 days and can try to finish the task; if the call used `own_number`, the business was given the user's own number and the callback rings the user, not Call4me. Either way, completion depends on the business calling back and that call's actual outcome. Point to the Check workflow with the original call id.

## Scheduled calls

Only when the user asks for a later time. A call that needs an account PIN cannot be scheduled; place it live instead. Collect everything as above, then `call4me_schedule_call` with the same arguments plus `call_at` (business local time with `timezone`, or ISO with offset, within business hours). Nobody may be watching when it dials, so put every fact in `details` (and `facts`, only if the exposed schema has it) and everything the user authorized the caller to accept in `flexibility`. Tell the user when it will dial and give the returned `sched_` id; `call4me_cancel_scheduled_call` cancels it. Do not set up recurring polling; the user checks later via Check.
