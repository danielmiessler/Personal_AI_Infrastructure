# Experiment Workflow

**Purpose**: Test prompts, compare models, and experiment with LLM capabilities locally before production use.

**Best for**: Prompt engineering, model evaluation, testing strategies, learning LLM behavior.

## Workflow Steps

1. **Detect Request**
   - User wants to experiment with prompts or models
   - Triggers: "test with ollama", "experiment locally", "try different models", "test this prompt"

2. **Define Experiment**
   - Single prompt, multiple models
   - Single model, multiple prompts
   - Parameter sweep (temperature, etc.)
   - Quality comparison

3. **Execute Experiments**
   ```bash
   for model in models; do
     bun run Generate.ts \
       --model $model \
       --prompt "${PROMPT}" \
       --temperature ${TEMP}
   done
   ```

4. **Collect Results**
   - Capture outputs
   - Measure performance (tokens/sec)
   - Track quality

5. **Compare & Report**
   - Side-by-side comparison
   - Performance metrics
   - Quality assessment
   - Recommendations

## Experiment Types

### 1. Model Comparison
**Test same prompt across different models**

```bash
#!/usr/bin/env bash
PROMPT="Explain recursion in simple terms"

echo "=== Testing: llama3.2:3b ==="
bun run Generate.ts --model llama3.2:3b --prompt "$PROMPT"

echo -e "\n=== Testing: mistral:latest ==="
bun run Generate.ts --model mistral:latest --prompt "$PROMPT"

echo -e "\n=== Testing: qwen2.5-coder:7b ==="
bun run Generate.ts --model qwen2.5-coder:7b --prompt "$PROMPT"
```

**Output Format**:
```
Model Comparison Results:

1. llama3.2:3b
   Speed: 45 tok/s
   Quality: Clear, beginner-friendly
   Length: 127 words

2. mistral:latest
   Speed: 38 tok/s
   Quality: More technical, precise
   Length: 156 words

3. qwen2.5-coder:7b
   Speed: 42 tok/s
   Quality: Code-focused examples
   Length: 189 words

Recommendation: llama3.2:3b for general users, qwen2.5-coder for developers
```

### 2. Prompt Variations
**Test different prompt formulations**

```bash
MODEL="llama3.2:latest"

# Prompt 1: Direct
bun run Generate.ts --model $MODEL \
  --prompt "List 5 benefits of TDD"

# Prompt 2: With context
bun run Generate.ts --model $MODEL \
  --prompt "You are a software architect. List 5 benefits of TDD"

# Prompt 3: Structured
bun run Generate.ts --model $MODEL \
  --prompt "List 5 benefits of TDD. For each, provide: 1) benefit name, 2) description, 3) example"

# Prompt 4: JSON
bun run Generate.ts --model $MODEL --format json \
  --prompt "List 5 benefits of TDD as JSON array with 'name' and 'description'"
```

### 3. Temperature Sweep
**Find optimal creativity setting**

```bash
PROMPT="Write a creative product description for a smart coffee mug"

for temp in 0.3 0.5 0.7 0.9 1.0; do
  echo "=== Temperature: $temp ==="
  bun run Generate.ts \
    --model llama3.2:latest \
    --prompt "$PROMPT" \
    --temperature $temp
  echo ""
done
```

### 4. System Prompt Testing
**Compare different personas**

```bash
PROMPT="Review this code: function add(a, b) { return a + b }"

# No system prompt
bun run Generate.ts --prompt "$PROMPT"

# Friendly tutor
bun run Generate.ts --system "You are a friendly coding tutor" --prompt "$PROMPT"

# Strict reviewer
bun run Generate.ts --system "You are a strict code reviewer" --prompt "$PROMPT"

# Security expert
bun run Generate.ts --system "You are a security auditor" --prompt "$PROMPT"
```

### 5. Structured Output Testing
**Test JSON mode reliability**

```bash
# Test JSON output consistency
for i in {1..5}; do
  echo "=== Run $i ==="
  bun run Generate.ts \
    --model llama3.2:latest \
    --format json \
    --prompt "Generate 3 user objects with name, email, age"
done
```

## Example Experiments

### Experiment 1: Best Code Model
```
User: "Which local model is best for code reviews?"
Assistant: I'll test 3 code models with the same function review

[Runs experiment comparing qwen2.5-coder, codellama, deepseek-coder]
[Evaluates quality, speed, and specificity]
[Returns recommendations]

Results:
- Best Overall: qwen2.5-coder:7b (fastest + most thorough)
- Best for Python: codellama:7b-python (specialized)
- Best for Speed: qwen2.5-coder:1.5b (acceptable quality)
```

### Experiment 2: Prompt Optimization
```
User: "Test different ways to ask for code comments"
Assistant: I'll try 4 prompt variations

[Tests direct, example-driven, structured, and few-shot prompts]
[Compares output quality and format consistency]
[Identifies best approach]

Winner: Few-shot with examples
- Most consistent format
- Better comment quality
- Follows conventions
```

### Experiment 3: Temperature Impact
```
User: "What temperature works best for technical writing?"
Assistant: I'll test temperatures from 0.1 to 1.0

[Generates same technical content at different temperatures]
[Evaluates accuracy, creativity, hallucinations]
[Finds optimal range]

Findings:
- 0.1-0.3: Too rigid, repetitive
- 0.4-0.6: Best balance ✅
- 0.7-0.9: More creative but less precise
- 1.0: Too random, hallucinations
```

## Evaluation Criteria

### Quality Metrics
- ✅ Accuracy: Factually correct
- ✅ Relevance: On-topic
- ✅ Completeness: Addresses all points
- ✅ Clarity: Easy to understand
- ✅ Format: Follows instructions
- ✅ Consistency: Repeatable results

### Performance Metrics
- ⚡ Speed: Tokens per second
- ⚡ Latency: Time to first token
- ⚡ Total time: Full response time
- ⚡ Resource usage: CPU/RAM

### Cost-Benefit
- 💰 Quality vs Speed trade-off
- 💰 Model size vs Performance
- 💰 Local vs API costs

## Experiment Templates

### Template 1: Model Shootout
```typescript
interface ModelTest {
  model: string;
  prompt: string;
  temperature?: number;
}

const tests: ModelTest[] = [
  { model: 'llama3.2:3b', prompt: PROMPT },
  { model: 'mistral:latest', prompt: PROMPT },
  { model: 'qwen2.5-coder:7b', prompt: PROMPT },
];

// Run all tests and compare
```

### Template 2: Prompt Engineering
```typescript
const promptVariations = [
  'Direct: ${task}',
  'With role: You are a ${role}. ${task}',
  'With examples: ${task}\n\nExample: ${example}',
  'Structured: ${task}\n\nFormat:\n- Step 1\n- Step 2',
];

// Test each variation
```

### Template 3: Parameter Tuning
```typescript
const temperatures = [0.1, 0.3, 0.5, 0.7, 0.9];
const topP = [0.9, 0.95, 1.0];
const maxTokens = [100, 500, 1000];

// Grid search for optimal params
```

## Advanced Experiments

### A/B Testing
```bash
# Test two approaches, pick winner
response_a=$(bun run Generate.ts --prompt "$prompt_a")
response_b=$(bun run Generate.ts --prompt "$prompt_b")

# Compare quality
bun run Generate.ts \
  --prompt "Which response is better and why?\n\nA: $response_a\n\nB: $response_b"
```

### Chain-of-Thought Testing
```bash
# Test reasoning with/without CoT
bun run Generate.ts --prompt "Solve: 23 * 47"

bun run Generate.ts --prompt "Solve: 23 * 47\n\nThink step by step:"
```

### Few-Shot Learning
```bash
# Test different numbers of examples
bun run Generate.ts --prompt "Classify sentiment: 'Great product!' -> Positive\nClassify: 'Terrible service'"

# 2 examples
# 5 examples
# 10 examples
```

### Multi-Turn Consistency
```bash
# Test conversation coherence
bun run Chat.ts << EOF
What is machine learning?
Can you give an example?
How does it differ from traditional programming?
EOF
```

## Performance Benchmarking

### Speed Test
```bash
# Time multiple runs
for i in {1..10}; do
  time bun run Generate.ts \
    --model llama3.2:latest \
    --prompt "$PROMPT" \
    --no-stream > /dev/null
done | grep real | awk '{print $2}'
```

### Throughput Test
```bash
# Parallel requests
for i in {1..5}; do
  bun run Generate.ts --prompt "$PROMPT" &
done
wait
```

### Memory Usage
```bash
# Monitor resource consumption
/usr/bin/time -v bun run Generate.ts --prompt "$LONG_PROMPT"
```

## Integration with PAI

### Save Experiment Results
```bash
# Log to history
experiment_result="..."
echo "$experiment_result" > $PAI_DIR/history/experiments/YYYY-MM/experiment-name.md
```

### Automated Testing
```bash
# Hook into CI/CD
bun run Generate.ts \
  --model qwen2.5-coder:7b \
  --prompt "Review these changes: $(git diff)" \
  > review.txt
```

## Best Practices

1. **Isolate Variables**: Change one thing at a time
2. **Multiple Runs**: Test 3-5 times for consistency
3. **Document Setup**: Record model versions, parameters
4. **Baseline**: Establish baseline before optimization
5. **Real Tasks**: Test with actual use cases
6. **Metrics**: Define success criteria upfront
7. **Automate**: Script repeated experiments
8. **Version Control**: Save prompts and results

## Common Experiments

- **Summarization quality** across models
- **Code generation accuracy** by language
- **Translation consistency** with temperature
- **JSON reliability** with format parameter
- **Reasoning ability** with chain-of-thought
- **Instruction following** with different prompts
- **Creativity vs accuracy** temperature sweep
- **Speed vs quality** model size comparison

## Troubleshooting

**Inconsistent results**:
- Lower temperature
- Use seed parameter (if supported)
- Multiple runs for average

**Poor quality**:
- Try different model
- Improve prompt clarity
- Add examples
- Adjust temperature

**Too slow**:
- Use smaller model
- Reduce max tokens
- Enable GPU acceleration
- Use quantized models
