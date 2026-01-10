#!/usr/bin/env bun
/**
 * RunDigest.ts - Full pipeline: check feeds → fetch transcripts → summarize → send to Telegram
 *
 * Usage:
 *   bun run RunDigest.ts [--dry-run] [--limit 5]
 */

import { parseArgs } from "util";
import { join } from "path";
import { $ } from "bun";
import Anthropic from "@anthropic-ai/sdk";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "", ".claude");
const CHANNELS_PATH = join(PAI_DIR, "skills/YouTubeDigest/channels.json");
const STATE_PATH = join(PAI_DIR, "skills/YouTubeDigest/state/processed.json");
const TELEGRAM_TOOL = join(PAI_DIR, "skills/TelegramDelivery/Tools/SendToTelegram.ts");
const PYTHON = join(PAI_DIR, "skills/YouTubeDigest/venv/bin/python3");
const TRANSCRIPT_SCRIPT = join(PAI_DIR, "skills/YouTubeDigest/Tools/fetch_transcript.py");

const client = new Anthropic();

interface Channel {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  published: string;
  url: string;
}

interface State {
  videos: string[];
  lastRun: string | null;
}


// ============= Data Loading =============

async function loadChannels(): Promise<Channel[]> {
  try {
    const config = await Bun.file(CHANNELS_PATH).json();
    return config.channels || [];
  } catch {
    return [];
  }
}

async function loadState(): Promise<State> {
  try {
    return await Bun.file(STATE_PATH).json();
  } catch {
    return { videos: [], lastRun: null };
  }
}

async function saveState(state: State): Promise<void> {
  await Bun.write(STATE_PATH, JSON.stringify(state, null, 2));
}

// ============= RSS Parsing =============

function parseRssFeed(xml: string, channelName: string): Video[] {
  const videos: Video[] = [];
  const channelIdMatch = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
  const channelId = channelIdMatch ? channelIdMatch[1] : "unknown";

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

    if (videoIdMatch && titleMatch) {
      videos.push({
        id: videoIdMatch[1],
        title: titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        channelId,
        channelName,
        published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
      });
    }
  }

  return videos;
}

async function fetchChannelFeed(channel: Channel): Promise<Video[]> {
  if (!channel.id.startsWith("UC")) {
    console.error(`  Skipping ${channel.name}: Handle format not supported`);
    return [];
  }

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) return [];
    const xml = await response.text();
    return parseRssFeed(xml, channel.name);
  } catch {
    return [];
  }
}

// ============= Transcript & Summary =============

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const result = await $`${PYTHON} ${TRANSCRIPT_SCRIPT} ${videoId}`.text();
    const data = JSON.parse(result);

    if (data.error) {
      return null;
    }

    return data.transcript;
  } catch {
    return null;
  }
}

async function summarizeTranscript(transcript: string, title: string, channelName: string): Promise<string> {
  const maxLength = 100000;
  const truncated = transcript.length > maxLength ? transcript.slice(0, maxLength) + "..." : transcript;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `Summarize this YouTube video for a busy AI researcher.

Title: ${title}
Channel: ${channelName}

Transcript:
${truncated}

Format:
## ${title}
**${channelName}**

### Key Points
- [Point 1]
- [Point 2]
- [Point 3]

### Bottom Line
[One sentence takeaway]

---

Be concise. Focus on what's NEW or SURPRISING.`,
      },
    ],
  });

  const content = response.content[0];
  return content.type === "text" ? content.text : "";
}

// ============= Telegram Delivery =============

async function sendToTelegram(message: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log("\n[DRY RUN] Would send to Telegram:");
    console.log(message);
    return;
  }

  // Write message to temp file
  const tempFile = `/tmp/youtube-digest-${Date.now()}.md`;
  await Bun.write(tempFile, message);

  try {
    // Send via Telegram tool
    await $`bun run ${TELEGRAM_TOOL} -f ${tempFile} -c "🎬 YouTube AI Digest"`.quiet();
    console.log("✅ Sent to Telegram");
  } catch (error) {
    console.error("Failed to send to Telegram:", error);
    // Fallback: just output the message
    console.log("\n📋 Digest (Telegram delivery failed):\n");
    console.log(message);
  }
}

// ============= Main Pipeline =============

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "dry-run": { type: "boolean" },
      limit: { type: "string", default: "10" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
RunDigest - Full YouTube digest pipeline

Usage:
  bun run RunDigest.ts [--dry-run] [--limit 5]

Options:
  --dry-run     Don't send to Telegram, just preview
  --limit <n>   Max videos to process (default: 10)
  -h, --help    Show this help
`);
    return;
  }

  const dryRun = values["dry-run"] || false;
  const limit = parseInt(values.limit || "10", 10);

  console.log(`🎬 YouTube Digest Pipeline${dryRun ? " (DRY RUN)" : ""}`);
  console.log("=".repeat(40));

  // 1. Load channels and state
  const channels = await loadChannels();
  const state = await loadState();

  if (channels.length === 0) {
    console.error("No channels configured. Use ManageChannels.ts --add to add channels.");
    process.exit(1);
  }

  console.log(`\n📺 Checking ${channels.length} channels...`);

  // 2. Fetch all feeds
  const allVideos: Video[] = [];
  for (const channel of channels) {
    const videos = await fetchChannelFeed(channel);
    allVideos.push(...videos);
  }

  // 3. Filter to new videos only
  const newVideos = allVideos
    .filter((v) => !state.videos.includes(v.id))
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, limit);

  if (newVideos.length === 0) {
    console.log("\n✅ No new videos to process.");
    state.lastRun = new Date().toISOString();
    await saveState(state);
    return;
  }

  console.log(`\n🆕 Found ${newVideos.length} new video(s) to process...\n`);

  // 4. Process each video
  const summaries: string[] = [];
  const processedIds: string[] = [];

  for (const video of newVideos) {
    console.log(`  📹 ${video.channelName}: ${video.title}`);

    // Fetch transcript
    const transcript = await fetchTranscript(video.id);
    if (!transcript) {
      console.log(`     ⚠️ No transcript available, skipping`);
      continue;
    }

    console.log(`     📝 Got transcript (${transcript.length} chars), summarizing...`);

    // Summarize
    try {
      const summary = await summarizeTranscript(transcript, video.title, video.channelName);
      summaries.push(summary);
      processedIds.push(video.id);
      console.log(`     ✅ Summarized`);
    } catch (error) {
      console.log(`     ❌ Summary failed: ${error}`);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (summaries.length === 0) {
    console.log("\n⚠️ No videos could be summarized.");
    return;
  }

  // 5. Combine into digest
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const digest = `# 🎬 AI YouTube Digest
**${date}**

${summaries.length} new video(s) summarized

---

${summaries.join("\n\n")}

---
*Generated by YouTubeDigest skill*`;

  // 6. Send to Telegram
  await sendToTelegram(digest, dryRun);

  // 7. Update state
  if (!dryRun) {
    state.videos.push(...processedIds);
    state.lastRun = new Date().toISOString();
    await saveState(state);
    console.log(`\n📊 Updated state: ${processedIds.length} videos marked as processed`);
  }

  console.log("\n✅ Digest complete!");
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
