import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/YouTubeDigest/Tools/ManageChannels.ts");

describe("ManageChannels", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* ManageChannels.ts");
      expect(content).toContain("Add, remove, and list YouTube channels");
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });

    test("imports join from path", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { join } from "path"');
    });
  });

  describe("type definitions", () => {
    test("defines Channel interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface Channel");
      expect(content).toContain("id: string");
      expect(content).toContain("name: string");
    });

    test("defines ChannelsConfig interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface ChannelsConfig");
      expect(content).toContain("channels: Channel[]");
    });
  });

  describe("environment configuration", () => {
    test("uses PAI_DIR environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
    });

    test("defines CHANNELS_PATH", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/channels.json");
    });
  });

  describe("loadChannels function", () => {
    test("reads from channels.json", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.file(CHANNELS_PATH).json()");
    });

    test("returns empty array on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return { channels: [] }");
    });
  });

  describe("saveChannels function", () => {
    test("writes to channels.json", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.write(CHANNELS_PATH");
    });

    test("formats JSON with indentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("JSON.stringify(config, null, 2)");
    });
  });

  describe("extractChannelId function", () => {
    test("handles @username format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("@([a-zA-Z0-9_-]+)");
    });

    test("handles /channel/ID format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("\\/channel\\/([a-zA-Z0-9_-]+)");
    });

    test("handles /c/customname format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("\\/c\\/([a-zA-Z0-9_-]+)");
    });

    test("validates UC channel ID format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('url.startsWith("UC")');
      expect(content).toContain("url.length === 24");
    });

    test("returns null for invalid URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return null");
    });
  });

  describe("addChannel function", () => {
    test("checks for duplicate channels", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("config.channels.some((c) => c.id === channelId)");
    });

    test("logs when channel already exists", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("already exists");
    });

    test("pushes new channel to array", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("config.channels.push({ id: channelId, name: channelName })");
    });

    test("uses custom name or defaults to ID", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("name || channelId");
    });

    test("logs added channel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Added channel:");
    });
  });

  describe("removeChannel function", () => {
    test("finds channel by ID or name", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("c.id === channelId || c.name === channelId");
    });

    test("errors when channel not found", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Channel not found:");
      expect(content).toContain("process.exit(1)");
    });

    test("splices channel from array", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("config.channels.splice(index, 1)");
    });

    test("logs removed channel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Removed channel:");
    });
  });

  describe("listChannels function", () => {
    test("handles empty channel list", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No channels configured");
    });

    test("displays monitored channels header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Monitored channels:");
    });

    test("iterates and logs each channel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("for (const channel of config.channels)");
    });
  });

  describe("argument parsing", () => {
    test("defines --add option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('add: { type: "string" }');
    });

    test("defines --remove option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('remove: { type: "string" }');
    });

    test("defines --list option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('list: { type: "boolean" }');
    });

    test("defines --name option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('name: { type: "string" }');
    });

    test("allows positional arguments", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("allowPositionals: true");
    });
  });

  describe("help output", () => {
    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("ManageChannels");
      expect(stdout).toContain("Usage:");
    });

    test("documents add command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--add <url>");
      expect(content).toContain("Add a YouTube channel URL");
    });

    test("documents remove command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--remove <id>");
      expect(content).toContain("Remove a channel by ID or name");
    });

    test("documents list command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--list");
      expect(content).toContain("List all monitored channels");
    });

    test("documents name option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--name <name>");
      expect(content).toContain("Custom name for the channel");
    });
  });

  describe("command routing", () => {
    test("shows help when no command provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!values.add && !values.remove && !values.list");
    });

    test("routes to addChannel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.add)");
      expect(content).toContain("addChannel(values.add, values.name)");
    });

    test("routes to removeChannel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("else if (values.remove)");
      expect(content).toContain("removeChannel(values.remove)");
    });

    test("routes to listChannels", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("else if (values.list)");
      expect(content).toContain("listChannels()");
    });
  });

  describe("error handling", () => {
    test("shows supported URL formats on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Supported formats:");
      expect(content).toContain("youtube.com/@ChannelHandle");
      expect(content).toContain("youtube.com/channel/UC");
    });

    test("has global error handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("main().catch(console.error)");
    });
  });
});
