#!/usr/bin/env bun
/**
 * SummarizeVideo.ts - Generate AI summary of a YouTube video transcript
 *
 * Usage:
 *   bun run SummarizeVideo.ts --url <video_url> [--title "Video Title"]
 *   bun run SummarizeVideo.ts --file transcript.txt --title "Video Title"
 *   bun run SummarizeVideo.ts --stdin --title "Video Title"
 *   cat transcript.txt | bun run SummarizeVideo.ts --stdin --title "Video Title"
 */

import { parseArgs } from "util";
import { join } from "path";
import { $ } from "bun";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "", ".claude");
const PYTHON = join(PAI_DIR, "skills/YouTubeDigest/venv/bin/python3");
const SCRIPT = join(PAI_DIR, "skills/YouTubeDigest/Tools/fetch_transcript.py");

/**
 * Extract video ID from URL
 */
function extractVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return watchMatch[1];

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

/**
 * Fetch transcript for a video using Python helper
 */
async function fetchTranscript(videoId: string): Promise<string> {
  const result = await $`${PYTHON} ${SCRIPT} ${videoId}`.text();
  const data = JSON.parse(result);

  if (data.error) {
    throw new Error(data.error);
  }

  return data.transcript;
}

/**
 * Summarize transcript using Claude
 */
async function summarizeTranscript(
  transcript: string,
  title: string,
  channelName?: string
): Promise<string> {
  // Truncate very long transcripts
  const maxLength = 100000;
  const truncatedTranscript =
    transcript.length > maxLength
      ? transcript.slice(0, maxLength) + "\n\n[Transcript truncated...]"
      : transcript;

  const prompt = `You are summarizing a YouTube video for a busy AI researcher who wants to stay informed but doesn't have time to watch everything.

Video Title: ${title}
${channelName ? `Channel: ${channelName}` : ""}

Transcript:
${truncatedTranscript}

Create a concise summary in this exact format:

## ${title}
${channelName ? `**Channel:** ${channelName}` : ""}

### Key Points
- [Most important takeaway]
- [Second key point]
- [Third key point]
- [Add more if genuinely important, max 5]

### Notable Quotes
> "[One memorable quote from the video if applicable]"

### Bottom Line
[One sentence: Why should someone care about this? What's the actionable insight?]

---

Keep it scannable. No fluff. Focus on what's NEW or SURPRISING.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type === "text") {
    return content.text;
  }

  throw new Error("Unexpected response format");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      url: { type: "string" },
      transcript: { type: "string" },
      file: { type: "string", short: "f" },
      stdin: { type: "boolean" },
      title: { type: "string" },
      channel: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  const hasInput = values.url || values.transcript || values.file || values.stdin;

  if (values.help || !hasInput) {
    console.log(`
SummarizeVideo - Generate AI summary of a YouTube video

Usage:
  bun run SummarizeVideo.ts --url <video_url> [--title "Title"] [--channel "Channel"]
  bun run SummarizeVideo.ts --file <transcript.txt> --title "Title"
  bun run SummarizeVideo.ts --stdin --title "Title"

Options:
  --url <url>           YouTube video URL (will fetch transcript)
  --file, -f <path>     Read transcript from file
  --stdin               Read transcript from stdin (for piping)
  --transcript <text>   Direct transcript text (for short texts)
  --title <title>       Video title (required except with --url)
  --channel <name>      Channel name (optional)
  --json                Output as JSON
  -h, --help            Show this help

Examples:
  bun run SummarizeVideo.ts --url "https://youtube.com/watch?v=abc123"
  bun run SummarizeVideo.ts --file transcript.txt --title "AI News"
  cat transcript.txt | bun run SummarizeVideo.ts --stdin --title "AI News"
  pbpaste | bun run SummarizeVideo.ts --stdin --title "Pasted Video"
`);
    return;
  }

  let transcript: string;
  let title = values.title || "Untitled Video";

  if (values.url) {
    // Fetch from YouTube URL
    const videoId = extractVideoId(values.url);
    if (!videoId) {
      console.error("Could not extract video ID from URL");
      process.exit(1);
    }

    console.error(`Fetching transcript for ${videoId}...`);
    transcript = await fetchTranscript(videoId);
    console.error(`Got ${transcript.length} chars, summarizing...`);
  } else if (values.file) {
    // Read from file
    if (!values.title) {
      console.error("--title is required when using --file");
      process.exit(1);
    }
    try {
      transcript = await Bun.file(values.file).text();
      console.error(`Read ${transcript.length} chars from ${values.file}, summarizing...`);
    } catch (e) {
      console.error(`Could not read file: ${values.file}`);
      process.exit(1);
    }
  } else if (values.stdin) {
    // Read from stdin
    if (!values.title) {
      console.error("--title is required when using --stdin");
      process.exit(1);
    }
    console.error("Reading transcript from stdin...");
    transcript = await Bun.stdin.text();
    if (!transcript.trim()) {
      console.error("No input received from stdin");
      process.exit(1);
    }
    console.error(`Got ${transcript.length} chars, summarizing...`);
  } else {
    // Direct transcript text
    transcript = values.transcript!;
    if (!values.title) {
      console.error("--title is required when using --transcript");
      process.exit(1);
    }
  }

  const summary = await summarizeTranscript(transcript, title, values.channel);

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          title,
          channel: values.channel,
          summary,
          transcriptLength: transcript.length,
        },
        null,
        2
      )
    );
  } else {
    console.log(summary);
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
