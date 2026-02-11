# Verification Checklist

Run these steps to confirm `pai-system-gemini` is working correctly.

### 1. Check File Structure

```bash
ls -l $PAI_DIR/Packs/pai-system-gemini/dist/adapter.js
# Should exist and have a recent timestamp
```

### 2. Verify Adapter Logic (Simulation)

Run the adapter manually to check if it generates context.

```bash
# Create a dummy payload
echo '{"hook": "SessionStart", "payload": {}}' > test_payload.json

# Run adapter
node $PAI_DIR/Packs/pai-system-gemini/dist/adapter.js < test_payload.json

# Cleanup
rm test_payload.json
```

**Expected Output:**
A JSON object containing `hookSpecificOutput` -> `systemInstruction`.
Inside `systemInstruction`, you should see:

- `PAI GEMINI BRIDGE ACTIVE`
- `=== 🆔 IDENTITY ===` (with your name)
- `=== 🧠 CORE SKILL ===`
- `=== TELOS (GOALS) ===`

### 3. Verify Gemini Integration (Live)

1. Launch Gemini: `gemini`
2. Check the output logs or ask: "Who are you and what are my current goals?"

**Success Criteria:**

- The AI identifies as **Kai** (or your configured DA).
- It knows your role/profession.
- It can list your goals from TELOS.

### 4. Verify Observability

1. Run a command in Gemini.
2. Check PAI logs:
   ```bash
   ls -lt $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/
   tail -n 1 $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
   ```
3. You should see a JSON entry with `"source_app": "gemini"`.
