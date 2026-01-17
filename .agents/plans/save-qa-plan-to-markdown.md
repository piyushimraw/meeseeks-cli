# Feature: Save QA Plan to Markdown File

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Add the ability to save generated QA plans as markdown files in `plans/qa/<plan-name>.md` when the user confirms. After a QA plan is generated, users can press 's' to save it with a custom filename. The saved file includes metadata (branch, model, date, knowledge base used) and the full QA plan content.

## User Story

As a developer using Meeseeks CLI
I want to save generated QA plans to markdown files
So that I can reference them later, share with my team, and track testing plans in my repository

## Problem Statement

Generated QA plans are displayed in the terminal but not persisted. Users lose valuable AI-generated test plans when they exit the application or navigate away. There's no way to save, reference, or share QA plans.

## Solution Statement

Add a save flow to the QAPlan screen that:
1. Activates when user presses 's' in the 'complete' state
2. Prompts for a filename via text input
3. Saves the QA plan as a markdown file with metadata header
4. Provides success/error feedback
5. Returns to the complete state showing save confirmation

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Low
**Primary Systems Affected**: QAPlan screen, new utility file
**Dependencies**: fs (Node.js built-in), ink-text-input (already installed v6.0.0)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `src/screens/QAPlan.tsx` (entire file) - Why: Main file to modify, contains state machine and render logic
- `src/screens/QAPlan.tsx` (lines 18-21) - Why: QAPlanState type definition to extend
- `src/screens/QAPlan.tsx` (lines 56, 60-64) - Why: State variables that hold data we need to save (output, branchInfo, selectedKB, modelInfo)
- `src/screens/QAPlan.tsx` (lines 269-284) - Why: useInput handler for 'complete' state where we add 's' key
- `src/screens/QAPlan.tsx` (lines 512-544) - Why: renderContent 'complete' case to modify UI hints
- `src/screens/KnowledgeBase.tsx` (lines 306-326) - Why: Pattern for TextInput with name submission flow
- `src/screens/KnowledgeBase.tsx` (lines 217-224) - Why: Pattern for handleNameSubmit validation
- `src/utils/fileWatcher.ts` (lines 161-172) - Why: Pattern for writeTestFile with directory creation
- `src/utils/settings.ts` (lines 17-21) - Why: Pattern for ensureConfigDir with mkdirSync

### New Files to Create

- `src/utils/qaPlan.ts` - Utility functions for saving QA plans to markdown files

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [ink-text-input npm](https://www.npmjs.com/package/ink-text-input)
  - Specific section: Basic usage with onSubmit
  - Why: Already used in codebase, follow same pattern
- [Node.js fs module](https://nodejs.org/api/fs.html#fsmkdirsyncpath-options)
  - Specific section: mkdirSync with recursive option
  - Why: Creating nested directories

### Patterns to Follow

**State Machine Pattern** (from QAPlan.tsx):
```typescript
type QAPlanState = 'idle' | 'select-diff-mode' | ... | 'complete' | 'error';
// Add: 'input-filename' | 'saving' | 'saved'
```

**TextInput Pattern** (from KnowledgeBase.tsx lines 306-326):
```typescript
const [newName, setNewName] = useState('');

const handleNameSubmit = () => {
  if (!newName.trim()) {
    setError('Name is required');
    return;
  }
  setError(null);
  // proceed to next state
};

// In render:
<Box marginTop={1}>
  <Text>Name: </Text>
  <TextInput
    value={newName}
    onChange={setNewName}
    onSubmit={handleNameSubmit}
    placeholder="e.g., React Docs"
  />
</Box>
```

**File Writing Pattern** (from fileWatcher.ts lines 161-172):
```typescript
export function writeTestFile(testPath: string, content: string): boolean {
  try {
    const dir = path.dirname(testPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testPath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
```

**Naming Conventions:**
- camelCase for functions and variables
- PascalCase for React components and types
- kebab-case for filenames
- All imports use `.js` extension

**Color Palette** (from QAPlan.tsx lines 9-16):
```typescript
const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

**Tasks:**
- Create new utility file `src/utils/qaPlan.ts` with save functions
- Add new types for saved QA plan metadata

### Phase 2: Core Implementation

**Tasks:**
- Implement `saveQAPlan()` function with markdown formatting
- Implement `sanitizeFilename()` for safe filenames
- Implement `ensurePlansDir()` for directory creation

### Phase 3: Integration

**Tasks:**
- Add new states to QAPlanState type
- Add state variables for filename input and save status
- Add 's' key handler in 'complete' state
- Add handleFilenameSubmit function
- Add render functions for new states
- Update 'complete' state UI to show 's' to save hint

### Phase 4: Testing & Validation

**Tasks:**
- Manual testing of save flow
- Test edge cases (empty filename, special characters, existing file)
- Verify markdown output format

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. CREATE `src/utils/qaPlan.ts`

- **IMPLEMENT**: Create utility file with QA plan saving functions
- **PATTERN**: Mirror fileWatcher.ts:161-172 for file writing
- **IMPORTS**: `import * as fs from 'fs'; import * as path from 'path';`
- **GOTCHA**: Use `.js` extension in imports, use `{recursive: true}` for mkdirSync

```typescript
import * as fs from 'fs';
import * as path from 'path';

const PLANS_DIR = 'plans/qa';

export interface QAPlanMetadata {
  filename: string;
  branchInfo: string;
  model: string | null;
  knowledgeBase: string | null;
  generatedAt: string;
}

/**
 * Sanitize filename - remove special characters, replace spaces with hyphens
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100); // Limit length
}

/**
 * Ensure plans/qa directory exists
 */
function ensurePlansDir(): string {
  const plansDir = path.join(process.cwd(), PLANS_DIR);
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, {recursive: true});
  }
  return plansDir;
}

/**
 * Generate markdown content with metadata header
 */
function formatQAPlanMarkdown(content: string, metadata: QAPlanMetadata): string {
  const lines = [
    `# QA Plan: ${metadata.filename}`,
    '',
    `**Generated**: ${new Date(metadata.generatedAt).toLocaleString()}`,
    `**Branch**: ${metadata.branchInfo}`,
    `**Model**: ${metadata.model || 'Unknown'}`,
    `**Knowledge Base**: ${metadata.knowledgeBase || 'None'}`,
    '',
    '---',
    '',
    content,
  ];
  return lines.join('\n');
}

/**
 * Save QA plan to markdown file
 * Returns the full path on success, null on error
 */
export function saveQAPlan(
  content: string,
  filename: string,
  metadata: Omit<QAPlanMetadata, 'filename' | 'generatedAt'>
): {success: boolean; path?: string; error?: string} {
  try {
    const sanitized = sanitizeFilename(filename);
    if (!sanitized) {
      return {success: false, error: 'Invalid filename'};
    }

    const plansDir = ensurePlansDir();
    const filePath = path.join(plansDir, `${sanitized}.md`);

    const fullMetadata: QAPlanMetadata = {
      ...metadata,
      filename: sanitized,
      generatedAt: new Date().toISOString(),
    };

    const markdown = formatQAPlanMarkdown(content, fullMetadata);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    return {success: true, path: filePath};
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save file',
    };
  }
}

/**
 * Generate a default filename from branch info
 */
export function generateDefaultFilename(branchInfo: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const branch = branchInfo.split(' ')[0] || 'qa-plan';
  return sanitizeFilename(`${branch}-${date}`);
}
```

- **VALIDATE**: `npx tsc --noEmit src/utils/qaPlan.ts`

### 2. UPDATE `src/screens/QAPlan.tsx` - Add imports

- **IMPLEMENT**: Add TextInput import and qaPlan utility imports
- **PATTERN**: Mirror KnowledgeBase.tsx line 3
- **IMPORTS**: Add at top of file after existing imports

Add after line 7 (after the git import):
```typescript
import TextInput from 'ink-text-input';
import {saveQAPlan, generateDefaultFilename} from '../utils/qaPlan.js';
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 3. UPDATE `src/screens/QAPlan.tsx` - Extend QAPlanState type

- **IMPLEMENT**: Add new states for save flow
- **PATTERN**: Extend existing union type on line 18

Change line 18 from:
```typescript
type QAPlanState = 'idle' | 'select-diff-mode' | 'select-branch' | 'loading-diff' | 'select-kb' | 'searching' | 'generating' | 'complete' | 'error';
```
To:
```typescript
type QAPlanState = 'idle' | 'select-diff-mode' | 'select-branch' | 'loading-diff' | 'select-kb' | 'searching' | 'generating' | 'complete' | 'error' | 'input-filename' | 'saving' | 'saved';
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 4. UPDATE `src/screens/QAPlan.tsx` - Add state variables for save

- **IMPLEMENT**: Add filename state and savedPath state
- **PATTERN**: Mirror existing useState patterns around lines 55-69

Add after line 69 (after selectedBranch state):
```typescript
const [filename, setFilename] = useState('');
const [savedPath, setSavedPath] = useState<string | null>(null);
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 5. UPDATE `src/screens/QAPlan.tsx` - Add save key handler

- **IMPLEMENT**: Add 's' key handler in complete state within useInput
- **PATTERN**: Mirror the existing 'r' key handler on lines 270-284

Find the block starting at line 269 (the reset handler for complete/error state):
```typescript
// Reset from complete/error state
if ((state === 'complete' || state === 'error') && input === 'r') {
```

Add BEFORE this block (around line 269):
```typescript
    // Save from complete state
    if (state === 'complete' && input === 's' && output) {
      const defaultName = generateDefaultFilename(branchInfo);
      setFilename(defaultName);
      setState('input-filename');
      return;
    }
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 6. UPDATE `src/screens/QAPlan.tsx` - Add filename submission handler

- **IMPLEMENT**: Add handleFilenameSubmit function
- **PATTERN**: Mirror KnowledgeBase.tsx handleNameSubmit (lines 217-224)

Add after the handleGenerate function (after line 181), before useInput:
```typescript
  const handleFilenameSubmit = () => {
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }
    if (!output) {
      setError('No QA plan to save');
      return;
    }

    setState('saving');
    setError(null);

    // Small delay for visual feedback
    setTimeout(() => {
      const result = saveQAPlan(output, filename, {
        branchInfo,
        model: modelInfo,
        knowledgeBase: selectedKB?.name || null,
      });

      if (result.success && result.path) {
        setSavedPath(result.path);
        setState('saved');
      } else {
        setError(result.error || 'Failed to save file');
        setState('complete');
      }
    }, 300);
  };
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 7. UPDATE `src/screens/QAPlan.tsx` - Add back handler for input-filename

- **IMPLEMENT**: Handle escape/back in input-filename state
- **PATTERN**: Mirror existing back handlers in useInput (lines 185-196)

In the useInput function, find the back/escape handler block (around line 185-196). Update it to handle the new states. Replace the existing block:
```typescript
    // Handle back/escape navigation
    if (input === 'b' || key.escape) {
      if (state === 'select-diff-mode') {
        setState('idle');
      } else if (state === 'select-branch') {
        setState('select-diff-mode');
      } else if (state === 'select-kb') {
        setState('select-diff-mode');
      } else {
        onBack();
      }
      return;
    }
```

With:
```typescript
    // Handle back/escape navigation
    if (input === 'b' || key.escape) {
      if (state === 'select-diff-mode') {
        setState('idle');
      } else if (state === 'select-branch') {
        setState('select-diff-mode');
      } else if (state === 'select-kb') {
        setState('select-diff-mode');
      } else if (state === 'input-filename') {
        setState('complete');
        setError(null);
      } else if (state === 'saved') {
        setState('complete');
        setSavedPath(null);
      } else {
        onBack();
      }
      return;
    }
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 8. UPDATE `src/screens/QAPlan.tsx` - Update reset handler

- **IMPLEMENT**: Reset new state variables when pressing 'r'
- **PATTERN**: Extend existing reset block (lines 270-284)

Find the reset block and add the new state resets. The block currently ends around line 284. Add these resets inside the if block, before the closing brace:
```typescript
      setFilename('');
      setSavedPath(null);
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 9. UPDATE `src/screens/QAPlan.tsx` - Add renderInputFilename

- **IMPLEMENT**: Add render function for filename input state
- **PATTERN**: Mirror KnowledgeBase.tsx renderCreateName (lines 306-326)

Add after the 'error' case in renderContent (around line 558, before the default case):
```typescript
      case 'input-filename':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              Save QA Plan
            </Text>
            <Text color={palette.dim}>
              Enter a name for the QA plan file:
            </Text>
            <Box marginTop={1}>
              <Text color={palette.yellow}>Filename: </Text>
              <TextInput
                value={filename}
                onChange={setFilename}
                onSubmit={handleFilenameSubmit}
                placeholder="my-feature-qa-plan"
              />
              <Text color={palette.dim}>.md</Text>
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color={palette.red}>{error}</Text>
              </Box>
            )}
            <Box marginTop={2}>
              <Text color={palette.dim}>Enter to save  Esc to cancel</Text>
            </Box>
          </Box>
        );

      case 'saving':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Saving QA plan...</Text>
          </Box>
        );

      case 'saved':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              QA Plan Saved!
            </Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>File: {savedPath}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press Esc to continue</Text>
            </Box>
          </Box>
        );
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

### 10. UPDATE `src/screens/QAPlan.tsx` - Update complete state UI hints

- **IMPLEMENT**: Add 's' to save hint in complete state
- **PATTERN**: Update existing hints block

Find the complete case render (around line 540-541):
```typescript
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to reset</Text>
            </Box>
```

Replace with:
```typescript
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 's' to save  'r' to reset</Text>
            </Box>
```

- **VALIDATE**: `npx tsc --noEmit src/screens/QAPlan.tsx`

---

## TESTING STRATEGY

### Unit Tests

This project does not have a test framework configured. Manual testing is required.

### Integration Tests

N/A - no test framework

### Edge Cases

- **Empty filename**: Should show error "Filename is required"
- **Special characters in filename**: Should be sanitized (e.g., "my plan!" → "my-plan")
- **Very long filename**: Should be truncated to 100 characters
- **No QA plan generated**: Should not allow save (button hidden/disabled)
- **Directory doesn't exist**: Should create `plans/qa/` automatically
- **File write error**: Should show error message and return to complete state

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
# TypeScript compilation check
npx tsc --noEmit
```

### Level 2: Build

```bash
# Full build
npm run build
```

### Level 3: Runtime Test

```bash
# Start the application
npm run start
```

### Level 4: Manual Validation

1. Start the app with `npm run start`
2. Connect to Copilot (if not already)
3. Navigate to "Create a QA Plan"
4. Press 'g' to generate a QA plan
5. Wait for generation to complete
6. Verify the UI shows "Press 's' to save  'r' to reset"
7. Press 's' - should show filename input with default name
8. Press Esc - should return to complete state
9. Press 's' again, modify filename, press Enter
10. Verify "QA Plan Saved!" message with file path
11. Press Esc to continue
12. Verify file exists at `plans/qa/<filename>.md`
13. Verify file contains:
    - Header with title
    - Metadata (date, branch, model, KB)
    - Separator
    - Full QA plan content
14. Test edge cases:
    - Empty filename (should show error)
    - Filename with special characters (should sanitize)
    - Press 'r' to reset, then generate and save again

---

## ACCEPTANCE CRITERIA

- [ ] User can press 's' in complete state to initiate save flow
- [ ] TextInput shows with default filename based on branch
- [ ] User can modify filename before saving
- [ ] Esc cancels save and returns to complete state
- [ ] Enter saves file to `plans/qa/<filename>.md`
- [ ] Success message shows saved file path
- [ ] Markdown file includes metadata header (date, branch, model, KB)
- [ ] Directory `plans/qa/` is created automatically if missing
- [ ] Invalid filenames are sanitized
- [ ] Empty filename shows error message
- [ ] 'r' to reset clears save-related state
- [ ] TypeScript compiles without errors
- [ ] Application builds successfully

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing confirms all acceptance criteria
- [ ] No linting or type checking errors

---

## NOTES

**Design Decisions:**

1. **Default filename**: Uses branch name + date for meaningful defaults (e.g., "feature-auth-2024-01-15")

2. **Filename sanitization**: Removes special characters, converts to lowercase, replaces spaces with hyphens - follows common URL/file slug conventions

3. **Save location**: Uses `plans/qa/` in project root (cwd) rather than `~/.meeseeks/` because QA plans are project-specific and should be version-controlled

4. **Markdown format**: Includes metadata header for context when reviewing plans later

5. **State machine**: Added 3 new states (input-filename, saving, saved) to maintain consistency with existing patterns

**Trade-offs:**

- No overwrite confirmation: If a file with the same name exists, it will be overwritten silently. This keeps the UX simple. Could add confirmation in future.

- No file listing: Users can't see existing saved plans from within the app. They need to check the filesystem. Could add a "View saved plans" feature later.

**Future Enhancements:**

- Add 'y' confirmation for overwriting existing files
- Add a screen to list/view/delete saved QA plans
- Add copy-to-clipboard option
- Add export to different formats (JSON, HTML)
