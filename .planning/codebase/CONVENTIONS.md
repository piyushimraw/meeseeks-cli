# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- TypeScript utilities: `camelCase.ts` (e.g., `knowledgeBase.ts`, `fileWatcher.ts`)
- React components: `PascalCase.tsx` (e.g., `CopilotConnect.tsx`, `QAPlan.tsx`)
- Type definitions: `index.ts` in `types/` directory
- Constants/exports: `camelCase.ts` (e.g., `ascii.ts`)

**Functions:**
- Regular functions: `camelCase` (e.g., `fetchPage`, `extractContent`, `normalizeUrl`)
- Async functions: `camelCase` with descriptive verbs (e.g., `crawlWebsite`, `indexKnowledgeBase`)
- Boolean functions: `is` or `has` prefix (e.g., `isValidUrl`, `isIndexed`, `hasTestingRules`)
- Getter functions: `get` prefix (e.g., `getKnowledgeBase`, `getToken`, `getFileDiff`)
- Action functions: verb prefix (e.g., `saveConfig`, `loadConfig`, `clearIndex`)

**Variables:**
- Local variables: `camelCase` (e.g., `currentChunk`, `allChunks`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CHUNK_SIZE`, `CHUNK_OVERLAP`, `KB_DIR`)
- Boolean variables: `is` or `has` prefix (e.g., `isSelected`, `truncated`)

**Types:**
- Interfaces: `PascalCase` (e.g., `KnowledgeBase`, `ChatMessage`, `GitFileChange`)
- Type aliases: `PascalCase` (e.g., `Screen`, `TokenSource`, `EmbedderMode`)
- Props interfaces: `ComponentNameProps` (e.g., `QAPlanProps`, `MenuProps`)

## Code Style

**Formatting:**
- No dedicated formatter configured (no .prettierrc or .eslintrc found)
- Consistent 2-space indentation observed throughout codebase
- Single quotes for strings
- Semicolons at end of statements
- Trailing commas in multiline arrays/objects

**Linting:**
- No ESLint/Biome configuration found
- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- Code follows implicit conventions consistently

**TypeScript Configuration:**
- Target: ES2020
- Module: NodeNext
- JSX: react-jsx
- Strict mode enabled
- ES module interop enabled

## Import Organization

**Order:**
1. Node.js built-in modules (`fs`, `path`, `os`, `crypto`)
2. External packages (`chokidar`, `fast-glob`, `ink`, `react`)
3. Internal types (`../types/index.js`)
4. Internal utilities (`./copilot.js`, `./settings.js`)

**Path Aliases:**
- No path aliases configured
- Relative paths used consistently
- All imports include `.js` extension (required for NodeNext module resolution)

**Example Pattern:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {KnowledgeBase, PageContent} from '../types/index.js';
import {crawlWebsite, isValidUrl} from './crawler.js';
```

## Error Handling

**Patterns:**
- Try-catch blocks wrap risky operations (file I/O, network requests, JSON parsing)
- Empty catch blocks with comments or silent fallback (`catch { // Ignore errors }`)
- Error messages extracted from Error objects: `error instanceof Error ? error.message : 'Unknown error'`
- Return result objects with success/error fields for operations

**Result Object Pattern:**
```typescript
// Used for operations that can fail
interface ResultPattern {
  success: boolean;
  data?: T;        // Present on success
  error?: string;  // Present on failure
}
```

**Network Error Handling:**
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    if (response.status === 401) {
      return {success: false, error: 'Token expired or invalid'};
    }
    return {success: false, error: `API returned status ${response.status}`};
  }
  // ... handle success
} catch (err) {
  return {
    success: false,
    error: err instanceof Error ? err.message : 'Network error',
  };
}
```

## Logging

**Framework:** Console (no logging library)

**Patterns:**
- No explicit logging observed in utility code
- Error information returned via result objects
- Progress callbacks used for long operations instead of logging

## Comments

**When to Comment:**
- Section dividers with `// ============` for major code sections
- JSDoc-style comments for public API functions
- Inline comments for non-obvious logic
- No comments on obvious code

**JSDoc/TSDoc:**
- Function descriptions use `/** */` block comments
- Parameter and return types inferred from TypeScript
- Example from `src/utils/rag.ts`:

```typescript
/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  // implementation
}

/**
 * Build TF-IDF vocabulary and IDF values from documents
 */
function buildTfIdfVocabulary(documents: string[], maxVocabSize: number = 5000): TfIdfState {
  // implementation
}
```

## Function Design

**Size:**
- Functions generally 10-50 lines
- Complex operations split into helper functions
- Long functions like `QAPlan.tsx` render method use switch statements for clarity

**Parameters:**
- Required parameters first, optional with defaults last
- Options objects for multiple optional parameters
- Destructuring used for options: `const opts = {...DEFAULT_OPTIONS, ...options}`
- Default parameter values: `maxVocabSize: number = 5000`

**Return Values:**
- Explicit return types (TypeScript infers but explicit types common)
- `null` for "not found" cases
- Result objects `{success, data?, error?}` for operations
- Void for side-effect only functions

## Module Design

**Exports:**
- Named exports for most functions: `export function functionName()`
- Type exports: `export type {TypeName}` or `export interface InterfaceName`
- Default export not used
- Re-exports: `export type {TokenSource}` to expose from related module

**Barrel Files:**
- `src/types/index.ts` exports all type definitions
- No general barrel file for utilities
- Each utility module exports its own functions

## React Component Patterns

**Functional Components:**
- All components are functional with `React.FC<Props>` typing
- Hooks: `useState`, `useEffect`, `useInput` (ink), `useContext`
- Custom hooks: `useCopilot()`, `useKnowledgeBase()`

**State Management:**
- React Context for global state (CopilotContext, KnowledgeBaseContext)
- Local `useState` for component-specific state
- State machines via string literals: `type State = 'idle' | 'loading' | 'complete'`

**Component Structure:**
```typescript
interface ComponentProps {
  onBack: () => void;
}

export const Component: React.FC<ComponentProps> = ({onBack}) => {
  const [state, setState] = useState<State>('idle');

  useInput((input, key) => {
    // keyboard handling
  });

  const renderContent = () => {
    switch (state) {
      case 'idle': return <IdleView />;
      case 'loading': return <LoadingSpinner />;
      // ...
    }
  };

  return (
    <Box flexDirection="column">
      {renderContent()}
    </Box>
  );
};
```

## Color Palette Convention

**Consistent palette object in components:**
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

*Convention analysis: 2026-01-20*
