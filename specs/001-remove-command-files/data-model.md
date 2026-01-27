# Data Model: Remove Command Files Generation

**Feature**: 001-remove-command-files
**Date**: 2026-01-27

## Entities

### Mode Configuration File

**Description**: JSON file containing custom mode definitions for AI assistant extensions.

**Instances**:
- `.roomodes` (RooCode) - project root
- `.kilocodemodes` (KiloCode) - project root

**Schema**:
```typescript
interface ModeConfigurationFile {
  customModes: CustomMode[];
}

interface CustomMode {
  slug: string;           // e.g., "meeseeks-prime"
  name: string;           // e.g., "Meeseeks: Prime"
  description: string;    // Brief description of mode purpose
  whenToUse: string;      // Guidance on when to activate this mode
  roleDefinition: string; // System prompt for the mode (references @.meeseeks/modes/...)
  groups: string[];       // Capability groups: "read" | "edit" | "command"
}
```

**Validation Rules**:
- `slug` must be unique within the file
- `slug` should follow pattern `meeseeks-{modeName}`
- `groups` must contain only valid group identifiers
- `roleDefinition` should reference mode prompt file path

**Example**:
```json
{
  "customModes": [
    {
      "slug": "meeseeks-prime",
      "name": "Meeseeks: Prime",
      "description": "Analyze codebase and generate context files",
      "whenToUse": "Use when setting up a new project for meeseeks workflow",
      "roleDefinition": "You are a codebase analysis specialist.\n\nRead @.meeseeks/modes/meeseeks-prime.prompt.md for full instructions.",
      "groups": ["read", "edit", "command"]
    }
  ]
}
```

---

### Mode Prompt File

**Description**: Markdown file containing detailed instructions for a specific mode.

**Location**: `.meeseeks/modes/meeseeks-{modeName}.prompt.md`

**Instances** (7 files, shared between RooCode and KiloCode):
- `meeseeks-prime.prompt.md`
- `meeseeks-orchestrate.prompt.md`
- `meeseeks-discuss.prompt.md`
- `meeseeks-plan.prompt.md`
- `meeseeks-generate-verification.prompt.md`
- `meeseeks-execute.prompt.md`
- `meeseeks-verify.prompt.md`

**Schema**:
```typescript
interface ModePromptFile {
  content: string;  // Markdown content with instructions
}
```

**Validation Rules**:
- File must exist at expected path
- Content should be non-empty markdown
- Filename must match pattern `meeseeks-{modeName}.prompt.md`

---

### Prime Context File

**Description**: Markdown file containing analyzed codebase context. (Unchanged from current implementation)

**Location**:
- RooCode: `.roo/{FILE}.md`
- KiloCode: `.kilocode/workflows/context/{FILE}.md`

**Instances** (5 files):
- `ARCHITECTURE.md`
- `CONVENTION.md`
- `INTEGRATION.md`
- `STACK.md`
- `STRUCTURE.md`

---

### Prime Metadata File

**Description**: JSON file tracking prime file generation state. (Unchanged from current implementation)

**Location**:
- RooCode: `.roo/.prime-meta.json`
- KiloCode: `.kilocode/workflows/context/.prime-meta.json`

**Schema**:
```typescript
interface PrimeMetadata {
  lastCommit: string;        // Git HEAD hash
  lastRun: string;           // ISO 8601 timestamp
  filesGenerated: string[];  // List of generated file names
  techStackHash: string;     // Hash of detected tech stack
}
```

---

## State Transitions

### File Generation Wizard Flow

```
select-extension → detecting-stack → confirm-generation → checking-existing
                                                               ↓
                                             [has conflicts?]
                                                   ↓ yes           ↓ no
                                          prompt-overwrite    generating
                                                   ↓               ↓
                                              generating ←─────────┘
                                                   ↓
                                               complete
```

### Files Generated per Extension

| Extension | Mode Config | Mode Prompts | Prime Files | Commands |
|-----------|-------------|--------------|-------------|----------|
| RooCode   | `.roomodes` | `.meeseeks/modes/*.prompt.md` | `.roo/*.md` | ~~.roo/commands/~~ REMOVED |
| KiloCode  | `.kilocodemodes` | `.meeseeks/modes/*.prompt.md` | `.kilocode/workflows/context/*.md` | ~~.kilocode/workflows/*.prompt.md~~ REMOVED |

---

## Type Definitions to Update

### embeddedTemplates.ts

```typescript
// REMOVE these command-related types
// export const ROOCODE_TEMPLATES (command portion)
// export const KILOCODE_TEMPLATES (command portion)
// export type TemplateName (command names)

// ADD RooCode mode support
export const ROOCODE_MODE_TEMPLATES = {
  roomodes: string;         // JSON content for .roomodes
  prime: string;            // Mode prompt content
  orchestrate: string;
  discuss: string;
  plan: string;
  'generate-verification': string;
  execute: string;
  verify: string;
};

// MODIFY getEmbeddedModeTemplate to accept extension
export function getEmbeddedModeTemplate(
  extension: 'roocode' | 'kilocode',
  name: ModeTemplateName
): string;
```

### generator.ts

```typescript
// REMOVE
export function getCommandsSubdir(extension: MetaPromptExtension): string;
export function getOutputExtension(extension: MetaPromptExtension): string;

// KEEP (unchanged)
export function getTargetDir(projectRoot: string, extension: MetaPromptExtension): string;
export function getPrimeSubdir(extension: MetaPromptExtension): string;
export function ensureTargetDir(dir: string): void;
export function checkExistingFile(filePath: string): { exists: boolean; content?: string };
export function generateFile(filePath: string, content: string, choice: OverwriteChoice): Promise<FileGenerationResult>;
export function savePrimeMetadata(targetDir: string, metadata: PrimeMetadata): void;

// MODIFY
export function generateIndexMd(targetDir: string, files: string[]): string;
// Remove "Command Prompts" section generation
```

---

## Relationships

```
MetaPromptExtension (roocode | kilocode)
        │
        ├──> Mode Configuration File (.roomodes | .kilocodemodes)
        │           │
        │           └──> references Mode Prompt Files (.meeseeks/modes/*)
        │
        └──> Prime Context Files (.roo/* | .kilocode/workflows/context/*)
                    │
                    └──> Prime Metadata File (.prime-meta.json)
```
