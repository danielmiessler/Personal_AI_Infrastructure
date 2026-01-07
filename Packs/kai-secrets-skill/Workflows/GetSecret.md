# GetSecret Workflow

Retrieve a single secret by key.

## Trigger

- "Get the {key} secret"
- "What is {key}?"
- "Retrieve {key} from secrets"

## Steps

1. Parse the secret key from user request
2. Determine environment if specified
3. Use CLI tool to retrieve: `bun run Tools/get.ts <key>`
4. Return the revealed value to user

## Example

```
User: "Get the DATABASE_URL secret for production"

Process:
1. key = "DATABASE_URL"
2. environment = "production"
3. Run: bun run Tools/get.ts DATABASE_URL --env production
4. Return: "The DATABASE_URL for production is: postgres://..."
```

## Error Handling

- Secret not found → "Secret 'KEY' was not found in the configured provider"
- Auth failed → "Authentication failed. Check your provider credentials"
- Provider error → "Could not connect to secrets provider: {details}"

## Security

- Never log the secret value
- Only reveal the value when explicitly requested
- Confirm before revealing sensitive secrets like passwords
