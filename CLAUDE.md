# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meeseeks is a terminal-based CLI tool built with React and [Ink](https://github.com/vadimdemedes/ink) (React for CLI). It provides a TUI (terminal user interface) for interacting with GitHub Copilot's API, including token auto-detection and verification.

## Commands

```bash
# Development - run directly with tsx
npm start

# Build TypeScript to dist/
npm run build

# Run built version
npm run meeseeks
```

## Architecture

### Stack
- **Ink v5** - React renderer for CLI interfaces
- **TypeScript** with ESM modules (NodeNext resolution)
- **tsx** for development hot-reloading

### Key Patterns

**Screen Navigation**: The app uses a simple state-based router in `src/index.tsx`. The `Screen` type (`'main' | 'copilot-connect' | 'qa-plan'`) controls which component renders. Navigation happens via `onSelect` (to screens) and `onBack` (to main menu).

**Copilot Authentication Flow** (`src/context/CopilotContext.tsx`):
1. On startup, auto-detects Copilot tokens from known locations (CLI file, VS Code config)
2. Exchanges OAuth tokens for Copilot API tokens via `api.github.com/copilot_internal/v2/token`
3. Caches exchanged tokens in memory (not persisted for security)
4. Tokens stored in `~/.meeseeks/config.json` only track source, not the actual token

**Token Detection Priority** (`src/utils/copilot.ts`):
1. `~/.copilot-cli-access-token` (Copilot CLI)
2. `~/.config/github-copilot/apps.json` (VS Code on macOS/Linux)
3. `~/.config/github-copilot/hosts.json` (VS Code fallback)

### File Structure

```
src/
├── index.tsx           # App entry, layout, screen router
├── ascii.ts            # ASCII art banner
├── types/index.ts      # Shared TypeScript types
├── components/
│   └── Menu.tsx        # Main menu with keyboard navigation
├── screens/
│   ├── CopilotConnect.tsx  # Token detection/verification UI
│   └── QAPlan.tsx          # QA plan generator (uses Copilot chat)
├── context/
│   └── CopilotContext.tsx  # Auth state management (React Context)
└── utils/
    ├── copilot.ts      # Copilot API: token detection, exchange, chat
    └── settings.ts     # Config file persistence (~/.meeseeks/)
```

### Ink Conventions Used
- `useInput` hook for keyboard handling (arrow keys, Enter, single-char shortcuts)
- `useApp` hook for `exit()` function
- Flex-based layout with `<Box flexDirection="column">`
- Color palette defined as constants at top of components
