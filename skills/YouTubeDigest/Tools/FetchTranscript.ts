#!/usr/bin/env bun
/**
 * FetchTranscript.ts - Fetch transcript for a YouTube video
 *
 * Usage:
 *   bun run FetchTranscript.ts --url <video_url>
 *   bun run FetchTranscript.ts --id <video_id>
 */

import { parseArgs } from "util";
import { join } from "path";
import { $ } from "bun";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "", ".claude");
const PYTHON = join(PAI_DIR, "skills/YouTubeDigest/venv/bin/python3");
const SCRIPT = join(PAI_DIR, "skills/YouTubeDigest/Tools/fetch_transcript.py");

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];

  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

/**
 * Fetch transcript using Python helper
 */
async function fetchTranscript(videoId: string): Promise<string> {
  const result = await $`${PYTHON} ${SCRIPT} ${videoId}`.text();
  const data = JSON.parse(result);

  if (data.error) {
    throw new Error(data.error);
  }

  return data.transcript;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      url: { type: "string" },
      id: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || (!values.url && !values.id)) {
    console.log(`
FetchTranscript - Fetch transcript for a YouTube video

Usage:
  bun run FetchTranscript.ts --url <video_url>
  bun run FetchTranscript.ts --id <video_id>

Options:
  --url <url>    YouTube video URL
  --id <id>      YouTube video ID (11 characters)
  --json         Output as JSON with metadata
  -h, --help     Show this help

Examples:
  bun run FetchTranscript.ts --url "https://youtube.com/watch?v=abc123xyz"
  bun run FetchTranscript.ts --id "abc123xyz"
`);
    return;
  }

  const videoId = values.id || extractVideoId(values.url || "");

  if (!videoId) {
    console.error("Could not extract video ID from URL");
    process.exit(1);
  }

  try {
    const transcript = await fetchTranscript(videoId);

    if (values.json) {
      console.log(
        JSON.stringify(
          {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            transcript,
            length: transcript.length,
          },
          null,
          2
        )
      );
    } else {
      console.log(transcript);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
