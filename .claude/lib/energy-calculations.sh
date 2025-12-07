#!/bin/bash
#
# Energy & Carbon Footprint Calculations for LLMs
# Based on academic research from:
# - arxiv.org/abs/2310.03003 (Power, Latency and Cost of LLM Inference Systems)
# - arxiv.org/abs/2507.11417 (Quantifying Energy Consumption and Carbon Emissions)
# - sustainabilitybynumbers.com/p/ai-footprint-august-2025
#
# Formula: Carbon = Energy (kWh) × Carbon Intensity (gCO2/kWh)
# Energy = Power × Time × Tokens × PUE

# Model-specific energy consumption per token (in Wh)
# Based on arxiv.org/abs/2310.03003: LLaMA 65B uses 3-4 Joules per token
# Converted: 3.5J / 3600 = 0.00097 Wh per token for 65B model
# Scaled by parameter count for other models
#
# Parameter estimates: Haiku ~20B, Sonnet ~70B, Opus ~2T (similar to LLaMA 65B)

declare -A MODEL_ENERGY_PER_TOKEN=(
    ["haiku"]=0.0003      # Smallest model, ~20B params (scaled from 65B)
    ["sonnet"]=0.0007     # Mid-size, ~70B params (similar to LLaMA 65B)
    ["opus"]=0.001        # Largest model, ~2T params (conservative estimate)
)

# Power Usage Effectiveness (data center efficiency)
# Industry standard: 1.2 for modern data centers
PUE=1.2

# Carbon intensity (gCO2/kWh) - configurable by region
# Default: 400 (global average)
# EU: 240, US West: 240, US East: 429
CARBON_INTENSITY_DEFAULT=400

#
# calculate_energy()
# Calculate energy consumption in kWh for token usage
#
# Args:
#   $1 - model name (haiku, sonnet, opus)
#   $2 - total tokens processed
#   $3 - carbon intensity (optional, defaults to global average)
#
# Returns (via echo):
#   energy_kwh carbon_grams
#
calculate_energy() {
    local model="$1"
    local tokens="$2"
    local carbon_intensity="${3:-$CARBON_INTENSITY_DEFAULT}"

    # Get energy per token for this model
    local energy_per_token="${MODEL_ENERGY_PER_TOKEN[$model]:-0.0002}"

    # Calculate total energy: tokens × energy_per_token × PUE
    # Using bc for floating point math
    local energy_wh=$(echo "scale=6; $tokens * $energy_per_token * $PUE" | bc)

    # Convert Wh to kWh
    local energy_kwh=$(echo "scale=6; $energy_wh / 1000" | bc)

    # Calculate carbon footprint: energy × carbon_intensity
    local carbon_grams=$(echo "scale=2; $energy_kwh * $carbon_intensity" | bc)

    echo "$energy_kwh $carbon_grams"
}

#
# format_energy()
# Format energy value with appropriate unit (Wh, kWh, MWh)
#
format_energy() {
    local kwh="$1"

    # Convert to Wh for better readability
    local wh=$(echo "scale=2; $kwh * 1000" | bc)

    # If less than 1000 Wh, show in Wh
    if (( $(echo "$wh < 1000" | bc -l) )); then
        printf "%.2f Wh" "$wh"
    else
        # Show in kWh
        printf "%.3f kWh" "$kwh"
    fi
}

#
# format_carbon()
# Format carbon value with appropriate unit (g, kg, t)
#
format_carbon() {
    local grams="$1"

    # If less than 1000g, show in grams
    if (( $(echo "$grams < 1000" | bc -l) )); then
        printf "%.2f g CO₂" "$grams"
    # If less than 1000kg, show in kg
    elif (( $(echo "$grams < 1000000" | bc -l) )); then
        local kg=$(echo "scale=3; $grams / 1000" | bc)
        printf "%.3f kg CO₂" "$kg"
    # Otherwise show in tonnes
    else
        local tonnes=$(echo "scale=3; $grams / 1000000" | bc)
        printf "%.3f t CO₂" "$tonnes"
    fi
}

#
# get_carbon_intensity()
# Get carbon intensity for a region
#
# Args:
#   $1 - region code (optional: eu, us-west, us-east, global)
#
# Returns:
#   carbon intensity value in gCO2/kWh
#
get_carbon_intensity() {
    local region="${1:-global}"

    case "$region" in
        "eu") echo "240" ;;
        "us-west") echo "240" ;;
        "us-east") echo "429" ;;
        "global") echo "400" ;;
        *) echo "400" ;;
    esac
}
