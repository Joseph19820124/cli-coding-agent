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
- **Web content fetching with web_fetch**
- **Plan mode for complex tasks**
- **Subagents for specialized operations**
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

## Available Tools (11)

| Category | Tool | Description | Risk Level |
|----------|------|-------------|------------|
| **File** | `read` | Read file contents | SAFE |
| | `write` | Create/overwrite files | MEDIUM |
| | `edit` | Edit files with string replacement | LOW |
| **Exec** | `bash` | Execute shell commands | MEDIUM |
| **Search** | `glob` | Find files by pattern | SAFE |
| | `grep` | Search file contents | SAFE |
| **Task** | `todo_write` | Manage task list | SAFE |
| | `create_plan` | Create execution plan | SAFE |
| **Interact** | `ask_user` | Ask user questions | SAFE |
| **Web** | `web_fetch` | Fetch URL content | LOW |
| **Agent** | `subagent` | Launch specialized subagents | SAFE |

## Plan Mode (create_plan)

For complex tasks, the agent can create a plan for your approval:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 PLAN: Refactor Authentication Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Restructure auth code for better maintainability

  ○ Step 1: Analyze current implementation
  ○ Step 2: Create new auth service
  ○ Step 3: Migrate existing code
  ○ Step 4: Update tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Options:
    y/yes  - Approve and execute the plan
    n/no   - Reject the plan
    m/modify - Ask agent to modify the plan

  Approve this plan? [y/n/m]: _
```

## Subagents

Specialized subagents for complex operations:

| Type | Purpose | Tools Used |
|------|---------|------------|
| `explore` | Explore codebase structure | glob, grep, read |
| `search` | Search for code patterns | glob, grep |
| `analyze` | Analyze specific files | read, grep |

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤖 SUBAGENT: Explore
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Task: Find all API endpoints
  Tools: glob, grep, read
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Web Fetch (web_fetch)

Fetch content from URLs:
- HTML pages (auto-extracts text)
- JSON APIs (formatted output)
- Raw text files

## Task Management (todo_write)

Track complex tasks:

```
━━━ Todo List ━━━
  ○ #1 Analyze current code
  ◐ #2 Implement feature  (in progress)
  ● #3 Write tests
  Progress: 1/3
```

## Security Features

### Permission Prompts
All potentially risky operations require user confirmation.

### Risk Levels
| Level | Color | Examples |
|-------|-------|----------|
| SAFE | Green | glob, grep, todo_write, ask_user, create_plan, subagent |
| LOW | Blue | file edits, web_fetch |
| MEDIUM | Yellow | file writes, bash commands |
| HIGH | Red | reading .env files |
| CRITICAL | Red BG | rm -rf, force push, writing to .env |

### Dangerous Command Detection
Warns about destructive commands like `rm -rf`, `git push --force`, etc.

### Sensitive File Protection
Detects sensitive files: `.env`, credentials, SSH keys, API tokens.

## Commands

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `tools` | List all available tools |
| `trust` | Trust mode - fewer permission prompts |
| `untrust` | Strict mode - more permission prompts |
| `clear` | Clear conversation history |
| `exit` / `quit` | Exit the agent |

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
