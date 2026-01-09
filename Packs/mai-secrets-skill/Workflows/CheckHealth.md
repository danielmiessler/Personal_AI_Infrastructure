# CheckHealth Workflow

Verify secrets provider connectivity.

## Trigger

- "Is the secrets provider working?"
- "Check secrets health"
- "Can we access secrets?"

## Steps

1. Determine which adapter to check
2. Use CLI tool: `bun run Tools/health.ts [--adapter <adapter>]`
3. Report status to user

## Example

```
User: "Is Infisical working?"

Process:
1. adapter = "infisical"
2. Run: bun run Tools/health.ts --adapter infisical
3. Return:
   "✓ Infisical is healthy
    - Latency: 45ms
    - Environment: production
    - Project: configured"
```

## Error Handling

- Unhealthy → "⚠ Provider is not healthy: {message}"
- Connection failed → "Cannot connect to provider: {details}"

## Notes

- Useful for debugging connectivity issues
- Check health before attempting secret operations
- Reports latency for performance monitoring
