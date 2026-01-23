---
agent: codebase-analyzer
model: claude-sonnet-4-20250514
tools:
  - Read
  - Glob
  - Grep
  - Bash
description: Analyze the codebase architecture and generate ARCHITECTURE.md context file
output: .roo/ARCHITECTURE.md
---

# Architecture Analysis Task

You are analyzing the architecture of this codebase to generate a comprehensive ARCHITECTURE.md file.

## Your Task

Explore the codebase and document:

1. **Overall Architecture Pattern**
   - What architectural style is used? (MVC, Clean Architecture, Hexagonal, Microservices, etc.)
   - What are the major layers/boundaries?
   - How do components communicate?

2. **Module Organization**
   - What are the main modules/packages?
   - How are responsibilities divided?
   - What are the key dependencies between modules?

3. **Data Flow**
   - How does data flow through the system?
   - What are the entry points?
   - What are the persistence mechanisms?

4. **External Integrations**
   - What external services/APIs does this integrate with?
   - How are these integrations structured?
   - What protocols are used? (REST, GraphQL, gRPC, etc.)

5. **Key Architectural Decisions**
   - What are the most important architectural choices?
   - Why were they made? (if evident from code/comments)
   - What are the tradeoffs?

## Exploration Strategy

1. Start with the entry point (main.ts, index.ts, app.py, main.go, etc.)
2. Map the directory structure using Glob
3. Read key configuration files (package.json, tsconfig.json, pyproject.toml, Cargo.toml, go.mod)
4. Identify architectural patterns from directory naming and file organization
5. Use Grep to find key patterns (dependency injection, factory patterns, etc.)
6. Trace major data flows through the code

## Output Format

Generate a markdown file with this structure:

```markdown
# Architecture

## Overview
[High-level architectural description]

## Architecture Pattern
[Primary pattern used and why]

## Module Structure
[Diagram or description of modules and their relationships]

## Data Flow
[How data moves through the system]

## External Dependencies
[Services, APIs, databases this system integrates with]

## Key Design Decisions
[Important architectural choices and rationale]

## Diagrams
[Mermaid diagrams if helpful - keep simple and focused]
```

## Important Notes

- Focus on **what exists**, not what should exist
- Be concise - developers will read this frequently
- Use concrete examples from the codebase
- Highlight unconventional or noteworthy architectural choices
- If the architecture is inconsistent, note that honestly

## Tech Stack Context

{{#if techStack}}
**Runtime:** {{techStack.runtime}}
**Package Manager:** {{techStack.packageManager}}
**Frameworks:** {{techStack.frameworks}}
{{#if techStack.language}}**Language:** {{techStack.language}}{{/if}}
{{/if}}

Start your exploration and generate the ARCHITECTURE.md file.
