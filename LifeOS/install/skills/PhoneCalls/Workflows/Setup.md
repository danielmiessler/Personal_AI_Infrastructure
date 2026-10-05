# Setup

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Setup workflow in the PhoneCalls skill to connect Call4me"}' \
  > /dev/null 2>&1 &
```

Running **Setup** in **PhoneCalls**...

---

**Deliverable:** an authenticated Call4me MCP connection whose exposed tool names are known, plus a user who knows which number calls will come from and how a handoff ring works.

## Connect

Reuse an existing authenticated `call4me` server if its tools are already listed. Otherwise give the user the command; never edit global MCP config on your own.

```bash
claude mcp add --scope project --transport http call4me https://call4.me/mcp
```

The user then runs `/mcp`, picks `call4me`, and signs in. For other clients, point to the Connect section of the live source: https://call4.me/.well-known/agent-skills/call4me/SKILL.md

## Verify

- List the server's tools and note the exposed names and schemas. Later workflows call those names, not the published `call4me_*` names verbatim.
- Call the exposed `get_balance`. Auth failure or missing tool → report the exact error and stop; do not claim setup succeeded.
- Show the returned balance and rate fields as given. No credits → tell the user; offer `add_funds` only if they ask, and only pass on the checkout link.

## Numbers

- Show every entry in the returned `numbers` list with its country as the numbers assigned to the account, and suggest saving them as contacts named Call4me. Say plainly that this list does not determine which number dials a given call, especially with several numbers or the user's own verified line.
- `phone_number` null and `numbers` empty → the free US number is assigned on the first call and will be shown then. Never invent or promise one.
- The caller for a call is known only from that call's returned `calling_number`, or from an explicit user choice passed through a caller selection field the exposed schema actually has. Never present `phone_number` or a country match in the list as the selected caller.
- Explain that the profile `phone` is a different number: it is where Call4me rings the user if a business needs them (press 1 to join; press * or hang up to hand back).

## Profile

Reading the existing profile with `get_profile` is fine. Do not run a broad onboarding questionnaire: collect details per call, only what that task requires. Persist with `save_profile` only when the user asks or agrees. Never ask for or save Social Security numbers, card numbers, or passwords.
