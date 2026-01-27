# Research: Remove Command Files Generation

**Feature**: 001-remove-command-files
**Date**: 2026-01-27

## Research Questions

### 1. RooCode Custom Modes Format

**Question**: Does RooCode support custom modes in the same format as KiloCode?

**Finding**: Yes. According to the spec (line 114), "RooCode supports custom modes in the same format as KiloCode (using `.roomodes` file)." This assumption has been verified.

**Decision**: Create `.roomodes` file in project root with identical structure to `.kilocodemodes`

**Rationale**: Maintains consistency between extensions and simplifies implementation

**Alternatives Considered**:
- Different format for RooCode modes → Rejected (verified identical format works)
- Generating modes only for KiloCode → Rejected (parity is required per FR-001, FR-002)

---

### 2. Mode Prompt File Location

**Question**: Should mode prompt files be shared between RooCode and KiloCode?

**Finding**: Yes. The spec states mode prompt files should be stored in `.meeseeks/modes/` for both extensions (spec line 115). This is already implemented for KiloCode in `MetaPromptInit.tsx:280`.

**Decision**: Use `.meeseeks/modes/` for both extensions

**Rationale**:
- Modes are identical between extensions
- Reduces duplication
- Single location for customization

**Alternatives Considered**:
- Extension-specific mode directories (`.roo/modes/`, `.kilocode/modes/`) → Rejected (unnecessary duplication)

---

### 3. Existing Command File Generation Logic

**Question**: What code generates command files and needs to be removed?

**Finding**: Command file generation is in `MetaPromptInit.tsx:229-264`:
- Lines 137-153: Checking for existing command files
- Lines 229-264: Generating command files from embedded templates
- Uses `getCommandsSubdir()` and `getOutputExtension()` from `generator.ts`

Embedded command templates are in `embeddedTemplates.ts`:
- `ROOCODE_TEMPLATES` object contains: `prime`, `plan`, `define-acceptance`, `execute`, `verify`, `status`
- `KILOCODE_TEMPLATES` object (mirrored from ROOCODE)

Template files to delete:
- `src/templates/roocode/commands/` (6 files)
- `src/templates/roocode/commands.json`
- `src/templates/kilocode/commands/` (6 files)
- `src/templates/kilocode/commands.json`

**Decision**: Remove all command-related code and templates

**Rationale**: Clean removal per FR-004

---

### 4. RooCode Mode Template Content

**Question**: What content should go in RooCode mode templates?

**Finding**: Mode templates are identical between extensions - they reference the shared `.meeseeks/modes/meeseeks-{mode}.prompt.md` files. The mode configuration (`.roomodes`/`.kilocodemodes`) just needs the correct `roleDefinition` pointing to the right path.

The existing KiloCode mode templates in `KILOCODE_MODE_TEMPLATES` can be reused directly:
- `kilocodemodes` - JSON config for all modes
- `prime`, `orchestrate`, `discuss`, `plan`, `generate-verification`, `execute`, `verify` - mode prompts

**Decision**:
1. Create `ROOCODE_MODE_TEMPLATES` mirroring `KILOCODE_MODE_TEMPLATES`
2. Change only the config JSON name from `kilocodemodes` to `roomodes`
3. Mode prompt content remains identical

**Rationale**: Mode prompts are extension-agnostic; only the config file name differs

---

### 5. Impact on Existing Tests

**Question**: Which tests need to be updated?

**Finding**: Tests to modify:
- `src/utils/metaPrompt/generator.test.ts` - Remove tests for `getCommandsSubdir()`, `getOutputExtension()`, command sections in `generateIndexMd()`
- `src/hooks/useMetaPromptWizardState.test.ts` - May need updates if state structure changes

Tests that should remain unchanged:
- `src/utils/metaPrompt/techStackDetector.test.ts`
- `src/utils/metaPrompt/primeAnalyzer.test.ts`
- `src/utils/metaPrompt/changeDetector.test.ts`
- `src/utils/metaPrompt/taskState.test.ts`

**Decision**: Update tests in TDD order - write failing tests first for new behavior, then implement

---

### 6. Prime File Generation

**Question**: Is prime file generation affected?

**Finding**: No. Prime file generation is independent:
- `generatePrimeStub()` in `primeAnalyzer.ts`
- Files generated to `.roo/` or `.kilocode/workflows/context/`
- This logic is unchanged

**Decision**: Keep prime file generation as-is per FR-005

---

### 7. Index File Generation

**Question**: Does `generateIndexMd()` need updates?

**Finding**: Yes. The function in `generator.ts` generates markdown with a "Command Prompts" section. This section should either be removed entirely or repurposed for mode files.

Current structure:
```markdown
# Meta Prompting Files
## Prime Files (Codebase Context)
## Command Prompts  <-- REMOVE THIS SECTION
## Plans
```

**Decision**: Remove the "Command Prompts" section from `generateIndexMd()`

**Rationale**: Commands no longer exist; modes are in `.meeseeks/modes/` which is outside the target directory

---

## Summary of Required Changes

### Files to Modify

| File | Changes |
|------|---------|
| `src/screens/MetaPromptInit.tsx` | Remove command generation (lines 137-153, 229-264), add RooCode mode generation |
| `src/utils/metaPrompt/generator.ts` | Remove `getCommandsSubdir()`, `getOutputExtension()`, update `generateIndexMd()` |
| `src/utils/metaPrompt/generator.test.ts` | Remove command-related tests |
| `src/utils/metaPrompt/embeddedTemplates.ts` | Remove command templates from exports, add `ROOCODE_MODE_TEMPLATES`, extend `getEmbeddedModeTemplate()` |
| `src/utils/metaPrompt/types.ts` | Review for command-related types |
| `src/hooks/useMetaPromptWizardState.ts` | Review for command-related state |

### Files to Delete

- `src/templates/roocode/commands/` (entire directory)
- `src/templates/roocode/commands.json`
- `src/templates/kilocode/commands/` (entire directory)
- `src/templates/kilocode/commands.json`

### Files to Create

- `src/templates/roocode/modes/roomodes.json` (copy of `kilocodemodes.json` structure)
- `src/templates/roocode/modes/meeseeks-*.prompt.md` (7 mode files - optional, content embedded in TS)

Note: Template files in `src/templates/` are optional if content is fully embedded in `embeddedTemplates.ts`. The existing pattern embeds all content in TypeScript constants.
