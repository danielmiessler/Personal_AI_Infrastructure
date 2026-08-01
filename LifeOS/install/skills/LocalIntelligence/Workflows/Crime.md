# Crime Workflow

Local crime stats and recent incidents. **Delegates entirely to a dedicated crime-stats skill** — this workflow does not re-implement crime data fetching.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Crime in LocalIntelligence"}' \
  > /dev/null 2>&1 &
```

Running **Crime** in **LocalIntelligence**...

## Procedure

1. Resolve hometown via `Tools/Hometown.ts` → `{ city, state }`.
2. Invoke the configured crime-data adapter (the principal's private crime-stats skill if installed; otherwise the public default crime adapter) with the resolved city — typically the QuickStats workflow for the digest, IncidentReport for "what happened recently."
3. Shape the adapter output into the LocalIntelligence `FetchResult` envelope.
4. Persist in the digest under `crime` key.

## Forbidden

- Direct calls to CitizenRIMS, FBI UCR, AreaVibes, NeighborhoodScout, or any crime-data source from this workflow or `Tools/FetchCrime.ts`. All crime data routes through a dedicated crime-stats skill.
