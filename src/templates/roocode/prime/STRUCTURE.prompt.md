---
agent: codebase-analyzer
model: claude-sonnet-4-20250514
tools:
  - Read
  - Glob
  - Grep
  - Bash
description: Analyze codebase structure and generate STRUCTURE.md context file
output: .roo/STRUCTURE.md
---

# Codebase Structure Analysis Task

You are analyzing the structure of this codebase to generate a comprehensive STRUCTURE.md file.

## Your Task

Explore the codebase and document:

1. **Directory Layout**
   - Top-level directories and their purposes
   - Nested structure patterns
   - Special directories (tests, docs, configs, scripts)

2. **File Organization**
   - How files are grouped
   - File naming patterns
   - Index/barrel file patterns

3. **Module Boundaries**
   - What constitutes a "module" in this codebase?
   - How are modules isolated or coupled?
   - Dependency direction rules (if any)

4. **Entry Points**
   - Main entry point(s)
   - CLI entry points
   - Test entry points
   - Build entry points

5. **Generated vs. Source Code**
   - What files are generated?
   - Where do generated files go?
   - What's in version control vs. ignored?

6. **Configuration Files**
   - Where config files live
   - Config file hierarchy
   - Environment-specific configs

7. **Documentation Location**
   - Where are docs stored?
   - README structure
   - Inline vs. external documentation

## Exploration Strategy

1. Run `tree` or use Glob to map full directory structure
2. Read top-level README for structure explanation
3. Check .gitignore for generated/ignored paths
4. Look at import patterns to understand dependencies
5. Identify patterns:
   - Feature-based structure (by domain)
   - Layer-based structure (by technical concern)
   - Hybrid approaches

## Output Format

Generate a markdown file with this structure:

```markdown
# Codebase Structure

## Overview
[High-level description of how code is organized]

## Directory Tree
\`\`\`
[Tree view of main directories with explanations]
src/
  ├── components/     # UI components
  ├── services/       # Business logic
  └── utils/          # Shared utilities
\`\`\`

## Directory Purposes

### `/src`
[What lives here and why]

### `/tests` or `/src/**/*.test.ts`
[Test organization]

### `/docs`
[Documentation location]

[Continue for each major directory...]

## Module Organization
[How the code is modularized]

## Entry Points
[Where execution begins]

## Configuration
[Where configs live and how they're structured]

## Generated Files
[What's generated, where, and by what]

## File Patterns
[Common file patterns and what they mean]

## Navigation Tips
[How to find things quickly in this codebase]
```

## Important Notes

- Make this a **map** developers can use to navigate
- Note any unusual or project-specific organization
- Highlight where to find common things (tests, configs, docs)
- If structure is inconsistent, note that
- Keep explanations concise - this is a reference guide

## Tech Stack Context

{{#if techStack}}
**Runtime:** {{techStack.runtime}}
**Language:** {{techStack.language}}
**Frameworks:** {{techStack.frameworks}}
{{/if}}

Start your exploration and generate the STRUCTURE.md file.
