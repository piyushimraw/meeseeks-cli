# Super Ralph — Design Document

**Date:** 2026-03-20
**Status:** Draft
**Branch:** feat/super-ralph

## Overview

Super Ralph is a Meeseeks CLI feature that orchestrates autonomous feature development through three stages: **Brainstorm, Plan, Execute**. It shells out to Claude Code (`claude -p`) as its execution engine and provides a fully interactive brainstorming experience through the Ink TUI.

The core insight: if a task is too large for a single brainstorming session, Super Ralph breaks it into phases automatically. Each phase gets its own brainstorm, plan, and ralph loop execution — with structured learnings carried forward between phases.

## Entry Points

- **Menu option:** Select "Super Ralph" from the Meeseeks main menu, then type a task description.
- **CLI command:** `meeseeks super-ralph "implement the analytics dashboard from Figma"`

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Meeseeks CLI                    │
│                                                  │
│  Entry Points:                                   │
│    - Menu option: "Super Ralph"                  │
│    - CLI: meeseeks super-ralph "build X"         │
│                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Brainstorm  │→ │  Plan    │→ │  Execute   │  │
│  │ (Ink UI)    │  │(Generate)│  │(Ralph Loop)│  │
│  └─────────────┘  └──────────┘  └────────────┘  │
│        ↑                              │          │
│        │         Learnings            │          │
│        └──────────────────────────────┘          │
│                                                  │
│  Execution Engine: claude -p (shell out)         │
│                                                  │
│  Monitoring:                                     │
│    - Live TUI dashboard                          │
│    - Log files                                   │
│    - System notifications                        │
└─────────────────────────────────────────────────┘
```

## Stage 1: Brainstorming Engine

### Context Gathering

Before brainstorming begins, Meeseeks automatically gathers context from all available sources:

- **Codebase analysis** — existing code, architecture, patterns, dependencies
- **Git history** — recent commits, conventions
- **Project files** — README, CLAUDE.md, AGENTS.md, existing PRDs
- **Figma designs** — design specs, components, tokens via Figma MCP (if URL provided)
- **External URLs** — API docs, library documentation (if provided)

### Scope Assessment

1. Meeseeks calls `claude -p` with the task description + gathered context.
2. Claude determines whether the task fits in one phase or needs multiple.
3. If multiple phases: Claude proposes a breakdown with reasoning.
4. User confirms or adjusts the phase breakdown.

### Per-Phase Brainstorming

Fully interactive — the user answers every question.

1. **Template questions** (standard set):
   - What exactly should this do? (functional requirements)
   - What are the constraints? (tech stack, performance, compatibility)
   - What does success look like? (acceptance criteria)
   - What are the dependencies? (on other phases, external APIs, etc.)
2. **LLM-generated follow-ups** — based on answers so far, Meeseeks calls `claude -p` to generate the next question. Continues until the LLM determines enough detail has been gathered or the user says "done."
3. Questions presented one-at-a-time in the Ink UI.
4. User can type answers, or say "skip" / "done."

### Brainstorm Output

Structured JSON saved to `tasks/super-ralph-<session-id>/phase-N-brainstorm.json`:

```json
{
  "phase": 1,
  "title": "Page Layout & Design Tokens",
  "decisions": [
    "Use CSS Grid for main layout",
    "Design tokens extracted from Figma"
  ],
  "constraints": [
    "Must support responsive breakpoints: 768px, 1024px, 1440px"
  ],
  "acceptance_criteria": [
    "Layout renders correctly at all breakpoints",
    "Design tokens match Figma specs exactly"
  ],
  "dependencies": [],
  "context_sources": ["figma://file-key/node-id", "src/components/Layout.tsx"]
}
```

## Stage 2: Plan Generation

After brainstorming completes for a phase, Meeseeks generates a ralph-loop-friendly implementation plan.

### How It Works

1. Meeseeks calls `claude -p` with:
   - The phase's brainstorm JSON
   - Learnings from prior phases (if any)
   - Codebase context (architecture, existing patterns)
   - Project docs (README, CLAUDE.md, AGENTS.md)
2. Claude generates a structured plan.

### Plan Output

Saved to `tasks/super-ralph-<session-id>/phase-N-plan.json`:

```json
{
  "phase": 1,
  "title": "Page Layout & Design Tokens",
  "tasks": [
    {
      "id": "task-001",
      "title": "Create layout container component",
      "description": "Build a responsive CSS Grid layout container",
      "acceptance_criteria": [
        "Component renders at 768px, 1024px, 1440px breakpoints",
        "Uses CSS Grid with named areas"
      ],
      "dependencies": [],
      "passes": false
    },
    {
      "id": "task-002",
      "title": "Define design tokens from Figma specs",
      "description": "Extract color, spacing, and typography tokens",
      "acceptance_criteria": [
        "Tokens match Figma file values",
        "Exported as CSS custom properties"
      ],
      "dependencies": ["task-001"],
      "passes": false
    }
  ],
  "feedback_loops": ["typecheck", "lint", "test"],
  "risk_level": "low"
}
```

### Prompt File

A companion prompt file is generated at `tasks/super-ralph-<session-id>/phase-N-prompt.md`. This is what gets passed to each ralph loop iteration. It contains:

- The task list with current progress
- Acceptance criteria for each task
- Constraints and decisions from brainstorming
- Instructions to: pick next incomplete task, implement it, run feedback loops, update progress, commit

Task ordering respects dependencies — the plan tells the ralph loop which tasks are unblocked.

## Stage 3: Ralph Loop Execution

### Loop Mechanics

1. Meeseeks spawns `claude -p --permission-mode acceptEdits` as a child process.
2. Passes the phase prompt file + progress state as input.
3. Claude Code picks the next unblocked task, implements it, runs feedback loops (typecheck/lint/test), commits, updates progress.
4. Process exits with output.
5. Meeseeks reads the updated progress file.
6. If tasks remain incomplete: spawn next iteration (fresh context window).
7. If all tasks pass: phase complete.

### Failure Handling (Tiered)

- **First failure** on a task: next iteration gets the error context, attempts self-heal.
- **Same task fails twice:** loop pauses, user is notified with error details. User chooses to fix manually, adjust the plan, or retry.

### Iteration Controls

- Max iterations per phase (configurable, default: 10)
- Max consecutive failures before pause (default: 2)
- User can pause/stop from any monitoring interface

### Progress File

Saved to `tasks/super-ralph-<session-id>/phase-N-progress.json`:

```json
{
  "phase": 1,
  "iteration": 3,
  "tasks_completed": ["task-001", "task-002"],
  "tasks_remaining": ["task-003"],
  "current_task": "task-003",
  "failures": [],
  "files_changed": ["src/components/Layout.tsx"]
}
```

### Phase Completion

- When all tasks pass: generate `phase-N-learnings.json`
- If more phases remain: feed learnings into next phase's brainstorm
- If all phases done: Super Ralph session complete

## Learnings System

Structured per-phase retrospective. After each phase completes, a learnings file is generated.

Saved to `.super-ralph/sessions/<session-id>/learnings/phase-N-learnings.json`:

```json
{
  "phase": 1,
  "title": "Page Layout & Design Tokens",
  "patterns_discovered": [
    "CSS Grid named areas simplify responsive layout management"
  ],
  "mistakes_avoided": [
    "Initially tried Flexbox but Grid was cleaner for 2D layout"
  ],
  "conventions_established": [
    "Design tokens use --sr-* prefix to avoid conflicts"
  ]
}
```

Future phases receive relevant learnings as input context.

## Monitoring & Control

Three modes — user chooses their preference.

### 1. Live TUI Dashboard (Ink screen)

```
┌─ Super Ralph ─────────────────────────────┐
│ Session: build-dashboard-page             │
│ Phase: 2/4 - "Header Component"           │
│ Iteration: 3/10                           │
│ Task: task-002 "Implement responsive nav" │
│ Status: * Running                         │
│                                           │
│ Progress: ===============----- 4/7 tasks  │
│ Time elapsed: 12m 34s                     │
│                                           │
│ Recent:                                   │
│  + task-001 Layout container (iter 1)     │
│  + task-002 Design tokens (iter 2)        │
│  * task-003 Responsive nav (iter 3)       │
│                                           │
│ [P]ause  [S]top  [L]ogs                   │
└───────────────────────────────────────────┘
```

### 2. Log Files

- `tasks/super-ralph-<session-id>/execution.log` — full Claude Code output per iteration
- `tasks/super-ralph-<session-id>/phase-N-progress.json` — structured progress
- Check anytime via `meeseeks status` or `tail -f`

### 3. System Notifications

- Phase completed
- Task failure requiring user input
- All phases done
- Uses macOS `osascript` for notifications (extensible later)

## Session Lifecycle

### File Structure

```
.super-ralph/
├── config.json              # defaults (max iterations, notification prefs)
├── sessions/
│   └── <session-id>/
│       ├── session.json     # overall state, phase list, current phase
│       └── learnings/
│           ├── phase-1-learnings.json
│           └── phase-2-learnings.json

tasks/super-ralph-<session-id>/
├── scope.json               # initial task + phase breakdown
├── phase-1-brainstorm.json
├── phase-1-plan.json
├── phase-1-prompt.md
├── phase-1-progress.json
├── phase-2-brainstorm.json
├── ...
└── execution.log

docs/plans/
└── YYYY-MM-DD-<task-name>-design.md
```

### Session States

1. **Created** — User invokes super-ralph, session ID generated
2. **Scoping** — Task assessed, phases proposed, user confirms
3. **Brainstorming** — Per-phase interactive brainstorming in progress
4. **Planning** — Implementation plan being generated
5. **Executing** — Ralph loop running
6. **Paused** — Waiting for user input (failure, manual intervention)
7. **Completed** — All phases done, final summary shown

### Session JSON

```json
{
  "id": "build-dashboard-page",
  "task": "Implement the analytics dashboard from Figma",
  "status": "executing",
  "current_phase": 2,
  "phases": [
    { "id": 1, "title": "Layout & Tokens", "status": "completed" },
    { "id": 2, "title": "Header Component", "status": "executing" },
    { "id": 3, "title": "Chart Widgets", "status": "pending" },
    { "id": 4, "title": "Integration & Polish", "status": "pending" }
  ],
  "ai_tool": "claude-code",
  "created_at": "2026-03-20T10:00:00Z"
}
```

### Resumability

- If interrupted (Ctrl+C, crash), session state persists in `.super-ralph/`
- `meeseeks super-ralph --resume` picks up where it left off
- Progress files + git commits ensure no work is lost

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI tool | Claude Code only (for now) | Keep it simple, abstract later |
| Invocation | Shell out to `claude -p` | Proven ralph approach, fresh context per iteration |
| Brainstorming UI | Meeseeks Ink UI | User stays in Meeseeks, Claude Code is just execution |
| Question generation | Template + LLM hybrid | Standard starters, dynamic follow-ups |
| Brainstorming interactivity | Fully interactive per phase | User in the loop for all decisions |
| Context/decision files | JSON | Machine-consumable for ralph loop parsing |
| Scope assessment | LLM judgment + user confirmation | Smart default with human override |
| Context sources | All (code, Figma, git, docs, URLs) | Maximum context gathering |
| File locations | Hybrid | Orchestration in `.super-ralph/`, artifacts in conventional locations |
| Execution model | Fresh context per iteration | True to ralph philosophy, prevents context degradation |
| Learnings | Structured JSON per phase | Machine-consumable, fed forward to subsequent phases |
| Failure handling | Tiered (self-heal once, escalate) | Prevents infinite loops while allowing simple recovery |
| Monitoring | TUI + logs + notifications | User picks their style |

## Future Considerations

- **Multi-tool support:** Abstract the execution engine to support Copilot CLI, Codex CLI, and other AI coding tools.
- **Docker sandboxing:** Add container support for AFK execution (as recommended in the ralph articles).
- **Learning persistence:** Promote high-value learnings to project-level docs (CLAUDE.md, AGENTS.md) across sessions.
- **Phase templates:** Pre-built phase patterns for common task types (UI component, API endpoint, refactor).
