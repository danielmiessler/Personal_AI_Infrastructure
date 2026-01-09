# ListSecrets Workflow

List available secret keys.

## Trigger

- "What secrets are available?"
- "List secrets"
- "Show me all API keys" (pattern: API_*)

## Steps

1. Parse optional pattern from user request
2. Use CLI tool to list: `bun run Tools/list.ts [--pattern <pattern>]`
3. Return the list of keys

## Example

```
User: "What secrets do we have for AWS?"

Process:
1. pattern = "AWS_*"
2. Run: bun run Tools/list.ts --pattern "AWS_*"
3. Return:
   "Found 3 AWS-related secrets:
    - AWS_ACCESS_KEY
    - AWS_SECRET_KEY
    - AWS_REGION"
```

## Error Handling

- No secrets found → "No secrets found matching the pattern"
- Auth failed → "Authentication failed. Check your provider credentials"

## Notes

- Never reveals secret values, only keys
- Safe to call frequently
- Respects pagination for large secret stores
