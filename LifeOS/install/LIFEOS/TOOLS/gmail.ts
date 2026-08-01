#!/usr/bin/env bun
// Direct Gmail API client using OAuth refresh token.
// Usage:
//   gmail.ts count "<q>"                           # inbox-size estimate for query
//   gmail.ts ids   "<q>" [max]                     # list message IDs (default max 500)
//   gmail.ts archive <id>[,id,...]                 # remove INBOX label in batch (up to 1000)
//   gmail.ts fetch <id>                            # minimal From/Subject/snippet JSON
//   gmail.ts send --to ADDR --subject SUBJ (--body-file PATH | --body-stdin) [--html]
//                 [--cc ADDR] [--bcc ADDR] [--from ADDR] [--reply-to ADDR]
//                 [--reply-to-id GMAIL_ID]         # auto-thread to this message
//
// send command sends as the authenticated Gmail user. Gmail signs with its own DKIM,
// so no DMARC alignment issues that SES has.
//
// Credentials path is resolved in order:
//   1. $GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE (settings.json env)
//   2. LifeosConfig integrations.google.credentialsFile (LIFEOS_CONFIG.toml)
//   3. {paiUserDir}/CONFIG/CREDENTIALS/google/credentials.json (conventional fallback)

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadLifeosConfig, paiUserDir } from "./LifeosConfig";

function resolveCredsPath(): string {
  const envOverride = process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE?.replace(/^\$HOME/, homedir());
  if (envOverride) return envOverride;
  try {
    const cfg = loadLifeosConfig();
    const fromConfig = cfg.integrations?.google?.credentialsFile;
    if (typeof fromConfig === "string" && fromConfig.length > 0) {
      return fromConfig.replace(/^\$HOME/, homedir()).replace(/^~/, homedir());
    }
  } catch { /* LifeosConfig unavailable on fresh install — fall through */ }
  return join(paiUserDir(), "CONFIG/CREDENTIALS/google/credentials.json");
}
const CREDS_PATH = resolveCredsPath();
type Creds = { client_id: string; client_secret: string; refresh_token: string };
const creds: Creds = JSON.parse(readFileSync(CREDS_PATH, "utf8"));

let cachedToken: { token: string; expires: number } | null = null;
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token refresh failed ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return cachedToken.token;
}

async function gmail(path: string, init?: RequestInit): Promise<any> {
  const t = await accessToken();
  const url = `https://gmail.googleapis.com/gmail/v1/users/me${path}`;
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function listIds(q: string, max: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const pageSize = Math.min(500, max - ids.length);
    const qp = new URLSearchParams({ q, maxResults: String(pageSize) });
    if (pageToken) qp.set("pageToken", pageToken);
    const res = await gmail(`/messages?${qp.toString()}`);
    for (const m of res.messages ?? []) ids.push(m.id);
    if (!res.nextPageToken) break;
    pageToken = res.nextPageToken;
  }
  return ids;
}

async function countQuery(q: string): Promise<number> {
  const qp = new URLSearchParams({ q, maxResults: "1" });
  const res = await gmail(`/messages?${qp.toString()}`);
  return res.resultSizeEstimate ?? 0;
}

async function archiveBatch(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);
    await gmail(`/messages/batchModify`, {
      method: "POST",
      body: JSON.stringify({ ids: chunk, removeLabelIds: ["INBOX"] }),
    });
  }
}

async function unspamBatch(ids: string[]): Promise<void> {
  // Rescue from spam back to inbox — the gmail.modify-scope substitute for a
  // "never send to spam" filter (which needs gmail.settings.basic we don't have).
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);
    await gmail(`/messages/batchModify`, {
      method: "POST",
      body: JSON.stringify({ ids: chunk, removeLabelIds: ["SPAM"], addLabelIds: ["INBOX"] }),
    });
  }
}

async function fetchMin(id: string): Promise<any> {
  const qp2 = new URLSearchParams({ format: "metadata" });
  qp2.append("metadataHeaders", "From");
  qp2.append("metadataHeaders", "Subject");
  qp2.append("metadataHeaders", "Date");
  qp2.append("metadataHeaders", "List-Id");
  qp2.append("metadataHeaders", "List-Unsubscribe");
  const m = await gmail(`/messages/${id}?${qp2.toString()}`);
  const headers = m.payload?.headers ?? [];
  const h = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  return {
    id, from: h("From"), subject: h("Subject"), date: h("Date"),
    snippet: (m.snippet ?? "").slice(0, 120),
    list_id: h("List-Id"), list_unsubscribe: h("List-Unsubscribe"),
  };
}


// ── full message body + attachment extraction (added 2026-07-30) ──────────────
// fetchMin returns metadata only, which is right for triage but useless when the
// message IS the payload — a correspondent's genealogy dump, a scanned page.
// `body` walks the MIME tree for text; `attach` lists or downloads parts.

function walkParts(part: any, out: any[]): void {
  if (!part) return;
  out.push(part);
  for (const p of part.parts ?? []) walkParts(p, out);
}

async function fetchWithParts(id: string): Promise<any> {
  const m = await gmail(`/messages/${id}?format=full`);
  const headers = m.payload?.headers ?? [];
  const h = (n: string) =>
    headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  const parts: any[] = [];
  walkParts(m.payload, parts);

  const textParts = parts.filter((p) => p.mimeType === "text/plain" && p.body?.data);
  const htmlParts = parts.filter((p) => p.mimeType === "text/html" && p.body?.data);
  let body = textParts.map((p) => decodeB64Url(p.body.data)).join("\n\n");
  if (!body && htmlParts.length) {
    body = htmlParts
      .map((p) => decodeB64Url(p.body.data))
      .join("\n\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n");
  }
  const attachments = parts
    .filter((p) => p.filename && p.filename.length > 0)
    .map((p) => ({
      filename: p.filename,
      mimeType: p.mimeType,
      size: p.body?.size ?? 0,
      attachmentId: p.body?.attachmentId ?? null,
    }));
  return {
    id, threadId: m.threadId,
    from: h("From"), to: h("To"), cc: h("Cc"),
    subject: h("Subject"), date: h("Date"),
    body: body.trim(), attachments,
  };
}

async function saveAttachment(msgId: string, attId: string, dest: string): Promise<number> {
  const a = await gmail(`/messages/${msgId}/attachments/${attId}`);
  const buf = Buffer.from(String(a.data).replace(/-/g, "+").replace(/_/g, "/"), "base64");
  await Bun.write(dest, buf);
  return buf.length;
}

function decodeB64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function extractText(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return decodeB64Url(payload.body.data);
  for (const p of payload.parts ?? []) {
    const t = extractText(p);
    if (t) return t;
  }
  // fall back to html if no plain part
  if (payload.mimeType === "text/html" && payload.body?.data)
    return decodeB64Url(payload.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return "";
}
async function fetchFull(id: string): Promise<any> {
  const m = await gmail(`/messages/${id}?format=full`);
  const headers = m.payload?.headers ?? [];
  const h = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  return { id, from: h("From"), subject: h("Subject"), date: h("Date"), body: extractText(m.payload).trim() };
}

type SendOpts = {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
  cc?: string;
  bcc?: string;
  from?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
};

function b64url(buf: Uint8Array | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : Buffer.from(buf);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// RFC 5322 headers are ASCII-only; non-ASCII (emoji, em-dashes) must be RFC 2047
// encoded-words or clients render mojibake (the 2026-07-17 Bunker canary subject).
function encodeHeaderValue(v: string): string {
  return /^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

function buildRfc822(opts: SendOpts): string {
  const headers: string[] = [];
  headers.push(`MIME-Version: 1.0`);
  if (opts.from) headers.push(`From: ${opts.from}`);
  headers.push(`To: ${opts.to}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  if (opts.replyTo) headers.push(`Reply-To: ${opts.replyTo}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  headers.push(`Subject: ${encodeHeaderValue(opts.subject)}`);
  const ctype = opts.html ? `text/html; charset="UTF-8"` : `text/plain; charset="UTF-8"`;
  headers.push(`Content-Type: ${ctype}`);
  headers.push(`Content-Transfer-Encoding: 8bit`);
  return `${headers.join("\r\n")}\r\n\r\n${opts.body}`;
}

async function resolveThreadFromReplyId(gmailId: string): Promise<{ threadId: string; inReplyTo: string; references: string; subject: string }> {
  const qp = new URLSearchParams({ format: "metadata" });
  qp.append("metadataHeaders", "Message-ID");
  qp.append("metadataHeaders", "References");
  qp.append("metadataHeaders", "Subject");
  const m = await gmail(`/messages/${gmailId}?${qp.toString()}`);
  const headers = m.payload?.headers ?? [];
  const h = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  const msgId = h("Message-ID") || h("Message-Id");
  const priorRefs = h("References");
  const subj = h("Subject");
  if (!msgId) throw new Error(`could not find Message-ID header on ${gmailId}`);
  const refs = priorRefs ? `${priorRefs} ${msgId}` : msgId;
  return { threadId: m.threadId, inReplyTo: msgId, references: refs, subject: subj };
}

async function sendMessage(opts: SendOpts & { dryRun?: boolean }): Promise<any> {
  const raw = b64url(buildRfc822(opts));
  const payload: any = { raw };
  if (opts.threadId) payload.threadId = opts.threadId;
  if (opts.dryRun) return { dryRun: true, rfc822_preview: buildRfc822(opts).slice(0, 500) };
  return gmail(`/messages/send`, { method: "POST", body: JSON.stringify(payload) });
}

function parseSendArgs(argv: string[]): SendOpts & { bodyFile?: string; bodyStdin?: boolean; replyToId?: string; dryRun?: boolean } {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const nxt = () => argv[++i];
    switch (a) {
      case "--to": out.to = nxt(); break;
      case "--subject": out.subject = nxt(); break;
      case "--body-file": out.bodyFile = nxt(); break;
      case "--body-stdin": out.bodyStdin = true; break;
      case "--html": out.html = true; break;
      case "--cc": out.cc = nxt(); break;
      case "--bcc": out.bcc = nxt(); break;
      case "--from": out.from = nxt(); break;
      case "--reply-to": out.replyTo = nxt(); break;
      case "--reply-to-id": out.replyToId = nxt(); break;
      case "--in-reply-to": out.inReplyTo = nxt(); break;
      case "--references": out.references = nxt(); break;
      case "--thread-id": out.threadId = nxt(); break;
      case "--dry-run": out.dryRun = true; break;
      default: throw new Error(`unknown arg: ${a}`);
    }
  }
  return out;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const [cmd, ...args] = process.argv.slice(2);
(async () => {
  try {
    if (cmd === "profile") {
      // Which mailbox is this credential actually reading? Settles identity when
      // several credential files sit side by side in CONFIG/CREDENTIALS/google/.
      console.log(JSON.stringify(await gmail("/profile"), null, 2));
    } else if (cmd === "count") {
      console.log(await countQuery(args[0] ?? "in:inbox"));
    } else if (cmd === "ids") {
      const q = args[0] ?? "in:inbox";
      const max = args[1] ? parseInt(args[1], 10) : 500;
      const ids = await listIds(q, max);
      console.log(ids.join("\n"));
    } else if (cmd === "archive") {
      const ids = (args[0] ?? "").split(",").filter(Boolean);
      if (!ids.length) throw new Error("no ids");
      await archiveBatch(ids);
      console.log(`archived ${ids.length}`);
    } else if (cmd === "unspam") {
      const ids = (args[0] ?? "").split(",").filter(Boolean);
      if (!ids.length) throw new Error("no ids");
      await unspamBatch(ids);
      console.log(`unspammed ${ids.length}`);
    } else if (cmd === "fetch") {
      console.log(JSON.stringify(await fetchMin(args[0]), null, 2));
    } else if (cmd === "fetchfull") {
      console.log(JSON.stringify(await fetchFull(args[0]), null, 2));
    } else if (cmd === "fetchall") {
      const q = args[0] ?? "in:inbox";
      const max = args[1] ? parseInt(args[1], 10) : 500;
      const ids = await listIds(q, max);
      const conc = 20;
      for (let i = 0; i < ids.length; i += conc) {
        const chunk = ids.slice(i, i + conc);
        const results = await Promise.all(chunk.map(id => fetchMin(id).catch(e => ({ id, error: e.message }))));
        for (const r of results) console.log(JSON.stringify(r));
      }
    } else if (cmd === "body") {
      if (!args[0]) throw new Error("usage: gmail.ts body <id>");
      console.log(JSON.stringify(await fetchWithParts(args[0]), null, 2));
    } else if (cmd === "attach") {
      // gmail.ts attach <id>              → list attachments
      // gmail.ts attach <id> <outdir>     → download all attachments
      if (!args[0]) throw new Error("usage: gmail.ts attach <id> [outdir]");
      const full = await fetchWithParts(args[0]);
      if (!args[1]) { console.log(JSON.stringify(full.attachments, null, 2)); }
      else {
        for (const a of full.attachments) {
          if (!a.attachmentId) continue;
          const safe = a.filename.replace(/[^A-Za-z0-9._-]/g, "_");
          const dest = `${args[1]}/${args[0]}__${safe}`;
          const n = await saveAttachment(args[0], a.attachmentId, dest);
          console.log(`${n}\t${dest}`);
        }
      }
    } else if (cmd === "send") {
      const opts = parseSendArgs(args);
      if (!opts.to) throw new Error("--to required");
      if (!opts.subject && !opts.replyToId) throw new Error("--subject required (or --reply-to-id to inherit)");
      if (!opts.bodyFile && !opts.bodyStdin) throw new Error("--body-file or --body-stdin required");
      const body = opts.bodyStdin ? await readStdin() : readFileSync(opts.bodyFile!, "utf8");
      if (opts.replyToId) {
        const thr = await resolveThreadFromReplyId(opts.replyToId);
        opts.threadId ??= thr.threadId;
        opts.inReplyTo ??= thr.inReplyTo;
        opts.references ??= thr.references;
        if (!opts.subject) opts.subject = thr.subject.startsWith("Re:") ? thr.subject : `Re: ${thr.subject}`;
      }
      const res = await sendMessage({ ...opts, body });
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log("usage: gmail.ts count|ids|archive|fetch|fetchall|body|attach|send ...");
      process.exit(1);
    }
  } catch (e: any) {
    console.error(`ERR: ${e.message}`);
    process.exit(1);
  }
})();
