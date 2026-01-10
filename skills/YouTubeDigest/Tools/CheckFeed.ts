#!/usr/bin/env bun
/**
 * CheckFeed.ts - Check YouTube RSS feeds for new videos
 *
 * Usage:
 *   bun run CheckFeed.ts [--json] [--all]
 */

import { parseArgs } from "util";
import { join } from "path";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "", ".claude");
const CHANNELS_PATH = join(PAI_DIR, "skills/YouTubeDigest/channels.json");
const STATE_PATH = join(PAI_DIR, "skills/YouTubeDigest/state/processed.json");

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

/**
 * Parse YouTube RSS feed XML
 */
function parseRssFeed(xml: string, channelName: string): Video[] {
  const videos: Video[] = [];

  // Extract channel ID from feed
  const channelIdMatch = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
  const channelId = channelIdMatch ? channelIdMatch[1] : "unknown";

  // Extract entries
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
        title: titleMatch[1],
        channelId,
        channelName,
        published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
      });
    }
  }

  return videos;
}

/**
 * Fetch RSS feed for a channel
 */
async function fetchChannelFeed(channel: Channel): Promise<Video[]> {
  // Handle different ID formats
  let feedUrl: string;

  if (channel.id.startsWith("UC")) {
    // Standard channel ID
    feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  } else if (channel.id.startsWith("@")) {
    // Handle format - need to resolve via page scrape or use channel ID
    console.error(`  Warning: Handle format ${channel.id} not supported for RSS. Please use channel ID.`);
    return [];
  } else {
    // Try as channel ID anyway
    feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  }

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      console.error(`  Failed to fetch feed for ${channel.name}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRssFeed(xml, channel.name);
  } catch (error) {
    console.error(`  Error fetching feed for ${channel.name}:`, error);
    return [];
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      json: { type: "boolean" },
      all: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
CheckFeed - Check YouTube RSS feeds for new videos

Usage:
  bun run CheckFeed.ts [--json] [--all]

Options:
  --json    Output as JSON
  --all     Show all videos, not just new ones
  -h, --help Show this help
`);
    return;
  }

  const channels = await loadChannels();
  const state = await loadState();

  if (channels.length === 0) {
    console.error("No channels configured. Use ManageChannels.ts --add to add channels.");
    process.exit(1);
  }

  if (!values.json) {
    console.log(`Checking ${channels.length} channels...`);
  }

  const allVideos: Video[] = [];

  for (const channel of channels) {
    if (!values.json) {
      console.log(`  Fetching ${channel.name}...`);
    }
    const videos = await fetchChannelFeed(channel);
    allVideos.push(...videos);
  }

  // Filter to only new videos (not in processed list)
  const newVideos = values.all
    ? allVideos
    : allVideos.filter((v) => !state.videos.includes(v.id));

  // Sort by published date (newest first)
  newVideos.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

  if (values.json) {
    console.log(JSON.stringify(newVideos, null, 2));
  } else {
    if (newVideos.length === 0) {
      console.log("\nNo new videos found.");
    } else {
      console.log(`\nFound ${newVideos.length} new video(s):\n`);
      for (const video of newVideos) {
        const date = new Date(video.published).toLocaleDateString();
        console.log(`  [${date}] ${video.channelName}: ${video.title}`);
        console.log(`           ${video.url}\n`);
      }
    }
  }
}

main().catch(console.error);
