# Implementation Plan: Remove Command Files Generation

**Branch**: `001-remove-command-files` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-remove-command-files/spec.md`

## Summary

Remove command file generation from the meta-prompting setup wizard for both RooCode and KiloCode extensions. Instead of generating command files in `.roo/commands/` or `.kilocode/workflows/`, the system will generate only custom mode configuration files (`.roomodes`/`.kilocodemodes`) and mode prompt files in `.meeseeks/modes/`. Prime context stub files continue to be generated as before.

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js 20+
**Primary Dependencies**: React 18, Ink 5 (TUI framework), Vitest 4
**Storage**: File system only (local project directories)
**Testing**: Vitest with `ink-testing-library` for component tests
**Target Platform**: macOS, Linux, Windows (cross-platform CLI)
**Project Type**: Single CLI application
**Performance Goals**: N/A (interactive wizard, not performance-critical)
**Constraints**: Must maintain backward compatibility with existing mode generation for KiloCode
**Scale/Scope**: ~15 files to modify/remove, affects MetaPromptInit wizard screen

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-First (TDD) | PASS | Tests must be written before modifying generator logic |
| II. Modular Architecture | PASS | Changes isolated to `src/utils/metaPrompt/` and `src/screens/MetaPromptInit.tsx` |
| III. TypeScript Strict Mode | PASS | No new `any` types; use existing type definitions |
| IV. Documentation | PASS | Update README if user-facing behavior changes |
| V. Cross-Platform | PASS | Using `path.join()` for all file paths already |
| VI. Copilot Integration First | N/A | No Copilot API changes |
| VII. Terminal-First UX | PASS | Wizard flow unchanged, just different file outputs |
| VIII. Simplicity (YAGNI) | PASS | Removing code, not adding; simpler result |

**Pre-Phase 0 Gate**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-remove-command-files/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── screens/
│   └── MetaPromptInit.tsx          # Main wizard - MODIFY (remove command generation)
├── templates/
│   ├── roocode/
│   │   ├── commands/               # DELETE entire directory
│   │   │   ├── prime.prompt.md
│   │   │   ├── plan.prompt.md
│   │   │   ├── define-acceptance.prompt.md
│   │   │   ├── execute.prompt.md
│   │   │   ├── verify.prompt.md
│   │   │   └── status.prompt.md
│   │   ├── commands.json           # DELETE
│   │   ├── modes/                  # CREATE (new directory)
│   │   │   ├── roomodes.json       # CREATE (copy from kilocode structure)
│   │   │   └── meeseeks-*.prompt.md # CREATE (mode prompts)
│   │   └── prime/                  # KEEP unchanged
│   └── kilocode/
│       ├── commands/               # DELETE entire directory
│       ├── commands.json           # DELETE
│       ├── modes/                  # KEEP unchanged
│       └── prime/                  # KEEP unchanged
├── utils/
│   └── metaPrompt/
│       ├── generator.ts            # MODIFY (remove command-related functions)
│       ├── generator.test.ts       # MODIFY (update tests)
│       ├── embeddedTemplates.ts    # MODIFY (remove command templates, add RooCode modes)
│       ├── types.ts                # MODIFY (remove command types if any)
│       └── index.ts                # MODIFY (update exports)
└── hooks/
    └── useMetaPromptWizardState.ts # Review (may need state cleanup)

tests/
└── (existing test structure)
```

**Structure Decision**: Single project structure maintained. Changes are isolated to meta-prompting utilities and templates.

## Complexity Tracking

> No Constitution violations requiring justification.

---

## Phase 0: Research

See [research.md](./research.md) for detailed findings.

### Key Decisions

1. **RooCode Mode Format**: Use identical format to KiloCode's `.kilocodemodes` - create `.roomodes` file in project root
2. **Shared Mode Prompts**: Mode prompt files stored in `.meeseeks/modes/` for both extensions (already implemented for KiloCode)
3. **Template Embedding**: Add RooCode mode templates to `embeddedTemplates.ts` following existing KiloCode pattern
4. **Legacy Cleanup**: Remove command templates and generation logic entirely (no backward compatibility shim needed)

---

## Phase 1: Design

See [data-model.md](./data-model.md) for entity definitions.

### Files to Generate

**For RooCode** (when user selects RooCode):
- `.roomodes` (project root) - mode configuration JSON
- `.meeseeks/modes/meeseeks-prime.prompt.md`
- `.meeseeks/modes/meeseeks-orchestrate.prompt.md`
- `.meeseeks/modes/meeseeks-discuss.prompt.md`
- `.meeseeks/modes/meeseeks-plan.prompt.md`
- `.meeseeks/modes/meeseeks-generate-verification.prompt.md`
- `.meeseeks/modes/meeseeks-execute.prompt.md`
- `.meeseeks/modes/meeseeks-verify.prompt.md`
- Prime files in `.roo/` (unchanged)

**For KiloCode** (when user selects KiloCode):
- `.kilocodemodes` (project root) - unchanged
- `.meeseeks/modes/meeseeks-*.prompt.md` - unchanged
- Prime files in `.kilocode/workflows/context/` - unchanged

### Files to Remove

**Template files to delete**:
- `src/templates/roocode/commands/` (entire directory)
- `src/templates/roocode/commands.json`
- `src/templates/kilocode/commands/` (entire directory)
- `src/templates/kilocode/commands.json`

**Code to remove from `MetaPromptInit.tsx`**:
- Command file generation loop (lines ~229-264)
- `COMMAND_FILES` constant reference
- Related overwrite prompts for command files

**Code to remove from `generator.ts`**:
- `getCommandsSubdir()` function
- `getOutputExtension()` function (or repurpose for modes only)
- Command-related sections in `generateIndexMd()`

### Implementation Approach

1. **Add RooCode modes templates** to `embeddedTemplates.ts`
   - Create `ROOCODE_MODE_TEMPLATES` object mirroring `KILOCODE_MODE_TEMPLATES`
   - Add `getEmbeddedModeTemplate()` support for roocode extension

2. **Update MetaPromptInit.tsx generation logic**:
   - Remove command file iteration
   - Add mode file generation for RooCode (copy KiloCode logic with `.roomodes` output)
   - Keep mode file generation for KiloCode unchanged

3. **Clean up generator.ts**:
   - Remove command-related helper functions
   - Update `generateIndexMd()` to not reference commands section

4. **Delete template files** after code changes are verified

5. **Update tests** throughout to reflect new behavior

---

## Quickstart

See [quickstart.md](./quickstart.md) for step-by-step implementation guide.
