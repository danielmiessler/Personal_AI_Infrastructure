#!/usr/bin/env python3
"""
fetch_transcript.py - Python helper for fetching YouTube transcripts

Proxy auto-loaded from config.json:
- Webshare (recommended): Set type="webshare" with credentials
- Generic: Set type="generic" with generic_url
"""

import os
import sys
import json
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi

def get_api_with_proxy():
    """Create API instance with proxy from config"""
    config_path = Path(__file__).parent.parent / "config.json"

    if not config_path.exists():
        return YouTubeTranscriptApi(), False

    try:
        with open(config_path) as f:
            config = json.load(f)

        proxy_config = config.get("proxy", {})

        if not proxy_config.get("enabled"):
            return YouTubeTranscriptApi(), False

        proxy_type = proxy_config.get("type", "generic")

        if proxy_type == "webshare":
            # Native Webshare support (recommended)
            from youtube_transcript_api.proxies import WebshareProxyConfig
            username = proxy_config.get("webshare_username")
            password = proxy_config.get("webshare_password")

            if username and password:
                return YouTubeTranscriptApi(
                    proxy_config=WebshareProxyConfig(
                        proxy_username=username,
                        proxy_password=password
                    )
                ), True

        elif proxy_type == "generic":
            # Generic proxy URL
            from youtube_transcript_api.proxies import GenericProxyConfig
            url = proxy_config.get("generic_url") or os.environ.get("YOUTUBE_PROXY")

            if url:
                return YouTubeTranscriptApi(
                    proxy_config=GenericProxyConfig(http_url=url, https_url=url)
                ), True

    except Exception as e:
        print(json.dumps({"warning": f"Proxy config error: {e}"}), file=sys.stderr)

    return YouTubeTranscriptApi(), False

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video ID provided"}))
        sys.exit(1)

    video_id = sys.argv[1]

    try:
        api, proxy_used = get_api_with_proxy()
        transcript = api.fetch(video_id)
        text = " ".join([seg.text for seg in transcript])

        print(json.dumps({
            "videoId": video_id,
            "transcript": text,
            "segments": len(transcript),
            "proxy_used": proxy_used
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
