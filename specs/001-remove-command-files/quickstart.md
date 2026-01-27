# Quickstart: Remove Command Files Generation

**Feature**: 001-remove-command-files
**Date**: 2026-01-27

## Implementation Sequence

This guide follows TDD (Test-First) as required by the Constitution.

---

## Step 1: Add RooCode Mode Templates to embeddedTemplates.ts

### 1.1 Test First

Add tests for RooCode mode template retrieval:

```typescript
// In a new test file or extend existing tests
describe('getEmbeddedModeTemplate with extension', () => {
  it('returns roomodes config for roocode extension', () => {
    const content = getEmbeddedModeTemplate('roocode', 'roomodes');
    expect(content).toContain('customModes');
  });

  it('returns kilocodemodes config for kilocode extension', () => {
    const content = getEmbeddedModeTemplate('kilocode', 'kilocodemodes');
    expect(content).toContain('customModes');
  });

  it('returns identical mode prompt content for both extensions', () => {
    const rooContent = getEmbeddedModeTemplate('roocode', 'prime');
    const kiloContent = getEmbeddedModeTemplate('kilocode', 'prime');
    expect(rooContent).toBe(kiloContent);
  });
});
```

### 1.2 Implementation

In `src/utils/metaPrompt/embeddedTemplates.ts`:

1. Create `ROOCODE_MODE_TEMPLATES` constant with:
   - `roomodes`: Copy of `kilocodemodes.json` content (change property if needed)
   - Mode prompts: Reference existing `KILOCODE_MODE_TEMPLATES` prompts

2. Update `getEmbeddedModeTemplate()` function signature:
   ```typescript
   export function getEmbeddedModeTemplate(
     extension: MetaPromptExtension,
     name: ModeTemplateName
   ): string;
   ```

3. Implement extension-aware template selection

---

## Step 2: Update MetaPromptInit.tsx - Remove Command Generation

### 2.1 Test First

Update `src/hooks/useMetaPromptWizardState.test.ts` if needed to reflect that command files are no longer part of the wizard flow.

### 2.2 Implementation

In `src/screens/MetaPromptInit.tsx`:

1. **Remove command file checking** (lines 136-153):
   - Delete the entire block that checks for existing command files
   - Keep only prime file and mode file checking

2. **Remove command file generation** (lines 229-264):
   - Delete the entire `commandFiles` array and loop
   - Keep only prime file and mode file generation

3. **Add RooCode mode generation** (after line 295):
   ```typescript
   // Generate mode files for RooCode
   if (state.extension === 'roocode') {
     // Generate .roomodes in project root
     const roomodesPath = path.join(projectRoot, '.roomodes');
     const roomodesChoice = state.overwriteChoices.get(roomodesPath) || 'overwrite';
     if (roomodesChoice !== 'skip') {
       const roomodesContent = getEmbeddedModeTemplate('roocode', 'roomodes');
       const roomodesResult = await generateFile(roomodesPath, roomodesContent, roomodesChoice);
       results.push(roomodesResult);
     }

     // Generate mode prompt files (same location as KiloCode)
     const modesDir = path.join(projectRoot, '.meeseeks', 'modes');
     ensureTargetDir(modesDir);
     for (const modeName of MODE_FILES) {
       const modeFilePath = path.join(modesDir, `meeseeks-${modeName}.prompt.md`);
       const modeChoice = state.overwriteChoices.get(modeFilePath) || 'overwrite';
       if (modeChoice !== 'skip') {
         const modeContent = getEmbeddedModeTemplate('roocode', modeName);
         const modeResult = await generateFile(modeFilePath, modeContent, modeChoice);
         results.push(modeResult);
       }
     }
   }
   ```

4. **Update mode file checking for RooCode** in the checking-existing effect:
   - Add `.roomodes` check for RooCode extension
   - Add mode prompt file checks for RooCode extension

---

## Step 3: Clean Up generator.ts

### 3.1 Test First

Update `src/utils/metaPrompt/generator.test.ts`:

1. Remove tests for `getCommandsSubdir()`
2. Remove tests for `getOutputExtension()`
3. Update `generateIndexMd()` tests to not expect "Command Prompts" section

### 3.2 Implementation

In `src/utils/metaPrompt/generator.ts`:

1. **Remove exports**:
   - Delete `getCommandsSubdir()` function
   - Delete `getOutputExtension()` function

2. **Update `generateIndexMd()`**:
   - Remove the code that generates the "Command Prompts" section
   - Keep "Prime Files" and "Plans" sections

3. **Update imports in MetaPromptInit.tsx**:
   - Remove `getCommandsSubdir` and `getOutputExtension` from imports

---

## Step 4: Remove Command Templates

### 4.1 Delete Template Files

```bash
# From repository root
rm -rf src/templates/roocode/commands/
rm src/templates/roocode/commands.json
rm -rf src/templates/kilocode/commands/
rm src/templates/kilocode/commands.json
```

### 4.2 Update embeddedTemplates.ts

1. Remove command content from `ROOCODE_TEMPLATES` (keep only what's needed for prime, if any)
2. Remove command content from `KILOCODE_TEMPLATES`
3. Remove `TemplateName` type or update to not include command names
4. Remove or update `getEmbeddedTemplate()` function

---

## Step 5: Create RooCode Mode Template Files (Optional)

If storing templates as files (for easier editing), create:

```bash
mkdir -p src/templates/roocode/modes/
```

Create `src/templates/roocode/modes/roomodes.json` with content matching `kilocodemodes.json`.

Note: This step is optional since templates are embedded in TypeScript constants.

---

## Step 6: Run Tests and Verify

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Type check
npm run typecheck
```

### Verification Checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] Coverage threshold (80%) maintained
- [ ] Running `meeseeks` → Meta-Prompting Setup → RooCode generates:
  - `.roomodes` in project root
  - `.meeseeks/modes/meeseeks-*.prompt.md` (7 files)
  - `.roo/*.md` (5 prime files)
  - NO files in `.roo/commands/`
- [ ] Running `meeseeks` → Meta-Prompting Setup → KiloCode generates:
  - `.kilocodemodes` in project root
  - `.meeseeks/modes/meeseeks-*.prompt.md` (7 files)
  - `.kilocode/workflows/context/*.md` (5 prime files)
  - NO files in `.kilocode/workflows/` (except context/)

---

## Edge Cases to Test

1. **Existing command files present**: Setup should not prompt for overwrite of command files (they're ignored)
2. **Existing mode files present**: Setup should prompt for overwrite of mode files
3. **Mixed existing state**: Both command and mode files present - only mode files prompted
4. **Fresh project**: No prompts, all files created
