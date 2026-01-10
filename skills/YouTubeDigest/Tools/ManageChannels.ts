#!/usr/bin/env bun
/**
 * ManageChannels.ts - Add, remove, and list YouTube channels to monitor
 *
 * Usage:
 *   bun run ManageChannels.ts --add <channel_url>
 *   bun run ManageChannels.ts --remove <channel_id>
 *   bun run ManageChannels.ts --list
 */

import { parseArgs } from "util";
import { join } from "path";

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "", ".claude");
const CHANNELS_PATH = join(PAI_DIR, "skills/YouTubeDigest/channels.json");

interface Channel {
  id: string;
  name: string;
}

interface ChannelsConfig {
  channels: Channel[];
}

async function loadChannels(): Promise<ChannelsConfig> {
  try {
    return await Bun.file(CHANNELS_PATH).json();
  } catch {
    return { channels: [] };
  }
}

async function saveChannels(config: ChannelsConfig): Promise<void> {
  await Bun.write(CHANNELS_PATH, JSON.stringify(config, null, 2));
}

/**
 * Extract channel ID from various YouTube URL formats
 */
function extractChannelId(url: string): string | null {
  // Handle @username format
  const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
  if (handleMatch) {
    // For handles, we'd need to resolve via API - return handle for now
    return `@${handleMatch[1]}`;
  }

  // Handle /channel/ID format
  const channelMatch = url.match(/\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return channelMatch[1];
  }

  // Handle /c/customname format
  const customMatch = url.match(/\/c\/([a-zA-Z0-9_-]+)/);
  if (customMatch) {
    return `/c/${customMatch[1]}`;
  }

  // Assume it's already a channel ID if it starts with UC
  if (url.startsWith("UC") && url.length === 24) {
    return url;
  }

  return null;
}

async function addChannel(url: string, name?: string): Promise<void> {
  const config = await loadChannels();
  const channelId = extractChannelId(url);

  if (!channelId) {
    console.error("Could not extract channel ID from URL:", url);
    console.error("Supported formats:");
    console.error("  - https://youtube.com/@ChannelHandle");
    console.error("  - https://youtube.com/channel/UC...");
    console.error("  - UC... (direct channel ID)");
    process.exit(1);
  }

  // Check if already exists
  if (config.channels.some((c) => c.id === channelId)) {
    console.log(`Channel ${channelId} already exists`);
    return;
  }

  const channelName = name || channelId;
  config.channels.push({ id: channelId, name: channelName });
  await saveChannels(config);
  console.log(`Added channel: ${channelName} (${channelId})`);
}

async function removeChannel(channelId: string): Promise<void> {
  const config = await loadChannels();
  const index = config.channels.findIndex((c) => c.id === channelId || c.name === channelId);

  if (index === -1) {
    console.error(`Channel not found: ${channelId}`);
    process.exit(1);
  }

  const removed = config.channels.splice(index, 1)[0];
  await saveChannels(config);
  console.log(`Removed channel: ${removed.name} (${removed.id})`);
}

async function listChannels(): Promise<void> {
  const config = await loadChannels();

  if (config.channels.length === 0) {
    console.log("No channels configured");
    return;
  }

  console.log("Monitored channels:");
  for (const channel of config.channels) {
    console.log(`  - ${channel.name} (${channel.id})`);
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      add: { type: "string" },
      remove: { type: "string" },
      list: { type: "boolean" },
      name: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || (!values.add && !values.remove && !values.list)) {
    console.log(`
ManageChannels - Add, remove, and list YouTube channels to monitor

Usage:
  bun run ManageChannels.ts --add <url> [--name "Channel Name"]
  bun run ManageChannels.ts --remove <channel_id>
  bun run ManageChannels.ts --list

Options:
  --add <url>       Add a YouTube channel URL
  --remove <id>     Remove a channel by ID or name
  --list            List all monitored channels
  --name <name>     Custom name for the channel (with --add)
  -h, --help        Show this help
`);
    return;
  }

  if (values.add) {
    await addChannel(values.add, values.name);
  } else if (values.remove) {
    await removeChannel(values.remove);
  } else if (values.list) {
    await listChannels();
  }
}

main().catch(console.error);
