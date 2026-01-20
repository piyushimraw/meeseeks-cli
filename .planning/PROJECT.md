# Meeseeks

## What This Is

An AI-powered terminal CLI that helps developers throughout the software development lifecycle. Starting from ticket selection through implementation planning, and supporting on-call engineers during incidents with context gathering, triage assistance, and post-incident documentation. Built on GitHub Copilot integration with a React/Ink TUI.

## Core Value

Developers can go from "I have a ticket" to "I have a plan" in minutes, and on-call engineers can get full incident context without context-switching between multiple tools.

## Requirements

### Validated

- Copilot Integration: Auto-detect and use GitHub Copilot tokens (CLI/VS Code) — existing
- Model Selection: Choose between available Copilot models (GPT-4o, Claude 3.5, etc.) — existing
- QA Plan Generation: Generate test plans from git diffs or branch comparisons — existing
- Test Watcher: Auto-generate tests when source files change — existing
- Knowledge Base: Build searchable RAG-powered documentation stores — existing
- Git Changes Viewer: View staged, unstaged, and untracked changes — existing

### Active

**SDLC Workflow**
- [ ] JIRA Cloud connection and authentication
- [ ] Fetch user's current sprint tickets
- [ ] Select ticket from sprint view
- [ ] Auto-create branch with pattern `<TICKET-ID>-<slug-title>`
- [ ] Auto-transition JIRA ticket to "In Progress"
- [ ] Research phase using KB search + clarifying questions
- [ ] Generate implementation plan (markdown)
- [ ] Generate verification/test plan (markdown)

**On-Call Incident Response**
- [ ] Squadcast integration for incident/alert details
- [ ] SolarWinds integration for logs/metrics
- [ ] Grafana integration for dashboards/metrics
- [ ] Pull full incident context on demand
- [ ] Search codebase for error strings and affected components
- [ ] Match alerts to relevant KB entries (runbook lookup)

**On-Call Post-Incident**
- [ ] Generate RCA document (markdown)
- [ ] Create JIRA follow-up ticket with RCA content
- [ ] Timeline reconstruction from incident data

### Out of Scope

- Code implementation/execution — Meeseeks generates plans; Kilo Code or manual implementation follows
- Slack/Teams integration — Focus on terminal-first workflow
- Real-time monitoring — Meeseeks queries on-demand, doesn't run continuously
- Mobile app — Terminal CLI only

## Context

**Existing Codebase:**
- React 18 + Ink 5 TUI framework
- TypeScript 5.5, Node.js 18+
- Provider pattern for global state (CopilotContext, KnowledgeBaseContext)
- Screen-based navigation with state machine patterns
- RAG system using @xenova/transformers for embeddings
- Local storage in `~/.meeseeks/`

**New Integrations Needed:**
- JIRA Cloud REST API (OAuth or API token auth)
- Squadcast API (incident management)
- SolarWinds API (monitoring/logs)
- Grafana API (metrics/dashboards)

**User Environment:**
- Runbooks currently scattered/non-existent — KB feature can centralize them
- Plans should be compatible with both manual implementation and Kilo Code meeseeks mode

## Constraints

- **Tech stack**: Must use existing Ink/React TUI architecture — consistency with current features
- **Interface**: All features in TUI menu — no CLI subcommands for now
- **Auth**: Each integration needs secure credential storage — extend existing settings pattern
- **Plan format**: Implementation plans must be structured for both human reading and Kilo Code parsing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TUI-only interface | Consistency with existing features, user preference | — Pending |
| JIRA Cloud (not Server) | User's environment, better API support | — Pending |
| Squadcast for incidents | User's existing tooling | — Pending |
| Plans don't include code | Separation of concerns; Kilo Code handles execution | — Pending |

---
*Last updated: 2026-01-20 after initialization*
