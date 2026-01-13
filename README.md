# CLI Coding Agent

A CLI coding agent similar to Claude Code, powered by OpenRouter.

## Features

- Multi-model support via OpenRouter (Claude, GPT-4, Gemini, Llama, etc.)
- File operations (read, write, edit)
- Shell command execution
- Code search (glob, grep)
- Conversation context

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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `MODEL` | Model to use (default: `anthropic/claude-sonnet-4`) |

## Available Models

- `anthropic/claude-sonnet-4` - Claude Sonnet 4
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `openai/gpt-4o` - GPT-4o
- `google/gemini-pro-1.5` - Gemini Pro 1.5
- `meta-llama/llama-3.1-70b-instruct` - Llama 3.1 70B

Full list: https://openrouter.ai/models

## Usage

```
> Read the package.json file
> Create a hello.ts file that prints hello world
> Search for all TypeScript files
> Run ls -la
> exit
```

## License

MIT
