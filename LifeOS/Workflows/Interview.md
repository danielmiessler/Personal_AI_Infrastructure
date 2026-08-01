# Interview — life onboarding (phase 2)

The "meaning" half. Runs AFTER Setup. Captures who the user is and where they're going, then seeds Pulse with real data so the dashboard is alive on first open. This is the moment LifeOS becomes personal.

## Voice notification (first action)

```bash
curl -s -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Running the Interview workflow in the LifeOS skill to onboard you into LifeOS"}' > /dev/null 2>&1 &
```

## Stance

Peer conversation, not a form. Ask one thing at a time, reflect it back, go deeper where there's signal. Every write is `existsSync`-guarded — never clobber answers the user already gave. The user can say `skip` to any item and `done` to stop early; partial onboarding is valid (Pulse shows what it has).

## Sequence

1. **DA naming + voice** — what do they want to call their assistant? Capture `da.name`, optional `da.full_name`/`display_name`/`color`, and a voice (`da.voices.main.voice_id` — offer the public default, let them paste an ElevenLabs id). Write to `CONFIG/LIFEOS_CONFIG.toml`. *(This is the step the old install wizard handled; it lives here now.)*
2. **Principal identity** — name, pronunciation, timezone, hometown → `[principal]` in `LIFEOS_CONFIG.toml` and `PRINCIPAL/PRINCIPAL_IDENTITY.md`.
3. **TELOS — current state** — mission, the people who matter, current projects, challenges, what's actually true right now. Write to `TELOS/`.
4. **TELOS — ideal state** — goals (with metrics + dates where they have them), strategies, the destination. Current → ideal is the spine of LifeOS; get both halves.
5. **External sources (optional)** — the user can hand over existing material: notes, an old config, exports, URLs, a prior LIFEOS/other-harness setup. Pull from each (read files, fetch URLs), extract identity / TELOS / project signal, and merge into the USER tree — `existsSync`-guarded, confirm before each write. This is the migration on-ramp: bring your context, don't retype it.
6. **SeedPulse** — `bun Tools/SeedPulse.ts` (dry-run first, then `--apply`) → write `LIFEOS_STATE.json` and regenerate `PRINCIPAL_TELOS.md` from the captured TELOS so Pulse renders real rings + state on first open.

## Close

Confirm what landed (DA name, identity, N goals, current/ideal captured), point them at Pulse (`localhost:31337`), and tell them the interview is re-runnable any time to go deeper.

## Notes
- This workflow only WRITES the user's config tree — it never touches system files.
- If `setup` ran immediately before, continue the same conversation; if invoked standalone (`lifeos interview`), confirm Setup already ran (config tree exists) before seeding.
