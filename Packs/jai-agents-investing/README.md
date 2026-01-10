# jai-agents-investing

Investment council agents for the JAI trading system. Used with mai-council-framework.

## Agents

| Agent | Role | Focus | Veto Power |
|-------|------|-------|------------|
| **Warren** | Value Investment Analyst | Quality at fair prices, margin of safety | Yes |
| **Quentin** | Quantitative Analyst | Data-driven analysis, technical indicators | No |
| **Nova** | Growth Investment Analyst | High-growth opportunities, TAM analysis | No |
| **Marcus** | Risk Manager | Position sizing, portfolio risk | Yes |
| **Taxley** | Tax Strategy Analyst | Tax efficiency, wash sales | No |
| **Penelope** | Penny Stock Specialist | Small cap due diligence, fraud detection | Yes |

## Usage

These agents are auto-discovered by mai-council-framework when placed in the Packs directory.

```bash
# Run council review for a stock
jsa council NVDA

# Run with specific agents
jsa council NVDA --agents Warren,Marcus,Taxley

# Ask a specific question
jsa council NVDA --question "Should I add to my position given current valuations?"
```

## Agent Expertise Mapping

| Topic | Primary Agents |
|-------|----------------|
| Valuation | Warren, Quentin |
| Growth stocks | Nova, Quentin |
| Risk/Position sizing | Marcus |
| Tax implications | Taxley |
| Penny stocks (<$5) | Penelope, Marcus |
| Technical timing | Quentin |

## Integration with jsa analyze

The council can be invoked after analysis:

```bash
# Analyze first, then get council opinion
jsa analyze NVDA --detailed
jsa council NVDA --question "The analysis shows BUY. Should I proceed?"
```

## Agent Personas

Each agent has a distinct investment philosophy:

- **Warren**: "Price is what you pay, value is what you get."
- **Quentin**: "Show me the data. Narratives are noise."
- **Nova**: "The next Amazon will look expensive the entire way up."
- **Marcus**: "Protect the downside; the upside takes care of itself."
- **Taxley**: "It's not what you make, it's what you keep after taxes."
- **Penelope**: "In penny stocks, skepticism is survival."

## Veto Power

Agents with veto power can block decisions:

- **Warren**: Blocks severe overvaluation (>50% above fair value)
- **Marcus**: Blocks positions exceeding policy limits
- **Penelope**: Blocks pump-and-dump schemes or fraud
