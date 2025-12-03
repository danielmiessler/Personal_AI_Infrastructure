#!/usr/bin/env bun
/**
 * Populate PAI Test Cases channel with all test messages
 *
 * Usage:
 *   bun run test/populate-channel.ts [--dry-run] [--filter TEST-ID]
 *
 * This script:
 * 1. Reads all test cases from the registry
 * 2. Sends each test case to PAI Test Cases channel
 * 3. Updates fixtures with new message data
 */

import { getConfig } from "../lib/config";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { parse } from "csv-parse/sync";

interface TestCase {
  test_id: string;
  category: string;
  name: string;
  input_type: string;
  file_required: string;
  caption: string;
  source_file: string;
  fixture_status: string;
  notes: string;
}

interface Fixture {
  _meta: {
    testId: string;
    capturedAt?: string;
    capturedBy?: string;
    description?: string;
    synthetic?: boolean;
    [key: string]: any;
  };
  message: any;
}

async function sendMessage(token: string, chatId: string, text: string): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendMessage failed: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendPhoto(token: string, chatId: string, photoId: string, caption?: string): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoId, caption }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendPhoto failed: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendDocument(token: string, chatId: string, documentId: string, caption?: string): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, document: documentId, caption }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendDocument failed: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendVoice(token: string, chatId: string, voiceId: string, caption?: string): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/sendVoice`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, voice: voiceId, caption }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendVoice failed: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendAudio(token: string, chatId: string, audioId: string, caption?: string): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/sendAudio`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, audio: audioId, caption }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`sendAudio failed: ${JSON.stringify(data)}`);
  return data.result;
}

function findFixture(testId: string, fixturesDir: string): Fixture | null {
  // Search through all fixture subdirectories
  const subdirs = ["scope", "date", "archive", "regression", "voice"];
  for (const subdir of subdirs) {
    const path = join(fixturesDir, subdir, `${testId}.json`);
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf-8"));
    }
  }
  return null;
}

function getSourceFixture(tc: TestCase, fixturesDir: string): Fixture | null {
  // Check if this test reuses another fixture
  const sourceFile = tc.source_file;
  if (sourceFile?.startsWith("[REUSES ")) {
    const match = sourceFile.match(/\[REUSES ([^\]]+)\]/);
    if (match) {
      const sourceTestId = match[1].replace("] ", "").trim();
      return findFixture(sourceTestId, fixturesDir);
    }
  }
  // Otherwise try to find its own fixture
  return findFixture(tc.test_id, fixturesDir);
}

function getCaptionText(tc: TestCase): string {
  // Caption from registry, strip the test ID prefix if present
  let caption = tc.caption || "";
  // The caption in registry already includes [TEST-ID] prefix
  return caption;
}

function getFixtureDir(category: string): string {
  switch (category) {
    case "scope": return "scope";
    case "date": return "date";
    case "archive": return "archive";
    case "voice": return "voice";
    default: return "regression";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filterIdx = args.indexOf("--filter");
  const filter = filterIdx >= 0 ? args[filterIdx + 1] : null;
  const startFromIdx = args.indexOf("--start-from");
  const startFrom = startFromIdx >= 0 ? args[startFromIdx + 1] : null;

  const config = getConfig();
  const token = config.telegramBotToken;
  const testCasesChannel = config.testTelegramCasesId;

  if (!testCasesChannel) {
    console.error("ERROR: TEST_TELEGRAM_CASES_ID not set in environment");
    console.error("Add to ~/.claude/.env: TEST_TELEGRAM_CASES_ID=<your-channel-id>");
    process.exit(1);
  }

  const testDir = dirname(new URL(import.meta.url).pathname);
  const registryPath = join(testDir, "test-case-registry.csv");
  const fixturesDir = join(testDir, "fixtures");

  // Parse registry
  const csvContent = readFileSync(registryPath, "utf-8");
  const records: TestCase[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${records.length} test cases in registry`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Channel: ${testCasesChannel}`);
  if (filter) console.log(`Filter: ${filter}`);
  if (startFrom) console.log(`Starting from: ${startFrom}`);
  console.log("");

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let foundStart = !startFrom; // If no startFrom, start immediately

  for (const tc of records) {
    // Skip until we find the start-from test ID
    if (!foundStart) {
      if (tc.test_id === startFrom) {
        foundStart = true;
      } else {
        continue;
      }
    }

    // Skip if filtered
    if (filter && !tc.test_id.includes(filter)) continue;

    // Skip if status is 'skip'
    if (tc.fixture_status === "skip") {
      console.log(`SKIP ${tc.test_id}: marked as skip`);
      skipped++;
      continue;
    }

    const caption = getCaptionText(tc);
    const inputType = tc.input_type;

    try {
      if (inputType === "text" || inputType === "url") {
        // Text-only message
        if (dryRun) {
          console.log(`DRY: ${tc.test_id} -> sendMessage("${caption.substring(0, 60)}...")`);
        } else {
          const result = await sendMessage(token, testCasesChannel, caption);
          console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (text)`);

          // Save/update fixture
          const fixtureSubdir = getFixtureDir(tc.category);
          const fixturePath = join(fixturesDir, fixtureSubdir, `${tc.test_id}.json`);
          mkdirSync(dirname(fixturePath), { recursive: true });

          const fixture: Fixture = {
            _meta: {
              testId: tc.test_id,
              capturedAt: new Date().toISOString(),
              capturedBy: "populate-channel",
              description: tc.name,
            },
            message: result,
          };
          writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
        }
        sent++;

      } else if (inputType === "photo") {
        // Photo - need file_id from source fixture
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        if (!sourceFixture?.message?.photo) {
          console.log(`ERROR ${tc.test_id}: no photo fixture found`);
          errors++;
          continue;
        }
        const photoId = sourceFixture.message.photo[sourceFixture.message.photo.length - 1].file_id;

        if (dryRun) {
          console.log(`DRY: ${tc.test_id} -> sendPhoto(file_id, "${caption.substring(0, 40)}...")`);
        } else {
          const result = await sendPhoto(token, testCasesChannel, photoId, caption || undefined);
          console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (photo)`);

          const fixtureSubdir = getFixtureDir(tc.category);
          const fixturePath = join(fixturesDir, fixtureSubdir, `${tc.test_id}.json`);
          mkdirSync(dirname(fixturePath), { recursive: true });

          const fixture: Fixture = {
            _meta: {
              testId: tc.test_id,
              capturedAt: new Date().toISOString(),
              capturedBy: "populate-channel",
              description: tc.name,
            },
            message: result,
          };
          writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
        }
        sent++;

      } else if (inputType === "document") {
        // Document - need file_id from source fixture
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        if (!sourceFixture?.message?.document) {
          console.log(`ERROR ${tc.test_id}: no document fixture found`);
          errors++;
          continue;
        }
        const docId = sourceFixture.message.document.file_id;

        if (dryRun) {
          console.log(`DRY: ${tc.test_id} -> sendDocument(file_id, "${caption.substring(0, 40)}...")`);
        } else {
          const result = await sendDocument(token, testCasesChannel, docId, caption || undefined);
          console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (document)`);

          const fixtureSubdir = getFixtureDir(tc.category);
          const fixturePath = join(fixturesDir, fixtureSubdir, `${tc.test_id}.json`);
          mkdirSync(dirname(fixturePath), { recursive: true });

          const fixture: Fixture = {
            _meta: {
              testId: tc.test_id,
              capturedAt: new Date().toISOString(),
              capturedBy: "populate-channel",
              description: tc.name,
            },
            message: result,
          };
          writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
        }
        sent++;

      } else if (inputType === "voice") {
        // Voice memo - need file_id from fixture
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        if (!sourceFixture?.message?.voice && !sourceFixture?.message?.audio) {
          console.log(`ERROR ${tc.test_id}: no voice/audio fixture found`);
          errors++;
          continue;
        }

        // Voice messages use sendVoice, audio files use sendAudio
        if (sourceFixture.message.voice) {
          const voiceId = sourceFixture.message.voice.file_id;
          if (dryRun) {
            console.log(`DRY: ${tc.test_id} -> sendVoice(file_id, "${caption.substring(0, 40)}...")`);
          } else {
            const result = await sendVoice(token, testCasesChannel, voiceId, caption || undefined);
            console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (voice)`);

            const fixturePath = join(fixturesDir, "voice", `${tc.test_id}.json`);
            mkdirSync(dirname(fixturePath), { recursive: true });

            const fixture: Fixture = {
              _meta: {
                testId: tc.test_id,
                capturedAt: new Date().toISOString(),
                capturedBy: "populate-channel",
                description: tc.name,
              },
              message: result,
            };
            writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
          }
        } else {
          // It's actually an audio file (forwarded)
          const audioId = sourceFixture.message.audio.file_id;
          if (dryRun) {
            console.log(`DRY: ${tc.test_id} -> sendAudio(file_id, "${caption.substring(0, 40)}...")`);
          } else {
            const result = await sendAudio(token, testCasesChannel, audioId, caption || undefined);
            console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (audio)`);

            const fixturePath = join(fixturesDir, "voice", `${tc.test_id}.json`);
            mkdirSync(dirname(fixturePath), { recursive: true });

            const fixture: Fixture = {
              _meta: {
                testId: tc.test_id,
                capturedAt: new Date().toISOString(),
                capturedBy: "populate-channel",
                description: tc.name,
              },
              message: result,
            };
            writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
          }
        }
        sent++;

      } else if (inputType === "audio") {
        // Audio file (MP3 etc)
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        if (!sourceFixture?.message?.audio) {
          console.log(`ERROR ${tc.test_id}: no audio fixture found`);
          errors++;
          continue;
        }
        const audioId = sourceFixture.message.audio.file_id;

        if (dryRun) {
          console.log(`DRY: ${tc.test_id} -> sendAudio(file_id, "${caption.substring(0, 40)}...")`);
        } else {
          const result = await sendAudio(token, testCasesChannel, audioId, caption || undefined);
          console.log(`SENT ${tc.test_id}: msg_id=${result.message_id} (audio)`);

          const fixturePath = join(fixturesDir, "voice", `${tc.test_id}.json`);
          mkdirSync(dirname(fixturePath), { recursive: true });

          const fixture: Fixture = {
            _meta: {
              testId: tc.test_id,
              capturedAt: new Date().toISOString(),
              capturedBy: "populate-channel",
              description: tc.name,
            },
            message: result,
          };
          writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
        }
        sent++;

      } else {
        console.log(`UNKNOWN ${tc.test_id}: input_type=${inputType}`);
        errors++;
      }

      // Rate limit - 2 seconds between messages to avoid 429
      if (!dryRun) await Bun.sleep(2000);

    } catch (err: any) {
      console.log(`ERROR ${tc.test_id}: ${err.message}`);
      errors++;
    }
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`Sent: ${sent}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
