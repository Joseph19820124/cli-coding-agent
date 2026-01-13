# CLI Coding Agent

A CLI coding agent similar to Claude Code, powered by OpenRouter.

## Features

- Multi-model support via OpenRouter (Claude, GPT-4, Gemini, Llama, etc.)
- File operations (read, write, edit)
- Shell command execution
- Code search (glob, grep)
- **Task management with todo_write**
- **User interaction with ask_user**
- **Parallel tool execution**
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

## Available Tools

| Tool | Description | Risk Level |
|------|-------------|------------|
| `read` | Read file contents | SAFE (HIGH for sensitive files) |
| `write` | Create/overwrite files | MEDIUM |
| `edit` | Edit files with string replacement | LOW |
| `bash` | Execute shell commands | MEDIUM (CRITICAL for dangerous commands) |
| `glob` | Find files by pattern | SAFE |
| `grep` | Search file contents | SAFE |
| `todo_write` | Manage task list | SAFE |
| `ask_user` | Ask user questions | SAFE |

## Task Management (todo_write)

The agent can track complex tasks using a built-in todo system:

```
> Help me refactor the authentication module

━━━ Todo List ━━━
  ○ #1 Analyze current auth implementation
  ◐ #2 Create new auth service  (in progress)
  ○ #3 Update API endpoints
  ○ #4 Add tests
  Progress: 0/4
```

## User Interaction (ask_user)

The agent can ask clarifying questions:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  QUESTION FROM AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Which database would you prefer?

  1. PostgreSQL (default)
  2. MySQL
  3. SQLite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Your choice (number or text): 1
```

## Parallel Tool Execution

When multiple independent operations are needed, the agent executes them in parallel for better performance:

```
[Executing 3 tools in parallel...]

[Tool: glob] SAFE
[Tool: grep] SAFE
[Tool: read] SAFE
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
| SAFE | Green | glob, grep, todo_write, ask_user |
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

## License

MIT
