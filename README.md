# keyhand-mcp

Stdio MCP bridge for [KeyHand](https://keyhand.com) — the credential dropbox for AI-powered agencies.

KeyHand stores your client API keys, admin passwords, and service-account JSONs in an encrypted vault, then lets your AI agent (Claude Code, Cursor, Claude Desktop) use them in HTTP calls **without ever seeing the plaintext**. This package is the stdio bridge for clients that don't yet speak the HTTPS MCP transport natively.

## Install

You don't need to install — just point your MCP client at it via `npx`.

## Use with Claude Desktop

Edit your Claude Desktop config:

```json
{
  "mcpServers": {
    "keyhand": {
      "command": "npx",
      "args": ["-y", "keyhand-mcp"],
      "env": {
        "KEYHAND_TOKEN": "mcp_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Generate the token at **https://keyhand.com/dashboard/settings/tokens**.

## Use with Claude Code

Claude Code can talk to KeyHand's HTTPS endpoint directly — you don't need this package. Run:

```bash
claude mcp add keyhand https://keyhand.com/api/mcp \
  --header "Authorization: Bearer mcp_xxxxxxxxxxxxxxxxxxxxxxxx"
```

You can still use this package via Claude Code's stdio MCP support if you prefer:

```bash
KEYHAND_TOKEN=mcp_xxx claude mcp add-stdio keyhand npx -y keyhand-mcp
```

## What you get

Two tools the agent can call:

- **`list_credentials({ project_id })`** — returns the names + schema metadata of every credential in a project. Never returns plaintext values.
- **`inject_credential({ project_id, credential_name, request: { url, method, headers, body } })`** — KeyHand server-side resolves the credential, substitutes the literal string `$secret` in your headers / body, makes the HTTP request, and returns the response to the agent. **The plaintext never enters the agent's context.**

## Self-hosting

Set `KEYHAND_URL` to your self-hosted endpoint:

```json
{
  "env": {
    "KEYHAND_URL": "https://your-keyhand.internal/api/mcp",
    "KEYHAND_TOKEN": "mcp_xxx"
  }
}
```

## How it works

This package opens a JSON-RPC channel on stdin/stdout, then forwards every message to the configured KeyHand HTTPS endpoint with your token as `Authorization: Bearer`. The upstream JSON-RPC response is written back unchanged.

That's the entire implementation. ~60 lines of Node. No dependencies beyond the built-in `fetch`.

## Security

- Your token is read from `KEYHAND_TOKEN` and only ever sent to the configured `KEYHAND_URL`.
- All transport is TLS 1.3.
- This package never persists anything to disk.
- KeyHand's MCP endpoint logs every request to your workspace's audit log.

Full threat model: https://keyhand.com/security.

## License

MIT. See LICENSE.

## Links

- Site: https://keyhand.com
- Docs: https://keyhand.com/help
- Source: https://github.com/PCSAdmin081/keyhand-mcp (will go live with v0.1.0)
- Security: security@keyhand.com
