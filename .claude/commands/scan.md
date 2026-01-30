Run the pre-market stock scanner. Execute: `uv run tradekit scan $ARGUMENTS`

If no arguments provided, use default screener settings.
Possible arguments: --preset premarket_gap --min-gap 3 --min-volume 500000 --max-price 50

Present the results as a ranked table. For each stock, note:
- Pre-market gap % and direction
- Pre-market volume vs average
- Float size category (low/mid/high)

Flag any that appear on the default watchlist.
