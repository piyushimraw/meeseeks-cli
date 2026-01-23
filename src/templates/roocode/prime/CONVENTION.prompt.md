---
agent: codebase-analyzer
model: claude-sonnet-4-20250514
tools:
  - Read
  - Glob
  - Grep
  - Bash
description: Analyze coding conventions and generate CONVENTION.md context file
output: .roo/CONVENTION.md
---

# Coding Convention Analysis Task

You are analyzing the coding conventions of this codebase to generate a comprehensive CONVENTION.md file.

## Your Task

Explore the codebase and document:

1. **Naming Conventions**
   - File naming patterns (camelCase, kebab-case, PascalCase, snake_case)
   - Variable naming conventions
   - Function/method naming patterns
   - Class/type naming conventions
   - Constant naming conventions

2. **Code Organization**
   - Directory structure patterns
   - File size/complexity guidelines (observed, not prescribed)
   - Module export patterns
   - Import ordering conventions

3. **Language-Specific Patterns**
   - TypeScript: Interface vs Type usage, strict mode settings
   - Python: Type hints usage, docstring style
   - Go: Package organization, error handling patterns
   - Rust: Module visibility patterns, error handling

4. **Error Handling**
   - How are errors thrown/returned?
   - Error types or classes used
   - Logging patterns

5. **Testing Conventions**
   - Test file naming (*.test.*, *.spec.*, *_test.*)
   - Test structure patterns (describe/it, test(), etc.)
   - Mock/stub patterns
   - Test data organization

6. **Comments and Documentation**
   - When are comments used?
   - JSDoc/docstring patterns
   - README patterns
   - Inline documentation style

## Exploration Strategy

1. Use Glob to sample files across the codebase
2. Read representative files from different modules
3. Use Grep to find patterns:
   - `export\s+(interface|type|class|function|const)`
   - `import.*from`
   - `throw new`
   - `catch|try`
   - Test file patterns
4. Check linter/formatter configs (eslint, prettier, black, rustfmt, gofmt)
5. Identify what's consistent vs what varies

## Output Format

Generate a markdown file with this structure:

```markdown
# Coding Conventions

## Naming Conventions
[File, variable, function, class naming patterns]

## File Organization
[Directory structure, file size, module patterns]

## Language Style
[Language-specific conventions observed in the codebase]

## Error Handling
[How errors are handled throughout the code]

## Testing Patterns
[Test file organization and structure]

## Documentation Style
[Comment and documentation patterns]

## Tooling
[Linters, formatters, and their configurations]

## Examples
[Concrete examples from the codebase demonstrating conventions]
```

## Important Notes

- Document what **is**, not what **should be**
- If conventions are inconsistent, note that
- Provide concrete examples with file paths
- Highlight any unusual or project-specific conventions
- Don't prescribe - describe what you observe

## Tech Stack Context

{{#if techStack}}
**Runtime:** {{techStack.runtime}}
**Language:** {{techStack.language}}
**Frameworks:** {{techStack.frameworks}}
{{#if techStack.testFramework}}**Test Framework:** {{techStack.testFramework}}{{/if}}
{{/if}}

Start your exploration and generate the CONVENTION.md file.
