"""
Model Extractor Utility
Extracts model name from Claude Code transcript with caching.
"""

import json
import os
import time
from pathlib import Path

# Set to False to disable caching and always read from transcript
ENABLE_CACHING = False


def get_model_from_transcript(session_id: str, transcript_path: str, ttl: int = 60) -> str:
    """
    Extract model name from transcript with file-based caching.

    Args:
        session_id: Claude session ID
        transcript_path: Path to the .jsonl transcript file
        ttl: Cache time-to-live in seconds (default: 60)

    Returns:
        Model name string (e.g., "claude-haiku-4-5-20251001") or empty string if not found
    """
    # Set up cache directory - use environment variable or default
    pai_dir = Path(os.environ.get("PAI_DIR", Path.home() / ".claude"))
    cache_dir = pai_dir / "data" / "claude-model-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    cache_file = cache_dir / f"{session_id}.json"
    current_time = time.time()

    # Try to read from cache (only if caching is enabled)
    if ENABLE_CACHING and cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)

            # Check if cache is still fresh
            cache_age = current_time - cache_data.get('timestamp', 0)
            if cache_age < ttl:
                return cache_data.get('model', '')
        except (json.JSONDecodeError, IOError):
            # Cache file corrupted or unreadable, will regenerate
            pass

    # Cache miss or stale - extract from transcript
    model_name = extract_model_from_transcript(transcript_path)

    # Save to cache (only if caching is enabled)
    if ENABLE_CACHING:
        try:
            cache_data = {
                'model': model_name,
                'timestamp': current_time,
                'ttl': ttl
            }
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f)
        except IOError:
            # Cache write failed, not critical - continue without cache
            pass

    return model_name


def extract_model_from_transcript(transcript_path: str) -> str:
    """
    Extract model name from transcript by finding most recent assistant message.

    Args:
        transcript_path: Path to the .jsonl transcript file

    Returns:
        Model name string or empty string if not found
    """
    if not os.path.exists(transcript_path):
        return ''

    model_name = ''

    try:
        # Read transcript file in reverse to find most recent assistant message
        # We'll read the whole file since we need to find the LAST occurrence
        with open(transcript_path, 'r') as f:
            lines = f.readlines()

        # Iterate in reverse to find most recent assistant message with model
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue

            try:
                entry = json.loads(line)

                # Check if this is an assistant message with a model field
                if (entry.get('type') == 'assistant' and
                    'message' in entry and
                    'model' in entry['message']):
                    model_name = entry['message']['model']
                    break  # Found the most recent one

            except json.JSONDecodeError:
                # Skip invalid JSON lines
                continue

    except IOError:
        # File read error
        return ''

    return model_name


if __name__ == '__main__':
    # Test the extractor
    import sys

    if len(sys.argv) < 3:
        print("Usage: python model_extractor.py <session_id> <transcript_path>")
        sys.exit(1)

    session_id = sys.argv[1]
    transcript_path = sys.argv[2]

    model = get_model_from_transcript(session_id, transcript_path)
    print(f"Model: {model}")
