#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# PAI Status Line
# ═══════════════════════════════════════════════════════════════════════════════
#
# Responsive status line with 4 display modes based on terminal width:
#   - nano   (<35 cols): Minimal single-line displays
#   - micro  (35-54):    Compact with key metrics
#   - mini   (55-79):    Balanced information density
#   - normal (80+):      Full display with sparklines
#
# Output order: Greeting → Wielding → Git → Learning → Signal → Context → Quote
#
# KNOWN LIMITATION: Context percentage won't match /context exactly.
# Hook JSON excludes system prompt, tools, MCP tokens. See:
# github.com/anthropics/claude-code/issues/13783
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
RATINGS_FILE="$PAI_DIR/MEMORY/LEARNING/SIGNALS/ratings.jsonl"
TREND_CACHE="$PAI_DIR/MEMORY/STATE/trending-cache.json"
MODEL_CACHE="$PAI_DIR/MEMORY/STATE/model-cache.txt"
QUOTE_CACHE="$PAI_DIR/.quote-cache"
LOCATION_CACHE="$PAI_DIR/MEMORY/STATE/location-cache.json"
WEATHER_CACHE="$PAI_DIR/MEMORY/STATE/weather-cache.json"

# Context baseline: preloaded tokens not visible to hooks (~22.6k typical)
CONTEXT_BASELINE=22600

# Cache TTL in seconds
LOCATION_CACHE_TTL=3600  # 1 hour (IP rarely changes)
WEATHER_CACHE_TTL=900    # 15 minutes

# Source .env for API keys
[ -f "$PAI_DIR/.env" ] && source "$PAI_DIR/.env"

# ─────────────────────────────────────────────────────────────────────────────
# TERMINAL WIDTH DETECTION
# ─────────────────────────────────────────────────────────────────────────────
# Hooks don't inherit terminal context. Try multiple methods.

detect_terminal_width() {
    local width=""

    # Tier 1: Kitty IPC (most accurate for Kitty panes)
    if [ -n "$KITTY_WINDOW_ID" ] && command -v kitten >/dev/null 2>&1; then
        width=$(kitten @ ls 2>/dev/null | jq -r --argjson wid "$KITTY_WINDOW_ID" \
            '.[].tabs[].windows[] | select(.id == $wid) | .columns' 2>/dev/null)
    fi

    # Tier 2: Direct TTY query
    [ -z "$width" ] || [ "$width" = "0" ] || [ "$width" = "null" ] && \
        width=$(stty size </dev/tty 2>/dev/null | awk '{print $2}')

    # Tier 3: tput fallback
    [ -z "$width" ] || [ "$width" = "0" ] && width=$(tput cols 2>/dev/null)

    # Tier 4: Environment variable
    [ -z "$width" ] || [ "$width" = "0" ] && width=${COLUMNS:-80}

    echo "$width"
}

term_width=$(detect_terminal_width)

if [ "$term_width" -lt 35 ]; then
    MODE="nano"
elif [ "$term_width" -lt 55 ]; then
    MODE="micro"
elif [ "$term_width" -lt 80 ]; then
    MODE="mini"
else
    MODE="normal"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PARSE INPUT
# ─────────────────────────────────────────────────────────────────────────────

input=$(cat)

# Get DA name from settings (single source of truth)
DA_NAME=$(jq -r '.daidentity.name // .daidentity.displayName // .env.DA // "Assistant"' "$SETTINGS_FILE" 2>/dev/null)
DA_NAME="${DA_NAME:-Assistant}"

# Get PAI version from settings (single source of truth)
PAI_VERSION=$(jq -r '.pai.version // "2.0"' "$SETTINGS_FILE" 2>/dev/null)
PAI_VERSION="${PAI_VERSION:-2.0}"

# Extract all data from JSON in single jq call
eval "$(echo "$input" | jq -r '
  "current_dir=" + (.workspace.current_dir // .cwd | @sh) + "\n" +
  "model_name=" + (.model.display_name | @sh) + "\n" +
  "cc_version_json=" + (.version // "" | @sh) + "\n" +
  "duration_ms=" + (.cost.total_duration_ms // 0 | tostring) + "\n" +
  "cache_read=" + ((.context_window.current_usage.cache_read_input_tokens // 0) | tostring) + "\n" +
  "input_tokens=" + ((.context_window.current_usage.input_tokens // 0) | tostring) + "\n" +
  "cache_creation=" + ((.context_window.current_usage.cache_creation_input_tokens // 0) | tostring) + "\n" +
  "output_tokens=" + ((.context_window.current_usage.output_tokens // 0) | tostring) + "\n" +
  "context_max=" + (.context_window.context_window_size // 200000 | tostring)
')"

# Get Claude Code version
if [ -n "$cc_version_json" ] && [ "$cc_version_json" != "unknown" ]; then
    cc_version="$cc_version_json"
else
    cc_version=$(claude --version 2>/dev/null | head -1 | awk '{print $1}')
    cc_version="${cc_version:-unknown}"
fi

# Cache model name for other tools
mkdir -p "$(dirname "$MODEL_CACHE")" 2>/dev/null
echo "$model_name" > "$MODEL_CACHE" 2>/dev/null

dir_name=$(basename "$current_dir")

# ─────────────────────────────────────────────────────────────────────────────
# COUNT RESOURCES
# ─────────────────────────────────────────────────────────────────────────────

skills_count=$(ls -d "$PAI_DIR/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
workflows_count=$(ls "$PAI_DIR/skills"/*/workflows/*.md 2>/dev/null | wc -l | tr -d ' ')
hooks_count=$(ls "$PAI_DIR/hooks"/*.ts 2>/dev/null | wc -l | tr -d ' ')
learnings_count=$(find "$PAI_DIR/MEMORY/LEARNING" -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
work_count=$(find "$PAI_DIR/MEMORY/WORK" -mindepth 2 -maxdepth 2 -type d 2>/dev/null | wc -l | tr -d ' ')

# Count learning files
learning_count=$(find "$PAI_DIR/MEMORY/LEARNING" -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

# Count ratings (dynamic learning signal)
ratings_count=0
[ -f "$RATINGS_FILE" ] && ratings_count=$(wc -l < "$RATINGS_FILE" 2>/dev/null | tr -d ' ')

# ─────────────────────────────────────────────────────────────────────────────
# COLOR PALETTE
# ─────────────────────────────────────────────────────────────────────────────
# Tailwind-inspired colors organized by usage

RESET='\033[0m'

# Structural (chrome, labels, separators)
SLATE_300='\033[38;2;203;213;225m'     # Light text/values
SLATE_400='\033[38;2;148;163;184m'     # Labels
SLATE_500='\033[38;2;100;116;139m'     # Muted text
SLATE_600='\033[38;2;71;85;105m'       # Separators

# Semantic colors
EMERALD='\033[38;2;74;222;128m'        # Positive/success
ROSE='\033[38;2;251;113;133m'          # Error/negative

# Rating gradient (for get_rating_color)
RATING_10='\033[38;2;74;222;128m'      # 9-10: Emerald
RATING_8='\033[38;2;163;230;53m'       # 8: Lime
RATING_7='\033[38;2;250;204;21m'       # 7: Yellow
RATING_6='\033[38;2;251;191;36m'       # 6: Amber
RATING_5='\033[38;2;251;146;60m'       # 5: Orange
RATING_4='\033[38;2;248;113;113m'      # 4: Light red
RATING_LOW='\033[38;2;239;68;68m'      # 0-3: Red

# Line 1: Greeting (violet theme)
GREET_PRIMARY='\033[38;2;167;139;250m'
GREET_SECONDARY='\033[38;2;139;92;246m'
GREET_ACCENT='\033[38;2;196;181;253m'

# Line 2: Wielding (cyan/teal theme)
WIELD_PRIMARY='\033[38;2;34;211;238m'
WIELD_SECONDARY='\033[38;2;45;212;191m'
WIELD_ACCENT='\033[38;2;103;232;249m'
WIELD_WORKFLOWS='\033[38;2;94;234;212m'
WIELD_HOOKS='\033[38;2;6;182;212m'
WIELD_LEARNINGS='\033[38;2;20;184;166m'

# Line 3: Git (sky/blue theme)
GIT_PRIMARY='\033[38;2;56;189;248m'
GIT_VALUE='\033[38;2;186;230;253m'
GIT_DIR='\033[38;2;147;197;253m'
GIT_CLEAN='\033[38;2;125;211;252m'
GIT_MODIFIED='\033[38;2;96;165;250m'
GIT_ADDED='\033[38;2;59;130;246m'
GIT_STASH='\033[38;2;165;180;252m'
GIT_AGE_FRESH='\033[38;2;125;211;252m'
GIT_AGE_RECENT='\033[38;2;96;165;250m'
GIT_AGE_STALE='\033[38;2;59;130;246m'
GIT_AGE_OLD='\033[38;2;99;102;241m'

# Line 4: Learning (purple theme)
LEARN_PRIMARY='\033[38;2;167;139;250m'
LEARN_SECONDARY='\033[38;2;196;181;253m'
LEARN_WORK='\033[38;2;192;132;252m'
LEARN_SIGNALS='\033[38;2;139;92;246m'
LEARN_RESEARCH='\033[38;2;165;180;252m'

# Line 5: Learning Signal (blue theme)
SIGNAL_LABEL='\033[38;2;56;189;248m'
SIGNAL_COLOR='\033[38;2;96;165;250m'
SIGNAL_PERIOD='\033[38;2;148;163;184m'

# Line 6: Context (indigo theme)
CTX_PRIMARY='\033[38;2;129;140;248m'
CTX_SECONDARY='\033[38;2;165;180;252m'
CTX_ACCENT='\033[38;2;139;92;246m'
CTX_BUCKET_EMPTY='\033[38;2;75;82;95m'

# Line 7: Quote (gold theme)
QUOTE_PRIMARY='\033[38;2;252;211;77m'
QUOTE_AUTHOR='\033[38;2;180;140;60m'

# PAI Branding (matches banner colors)
PAI_P='\033[38;2;30;58;138m'          # Navy
PAI_A='\033[38;2;59;130;246m'         # Medium blue
PAI_I='\033[38;2;147;197;253m'        # Light blue
PAI_LABEL='\033[38;2;100;116;139m'    # Slate for "status line"
PAI_CITY='\033[38;2;147;197;253m'     # Light blue for city
PAI_STATE='\033[38;2;100;116;139m'    # Slate for state
PAI_TIME='\033[38;2;96;165;250m'      # Medium-light blue for time
PAI_WEATHER='\033[38;2;135;206;235m'  # Sky blue for weather

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

# Get color for rating value (handles "—" for no data)
get_rating_color() {
    local val="$1"
    [[ "$val" == "—" || -z "$val" ]] && { echo "$SLATE_400"; return; }
    local rating_int=${val%%.*}
    [[ ! "$rating_int" =~ ^[0-9]+$ ]] && { echo "$SLATE_400"; return; }

    if   [ "$rating_int" -ge 9 ]; then echo "$RATING_10"
    elif [ "$rating_int" -ge 8 ]; then echo "$RATING_8"
    elif [ "$rating_int" -ge 7 ]; then echo "$RATING_7"
    elif [ "$rating_int" -ge 6 ]; then echo "$RATING_6"
    elif [ "$rating_int" -ge 5 ]; then echo "$RATING_5"
    elif [ "$rating_int" -ge 4 ]; then echo "$RATING_4"
    else echo "$RATING_LOW"
    fi
}

# Get gradient color for context bar bucket
# Green(74,222,128) → Yellow(250,204,21) → Orange(251,146,60) → Red(239,68,68)
get_bucket_color() {
    local pos=$1 max=$2
    local pct=$((pos * 100 / max))
    local r g b

    if [ "$pct" -le 33 ]; then
        r=$((74 + (250 - 74) * pct / 33))
        g=$((222 + (204 - 222) * pct / 33))
        b=$((128 + (21 - 128) * pct / 33))
    elif [ "$pct" -le 66 ]; then
        local t=$((pct - 33))
        r=$((250 + (251 - 250) * t / 33))
        g=$((204 + (146 - 204) * t / 33))
        b=$((21 + (60 - 21) * t / 33))
    else
        local t=$((pct - 66))
        r=$((251 + (239 - 251) * t / 34))
        g=$((146 + (68 - 146) * t / 34))
        b=$((60 + (68 - 60) * t / 34))
    fi
    printf '\033[38;2;%d;%d;%dm' "$r" "$g" "$b"
}

# Render context bar with specified bucket count
render_context_bar() {
    local width=$1 pct=$2
    local output="" last_color=""

    [ "$pct" -gt 100 ] && pct=100
    local filled=$((pct * width / 100))
    [ "$filled" -lt 0 ] && filled=0

    for i in $(seq 1 $width 2>/dev/null); do
        if [ "$i" -le "$filled" ]; then
            local color=$(get_bucket_color $i $width)
            last_color="$color"
            output="${output}${color}⛁${RESET}"
            [ "$width" -gt 8 ] && output="${output} "
        else
            output="${output}${CTX_BUCKET_EMPTY}⛁${RESET}"
            [ "$width" -gt 8 ] && output="${output} "
        fi
    done

    # Trim trailing space
    output="${output% }"
    echo "$output"

    # Return last filled color via global
    LAST_BUCKET_COLOR="${last_color:-$EMERALD}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 0: PAI BRANDING (location, time, weather)
# ═══════════════════════════════════════════════════════════════════════════════

# Get current time in 24hr format
current_time=$(date +"%H:%M")

# Fetch location from IP (with caching)
fetch_location() {
    local cache_age=999999
    [ -f "$LOCATION_CACHE" ] && cache_age=$(($(date +%s) - $(stat -f %m "$LOCATION_CACHE" 2>/dev/null || echo 0)))

    if [ "$cache_age" -gt "$LOCATION_CACHE_TTL" ]; then
        # Fetch fresh location data
        local loc_data=$(curl -s --max-time 2 "http://ip-api.com/json/?fields=city,regionName,country,lat,lon" 2>/dev/null)
        if [ -n "$loc_data" ] && echo "$loc_data" | jq -e '.city' >/dev/null 2>&1; then
            echo "$loc_data" > "$LOCATION_CACHE"
        fi
    fi

    # Return city|state format for separate coloring
    if [ -f "$LOCATION_CACHE" ]; then
        jq -r '"\(.city)|\(.regionName)"' "$LOCATION_CACHE" 2>/dev/null
    else
        echo "Unknown|"
    fi
}

# Fetch weather (with caching) using Open-Meteo (free, no API key)
fetch_weather() {
    local cache_age=999999
    [ -f "$WEATHER_CACHE" ] && cache_age=$(($(date +%s) - $(stat -f %m "$WEATHER_CACHE" 2>/dev/null || echo 0)))

    if [ "$cache_age" -gt "$WEATHER_CACHE_TTL" ]; then
        # Get lat/lon from location cache
        local lat="" lon=""
        if [ -f "$LOCATION_CACHE" ]; then
            lat=$(jq -r '.lat // empty' "$LOCATION_CACHE" 2>/dev/null)
            lon=$(jq -r '.lon // empty' "$LOCATION_CACHE" 2>/dev/null)
        fi
        # Default to San Francisco if no location
        lat="${lat:-37.7749}"
        lon="${lon:-122.4194}"

        # Fetch from Open-Meteo (free, fast, no API key)
        local weather_json=$(curl -s --max-time 3 "https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius" 2>/dev/null)
        if [ -n "$weather_json" ] && echo "$weather_json" | jq -e '.current' >/dev/null 2>&1; then
            local temp=$(echo "$weather_json" | jq -r '.current.temperature_2m' 2>/dev/null)
            local code=$(echo "$weather_json" | jq -r '.current.weather_code' 2>/dev/null)
            # Map weather codes to conditions
            local condition="Clear"
            case "$code" in
                0) condition="Clear" ;;
                1|2|3) condition="Cloudy" ;;
                45|48) condition="Foggy" ;;
                51|53|55|56|57) condition="Drizzle" ;;
                61|63|65|66|67) condition="Rain" ;;
                71|73|75|77) condition="Snow" ;;
                80|81|82) condition="Showers" ;;
                85|86) condition="Snow" ;;
                95|96|99) condition="Storm" ;;
            esac
            echo "${temp}°C ${condition}" > "$WEATHER_CACHE"
        fi
    fi

    if [ -f "$WEATHER_CACHE" ]; then
        cat "$WEATHER_CACHE" 2>/dev/null
    else
        echo "—"
    fi
}

# Fetch data (background-friendly)
location_raw=$(fetch_location)
location_city="${location_raw%%|*}"
location_state="${location_raw##*|}"
weather_str=$(fetch_weather)

# Output PAI branding line
case "$MODE" in
    nano)
        printf "${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${SLATE_400}v${PAI_VERSION}${RESET} ${PAI_TIME}${current_time}${RESET}\n"
        ;;
    micro)
        printf "${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${SLATE_400}v${PAI_VERSION}${RESET} ${SLATE_600}│${RESET} ${PAI_TIME}${current_time}${RESET} ${SLATE_600}│${RESET} ${PAI_WEATHER}${weather_str}${RESET}\n"
        ;;
    mini)
        printf "${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${SLATE_400}v${PAI_VERSION}${RESET} ${PAI_A}STATUSLINE:${RESET} ${PAI_CITY}${location_city}${RESET}${SLATE_600},${RESET} ${PAI_STATE}${location_state}${RESET} ${SLATE_600}│${RESET} ${PAI_TIME}${current_time}${RESET} ${SLATE_600}│${RESET} ${PAI_WEATHER}${weather_str}${RESET}\n"
        ;;
    normal)
        printf "${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${SLATE_400}v${PAI_VERSION}${RESET} ${PAI_A}STATUSLINE:${RESET} ${PAI_CITY}${location_city}${RESET}${SLATE_600},${RESET} ${PAI_STATE}${location_state}${RESET} ${SLATE_600}│${RESET} ${PAI_TIME}${current_time}${RESET} ${SLATE_600}│${RESET} ${PAI_WEATHER}${weather_str}${RESET}\n"
        ;;
esac

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 1: CONTEXT
# ═══════════════════════════════════════════════════════════════════════════════

# Format duration
duration_sec=$((duration_ms / 1000))
if   [ "$duration_sec" -ge 3600 ]; then time_display="$((duration_sec / 3600))h$((duration_sec % 3600 / 60))m"
elif [ "$duration_sec" -ge 60 ];   then time_display="$((duration_sec / 60))m$((duration_sec % 60))s"
else time_display="${duration_sec}s"
fi

# Calculate context usage
content_tokens=$((cache_read + input_tokens + cache_creation + output_tokens))
context_used=$((content_tokens + CONTEXT_BASELINE))

if [ "$context_max" -gt 0 ] && [ "$context_used" -gt 0 ]; then
    context_pct=$((context_used * 100 / context_max))
    context_k=$((context_used / 1000))
    max_k=$((context_max / 1000))
else
    context_pct=0; context_k=0; max_k=$((context_max / 1000))
fi

# Percentage color
[ "$context_pct" -le 33 ] && pct_color="$EMERALD" || { [ "$context_pct" -le 66 ] && pct_color='\033[38;2;251;191;36m' || pct_color="$ROSE"; }

case "$MODE" in
    nano)
        bar=$(render_context_bar 5 $context_pct)
        printf "${CTX_PRIMARY}◉${RESET} ${bar} ${pct_color}${context_pct}%%${RESET} ${CTX_ACCENT}⏱${RESET} ${SLATE_300}${time_display}${RESET}\n"
        ;;
    micro)
        bar=$(render_context_bar 6 $context_pct)
        printf "${CTX_PRIMARY}◉${RESET} ${bar} ${pct_color}${context_pct}%%${RESET} ${SLATE_500}(${context_k}k)${RESET} ${CTX_ACCENT}⏱${RESET} ${SLATE_300}${time_display}${RESET}\n"
        ;;
    mini)
        bar=$(render_context_bar 8 $context_pct)
        printf "${CTX_PRIMARY}◉${RESET} ${CTX_SECONDARY}CONTEXT:${RESET} ${bar} "
        printf "${pct_color}${context_pct}%%${RESET} ${SLATE_500}(${context_k}k/${max_k}k)${RESET} "
        printf "${CTX_ACCENT}⏱${RESET} ${SLATE_300}${time_display}${RESET}\n"
        ;;
    normal)
        bar=$(render_context_bar 16 $context_pct)
        printf "${CTX_PRIMARY}◉${RESET} ${CTX_SECONDARY}CONTEXT:${RESET} ${bar} "
        printf "${LAST_BUCKET_COLOR}${context_pct}%%${RESET} ${SLATE_500}(${context_k}k/${max_k}k)${RESET}"
        printf " ${SLATE_600}│${RESET} ${CTX_ACCENT}⏱${RESET} ${SLATE_300}${time_display}${RESET}\n"
        ;;
esac

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 4: GIT STATUS
# ═══════════════════════════════════════════════════════════════════════════════

if git rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null || echo "detached")
    modified=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
    untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
    stash_count=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
    total_changed=$((modified + staged))

    # Ahead/behind remote
    ahead_behind=$(git rev-list --left-right --count HEAD...@{u} 2>/dev/null)
    if [ -n "$ahead_behind" ]; then
        ahead=$(echo "$ahead_behind" | awk '{print $1}')
        behind=$(echo "$ahead_behind" | awk '{print $2}')
    else
        ahead=0 behind=0
    fi

    # Commit age with color
    last_commit_epoch=$(git log -1 --format='%ct' 2>/dev/null)
    if [ -n "$last_commit_epoch" ]; then
        now_epoch=$(date +%s)
        age_seconds=$((now_epoch - last_commit_epoch))
        age_minutes=$((age_seconds / 60))
        age_hours=$((age_seconds / 3600))
        age_days=$((age_seconds / 86400))

        if   [ "$age_minutes" -lt 1 ];  then age_display="now";         age_color="$GIT_AGE_FRESH"
        elif [ "$age_hours" -lt 1 ];    then age_display="${age_minutes}m"; age_color="$GIT_AGE_FRESH"
        elif [ "$age_hours" -lt 24 ];   then age_display="${age_hours}h";   age_color="$GIT_AGE_RECENT"
        elif [ "$age_days" -lt 7 ];     then age_display="${age_days}d";    age_color="$GIT_AGE_STALE"
        else age_display="${age_days}d"; age_color="$GIT_AGE_OLD"
        fi
    fi

    # Status indicator
    [ "$total_changed" -gt 0 ] || [ "$untracked" -gt 0 ] && git_status_icon="*" || git_status_icon="✓"

    case "$MODE" in
        nano)
            printf "${GIT_PRIMARY}◈${RESET} ${GIT_DIR}${dir_name}${RESET} ${GIT_VALUE}${branch}${RESET} "
            if [ "$git_status_icon" = "✓" ]; then
                printf "${GIT_CLEAN}✓${RESET}"
            else
                printf "${GIT_MODIFIED}*${total_changed}${RESET}"
            fi
            printf "\n"
            ;;
        micro)
            printf "${GIT_PRIMARY}◈${RESET} ${GIT_DIR}${dir_name}${RESET} ${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${age_color}${age_display}${RESET}"
            printf " "
            if [ "$git_status_icon" = "✓" ]; then
                printf "${GIT_CLEAN}${git_status_icon}${RESET}"
            else
                printf "${GIT_MODIFIED}${git_status_icon}${total_changed}${RESET}"
            fi
            printf "\n"
            ;;
        mini)
            printf "${GIT_PRIMARY}◈${RESET} ${GIT_DIR}${dir_name}${RESET} ${SLATE_600}│${RESET} "
            printf "${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${SLATE_600}│${RESET} ${age_color}${age_display}${RESET}"
            printf " ${SLATE_600}│${RESET} "
            if [ "$git_status_icon" = "✓" ]; then
                printf "${GIT_CLEAN}${git_status_icon}${RESET}"
            else
                printf "${GIT_MODIFIED}${git_status_icon}${total_changed}${RESET}"
                [ "$untracked" -gt 0 ] && printf " ${GIT_ADDED}+${untracked}${RESET}"
            fi
            printf "\n"
            ;;
        normal)
            printf "${GIT_PRIMARY}◈${RESET} ${GIT_PRIMARY}PWD:${RESET} ${GIT_DIR}${dir_name}${RESET} ${SLATE_600}│${RESET} "
            printf "${GIT_PRIMARY}Branch:${RESET} ${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${SLATE_600}│${RESET} ${GIT_PRIMARY}Age:${RESET} ${age_color}${age_display}${RESET}"
            [ "$stash_count" -gt 0 ] && printf " ${SLATE_600}│${RESET} ${GIT_PRIMARY}Stash:${RESET} ${GIT_STASH}${stash_count}${RESET}"
            if [ "$total_changed" -gt 0 ] || [ "$untracked" -gt 0 ]; then
                printf " ${SLATE_600}│${RESET} "
                [ "$total_changed" -gt 0 ] && printf "${GIT_PRIMARY}Mod:${RESET} ${GIT_MODIFIED}${total_changed}${RESET}"
                [ "$untracked" -gt 0 ] && { [ "$total_changed" -gt 0 ] && printf " "; printf "${GIT_PRIMARY}New:${RESET} ${GIT_ADDED}${untracked}${RESET}"; }
            else
                printf " ${SLATE_600}│${RESET} ${GIT_CLEAN}✓ clean${RESET}"
            fi
            if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
                printf " ${SLATE_600}│${RESET} ${GIT_PRIMARY}Sync:${RESET} "
                [ "$ahead" -gt 0 ] && printf "${GIT_CLEAN}↑${ahead}${RESET}"
                [ "$behind" -gt 0 ] && printf "${GIT_STASH}↓${behind}${RESET}"
            fi
            printf "\n"
            ;;
    esac
fi

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 5: LEARNING
# ═══════════════════════════════════════════════════════════════════════════════

case "$MODE" in
    nano)
        printf "${LEARN_PRIMARY}◎${RESET} ${LEARN_WORK}📁${RESET}${SLATE_300}${work_count}${RESET} ${LEARN_SIGNALS}✦${RESET}${SLATE_300}${ratings_count}${RESET}\n"
        ;;
    micro)
        printf "${LEARN_PRIMARY}◎${RESET} ${LEARN_WORK}📁${RESET}${SLATE_300}${work_count}${RESET} ${LEARN_SIGNALS}✦${RESET}${SLATE_300}${ratings_count}${RESET}\n"
        ;;
    mini)
        printf "${LEARN_PRIMARY}◎${RESET} ${LEARN_SECONDARY}LEARNING:${RESET} "
        printf "${LEARN_WORK}📁${RESET}${SLATE_300}${work_count}${RESET} "
        printf "${SLATE_600}│${RESET} ${LEARN_SIGNALS}✦${RESET}${SLATE_300}${ratings_count}${RESET}\n"
        ;;
    normal)
        printf "${LEARN_PRIMARY}◎${RESET} ${LEARN_SECONDARY}LEARNING:${RESET} "
        printf "${LEARN_WORK}📁${RESET}${SLATE_300}${work_count}${RESET} ${LEARN_WORK}Work${RESET} "
        printf "${SLATE_600}│${RESET} ${LEARN_SIGNALS}✦${RESET}${SLATE_300}${ratings_count}${RESET} ${LEARN_SIGNALS}Ratings${RESET}\n"
        ;;
esac

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 6: LEARNING SIGNAL (with sparklines in normal mode)
# ═══════════════════════════════════════════════════════════════════════════════

if [ -f "$RATINGS_FILE" ] && [ -s "$RATINGS_FILE" ]; then
    now=$(date +%s)

    # Single jq call computes all metrics
    eval "$(jq -rs --argjson now "$now" '
      # Parse ISO timestamp to epoch (handles timezone offsets)
      def to_epoch:
        (capture("(?<sign>[-+])(?<h>[0-9]{2}):(?<m>[0-9]{2})$") // {sign: "+", h: "00", m: "00"}) as $tz |
        gsub("[-+][0-9]{2}:[0-9]{2}$"; "Z") | gsub("\\.[0-9]+"; "") | fromdateiso8601 |
        . + (if $tz.sign == "-" then 1 else -1 end) * (($tz.h | tonumber) * 3600 + ($tz.m | tonumber) * 60);

      # Filter valid ratings and add epoch
      [.[] | select(.rating != null) | . + {epoch: (.timestamp | to_epoch)}] |

      # Time boundaries
      ($now - 900) as $q15_start | ($now - 3600) as $hour_start | ($now - 86400) as $today_start |
      ($now - 604800) as $week_start | ($now - 2592000) as $month_start |

      # Calculate averages
      (map(select(.epoch >= $q15_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $q15_avg |
      (map(select(.epoch >= $hour_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $hour_avg |
      (map(select(.epoch >= $today_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $today_avg |
      (map(select(.epoch >= $week_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $week_avg |
      (map(select(.epoch >= $month_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $month_avg |
      (map(.rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $all_avg |

      # Sparkline: diverging from 5, symmetric heights, color = direction
      def to_bar:
        floor |
        if . >= 10 then "\u001b[38;2;34;197;94m▅\u001b[0m"      # brightest green
        elif . >= 9 then "\u001b[38;2;74;222;128m▅\u001b[0m"    # green
        elif . >= 8 then "\u001b[38;2;134;239;172m▄\u001b[0m"   # light green
        elif . >= 7 then "\u001b[38;2;59;130;246m▃\u001b[0m"    # dark blue
        elif . >= 6 then "\u001b[38;2;96;165;250m▂\u001b[0m"    # blue
        elif . >= 5 then "\u001b[38;2;253;224;71m▁\u001b[0m"    # yellow baseline
        elif . >= 4 then "\u001b[38;2;253;186;116m▂\u001b[0m"   # light orange
        elif . >= 3 then "\u001b[38;2;251;146;60m▃\u001b[0m"    # orange
        elif . >= 2 then "\u001b[38;2;248;113;113m▄\u001b[0m"   # light red
        else "\u001b[38;2;239;68;68m▅\u001b[0m" end;            # red

      def make_sparkline($period_start):
        . as $all | ($now - $period_start) as $dur | ($dur / 58) as $sz |
        [range(58) | . as $i | ($period_start + ($i * $sz)) as $s | ($s + $sz) as $e |
          [$all[] | select(.epoch >= $s and .epoch < $e) | .rating] |
          if length == 0 then "\u001b[38;2;45;50;60m \u001b[0m" else (add / length) | to_bar end
        ] | join("");

      (make_sparkline($q15_start)) as $q15_sparkline |
      (make_sparkline($hour_start)) as $hour_sparkline |
      (make_sparkline($today_start)) as $day_sparkline |
      (make_sparkline($week_start)) as $week_sparkline |
      (make_sparkline($month_start)) as $month_sparkline |

      # Trend calculation helper
      def calc_trend($data):
        if ($data | length) >= 2 then
          (($data | length) / 2 | floor) as $half |
          ($data[-$half:] | add / length) as $recent |
          ($data[:$half] | add / length) as $older |
          ($recent - $older) | if . > 0.5 then "up" elif . < -0.5 then "down" else "stable" end
        else "stable" end;

      # Friendly summary helper (8 words max)
      def friendly_summary($avg; $trend; $period):
        if $avg == "—" then "No data yet for \($period)"
        elif ($avg | tonumber) >= 8 then
          if $trend == "up" then "Excellent and improving" elif $trend == "down" then "Great but cooling slightly" else "Smooth sailing, all good" end
        elif ($avg | tonumber) >= 6 then
          if $trend == "up" then "Good and getting better" elif $trend == "down" then "Okay but trending down" else "Solid, steady performance" end
        elif ($avg | tonumber) >= 4 then
          if $trend == "up" then "Recovering, headed right direction" elif $trend == "down" then "Needs attention, declining" else "Mixed results, room to improve" end
        else
          if $trend == "up" then "Rough but improving now" elif $trend == "down" then "Struggling, needs focus" else "Challenging period, stay sharp" end
        end;

      # Hour and day trends
      ([.[] | select(.epoch >= $hour_start) | .rating]) as $hour_data |
      ([.[] | select(.epoch >= $today_start) | .rating]) as $day_data |
      (calc_trend($hour_data)) as $hour_trend |
      (calc_trend($day_data)) as $day_trend |

      # Generate friendly summaries
      (friendly_summary($hour_avg; $hour_trend; "hour")) as $hour_summary |
      (friendly_summary($today_avg; $day_trend; "day")) as $day_summary |

      # Overall trend
      length as $total |
      (if $total >= 4 then
        (($total / 2) | floor) as $half |
        (.[- $half:] | map(.rating) | add / length) as $recent |
        (.[:$half] | map(.rating) | add / length) as $older |
        ($recent - $older) | if . > 0.3 then "up" elif . < -0.3 then "down" else "stable" end
      else "stable" end) as $trend |

      (last | .rating | tostring) as $latest |
      (last | .source // "explicit") as $latest_source |

      "latest=\($latest | @sh)\nlatest_source=\($latest_source | @sh)\n" +
      "q15_avg=\($q15_avg | @sh)\nhour_avg=\($hour_avg | @sh)\ntoday_avg=\($today_avg | @sh)\n" +
      "week_avg=\($week_avg | @sh)\nmonth_avg=\($month_avg | @sh)\nall_avg=\($all_avg | @sh)\n" +
      "q15_sparkline=\($q15_sparkline | @sh)\nhour_sparkline=\($hour_sparkline | @sh)\nday_sparkline=\($day_sparkline | @sh)\n" +
      "week_sparkline=\($week_sparkline | @sh)\nmonth_sparkline=\($month_sparkline | @sh)\n" +
      "hour_trend=\($hour_trend | @sh)\nday_trend=\($day_trend | @sh)\n" +
      "hour_summary=\($hour_summary | @sh)\nday_summary=\($day_summary | @sh)\n" +
      "trend=\($trend | @sh)\ntotal_count=\($total)"
    ' "$RATINGS_FILE" 2>/dev/null)"

    if [ "$total_count" -gt 0 ] 2>/dev/null; then
        # Trend icon/color
        case "$trend" in
            up)   trend_icon="↗"; trend_color="$EMERALD" ;;
            down) trend_icon="↘"; trend_color="$ROSE" ;;
            *)    trend_icon="→"; trend_color="$SLATE_400" ;;
        esac

        # Get colors
        [ "$q15_avg" != "—" ] && pulse_base="$q15_avg" || { [ "$hour_avg" != "—" ] && pulse_base="$hour_avg" || { [ "$today_avg" != "—" ] && pulse_base="$today_avg" || pulse_base="$all_avg"; }; }
        PULSE_COLOR=$(get_rating_color "$pulse_base")
        LATEST_COLOR=$(get_rating_color "${latest:-5}")
        Q15_COLOR=$(get_rating_color "${q15_avg:-5}")
        HOUR_COLOR=$(get_rating_color "${hour_avg:-5}")
        TODAY_COLOR=$(get_rating_color "${today_avg:-5}")
        WEEK_COLOR=$(get_rating_color "${week_avg:-5}")
        MONTH_COLOR=$(get_rating_color "${month_avg:-5}")
        ALL_COLOR=$(get_rating_color "$all_avg")

        [ "$latest_source" = "explicit" ] && src_label="EXP" || src_label="IMP"

        case "$MODE" in
            nano)
                printf "${SIGNAL_LABEL}◆${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET}\n"
                ;;
            micro)
                printf "${SIGNAL_LABEL}◆${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1h:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} ${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET}\n"
                ;;
            mini)
                printf "${SIGNAL_LABEL}◆${RESET} ${SIGNAL_COLOR}LEARNING SIGNAL:${RESET} ${SLATE_600}│${RESET} "
                printf "${LATEST_COLOR}${latest}${RESET} "
                printf "${SIGNAL_PERIOD}1h:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET}\n"
                ;;
            normal)
                printf "${SIGNAL_LABEL}◆${RESET} ${SIGNAL_COLOR}LEARNING SIGNAL:${RESET} ${SLATE_600}│${RESET} "
                printf "${LATEST_COLOR}${latest}${RESET}${SLATE_500}${src_label}${RESET} ${SLATE_600}│${RESET} "
                printf "${SIGNAL_PERIOD}15m:${RESET} ${Q15_COLOR}${q15_avg}${RESET} "
                printf "${SIGNAL_PERIOD}60m:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1mo:${RESET} ${MONTH_COLOR}${month_avg}${RESET}\n"

                # Sparklines (condensed, no blank lines)
                printf "   ${SLATE_600}├─${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "15m:" "$q15_sparkline"
                printf "   ${SLATE_600}├─${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "60m:" "$hour_sparkline"
                printf "   ${SLATE_600}├─${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1d:" "$day_sparkline"
                printf "   ${SLATE_600}├─${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1w:" "$week_sparkline"
                printf "   ${SLATE_600}└─${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1mo:" "$month_sparkline"
                ;;
        esac
    else
        printf "${SIGNAL_LABEL}◆${RESET} ${SIGNAL_LABEL}LEARNING SIGNAL:${RESET}\n"
        printf "  ${SLATE_500}No ratings yet${RESET}\n"
    fi
else
    printf "${SIGNAL_LABEL}◆${RESET} ${SIGNAL_LABEL}LEARNING SIGNAL:${RESET}\n"
    printf "  ${SLATE_500}No ratings yet${RESET}\n"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 7: QUOTE (normal mode only)
# ═══════════════════════════════════════════════════════════════════════════════

if [ "$MODE" = "normal" ]; then
    echo ""

    # Refresh quote if stale (>30s)
    quote_age=$(($(date +%s) - $(stat -f %m "$QUOTE_CACHE" 2>/dev/null || echo 0)))
    if [ "$quote_age" -gt 30 ] || [ ! -f "$QUOTE_CACHE" ]; then
        if [ -n "${ZENQUOTES_API_KEY:-}" ]; then
            new_quote=$(curl -s --max-time 1 "https://zenquotes.io/api/random/${ZENQUOTES_API_KEY}" 2>/dev/null | \
                jq -r '.[0] | select(.q | length < 80) | .q + "|" + .a' 2>/dev/null)
            [ -n "$new_quote" ] && [ "$new_quote" != "null" ] && echo "$new_quote" > "$QUOTE_CACHE"
        fi
    fi

    if [ -f "$QUOTE_CACHE" ]; then
        IFS='|' read -r quote_text quote_author < "$QUOTE_CACHE"
        printf "${QUOTE_PRIMARY}✦${RESET} ${SLATE_400}\"${quote_text}\"${RESET} ${QUOTE_AUTHOR}—${quote_author}${RESET}\n"
    fi
fi
