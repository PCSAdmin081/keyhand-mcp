#!/usr/bin/env node
// keyhand-mcp — stdio MCP server that proxies to your KeyHand workspace's HTTPS endpoint.
//
// Run via `npx keyhand-mcp` from a Claude Desktop / Claude Code config that sets:
//   KEYHAND_TOKEN — your MCP token from KeyHand → Settings → MCP tokens
//   KEYHAND_URL   — defaults to https://keyhand.com/api/mcp (override for self-host)
//
// Wire format: JSON-RPC 2.0 messages on stdin/stdout, one per line.
// We just forward every message to the HTTPS endpoint and write the response back.
// This makes a stdio-only MCP client (Claude Desktop today) work with KeyHand's HTTPS MCP.
//
// Why this exists alongside the HTTPS endpoint:
//   - Claude Desktop currently uses stdio MCP servers; this is the bridge.
//   - Claude Code's `claude mcp add <url>` works directly against the HTTPS endpoint; this package is optional there.
//   - Publishing on npm makes KeyHand discoverable to anyone searching the registry for "mcp" or "secrets".

import { createInterface } from 'node:readline';
import { stderr, stdin, stdout, exit } from 'node:process';

const TOKEN = process.env.KEYHAND_TOKEN;
const URL_BASE = process.env.KEYHAND_URL ?? 'https://keyhand.com/api/mcp';

if (!TOKEN) {
  stderr.write(
    'keyhand-mcp: missing KEYHAND_TOKEN env var.\n' +
      '  1) Generate a token at https://keyhand.com/dashboard/settings/tokens\n' +
      '  2) Set KEYHAND_TOKEN in your Claude Desktop / Claude Code config.\n',
  );
  exit(2);
}

const rl = createInterface({ input: stdin, crlfDelay: Infinity });

async function forward(message) {
  try {
    const res = await fetch(URL_BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
        'user-agent': 'keyhand-mcp/0.1.0',
      },
      body: JSON.stringify(message),
    });
    const text = await res.text();
    if (!res.ok) {
      writeError(message?.id, -32000, `keyhand http ${res.status}: ${text.slice(0, 200)}`);
      return;
    }
    // Pass the upstream JSON-RPC envelope through unchanged.
    stdout.write(text.replace(/\s+$/g, '') + '\n');
  } catch (err) {
    writeError(message?.id, -32001, err instanceof Error ? err.message : 'fetch failed');
  }
}

function writeError(id, code, message) {
  stdout.write(
    JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }) + '\n',
  );
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    writeError(null, -32700, 'parse error');
    return;
  }
  await forward(msg);
});

rl.on('close', () => exit(0));
