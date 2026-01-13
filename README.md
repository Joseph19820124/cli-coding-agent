# CLI Coding Agent

A CLI coding agent similar to Claude Code, powered by OpenRouter.

## Features

- Multi-model support via OpenRouter (Claude, GPT-4, Gemini, Llama, etc.)
- File operations (read, write, edit)
- Shell command execution
- Code search (glob, grep)
- Conversation context
- **Security: Permission prompts before executing tools**

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your OpenRouter API key
```

3. Run:
```bash
npm start
```

## Security Features

The agent includes built-in security protections:

### Permission Prompts
All potentially risky operations require user confirmation:
- File writes and edits
- Shell command execution
- Reading sensitive files (.env, credentials, keys)

### Risk Levels
| Level | Color | Examples |
|-------|-------|----------|
| SAFE | Green | glob, grep |
| LOW | Blue | file edits |
| MEDIUM | Yellow | file writes, bash commands |
| HIGH | Red | reading .env files |
| CRITICAL | Red BG | rm -rf, force push, writing to .env |

### Dangerous Command Detection
Blocks or warns about:
- `rm -rf /` or `rm -rf ~`
- `git push --force main`
- `curl ... | sh`
- Database DROP/TRUNCATE
- And more...

### Sensitive File Protection
Detects and warns when accessing:
- `.env`, `.env.local`, `.env.production`
- `credentials.json`, `secrets.yaml`
- SSH keys (`id_rsa`, `id_ed25519`)
- API keys and tokens

## Commands

| Command | Description |
|---------|-------------|
| `exit` / `quit` | Exit the agent |
| `clear` | Clear conversation history |
| `trust` | Trust mode - fewer permission prompts |
| `untrust` | Strict mode - more permission prompts |
| `help` | Show available commands |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `MODEL` | Model to use (default: `anthropic/claude-sonnet-4`) |
| `AUTO_APPROVE_SAFE` | Auto-approve safe operations (default: true) |
| `AUTO_APPROVE_LOW` | Auto-approve low-risk operations (default: false) |
| `AUTO_APPROVE_READ` | Auto-approve file reads (default: false) |

## Available Models

- `anthropic/claude-sonnet-4` - Claude Sonnet 4
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `openai/gpt-4o` - GPT-4o
- `google/gemini-pro-1.5` - Gemini Pro 1.5
- `meta-llama/llama-3.1-70b-instruct` - Llama 3.1 70B

Full list: https://openrouter.ai/models

## Usage Example

```
> Read the package.json file

[Tool: read] MEDIUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PERMISSION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tool:  read
  Risk:  SAFE
  Args:  { "path": "package.json" }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Allow? [y/N]: y
  ✓ Approved
```

## License

MIT
