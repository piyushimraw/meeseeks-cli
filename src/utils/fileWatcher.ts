import chokidar, { type FSWatcher } from 'chokidar';
import fg from 'fast-glob';
import * as fs from 'fs';
import * as path from 'path';
import type { FileChangeEvent, WatcherConfig } from '../types/index.js';

// Active watcher instance
let activeWatcher: FSWatcher | null = null;

/**
 * Resolve glob pattern to list of files
 * Supports brace expansion like "src/wildcard/wildcard.{ts,tsx}"
 */
export async function resolveGlobPattern(
  pattern: string,
  cwd: string = process.cwd()
): Promise<string[]> {
  try {
    const files = await fg.glob(pattern, {
      cwd,
      absolute: true,
      onlyFiles: true,
      braceExpansion: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    });
    return files;
  } catch {
    return [];
  }
}

/**
 * Start watching files matching the pattern
 */
export function startWatcher(
  config: WatcherConfig,
  cwd: string = process.cwd(),
  onFileChange: (event: FileChangeEvent) => void,
  onReady?: (watchedCount: number) => void,
  onError?: (error: string) => void
): void {
  // Stop any existing watcher
  stopWatcher();

  try {
    // First verify the pattern matches some files
    resolveGlobPattern(config.globPattern, cwd).then((initialFiles) => {
      if (initialFiles.length === 0) {
        onError?.('No files match the specified pattern');
        return;
      }

      // Watch the actual resolved files directly for reliability
      activeWatcher = chokidar.watch(initialFiles, {
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 500,
        binaryInterval: 500,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 200,
        },
      });

      // Set up event handlers
      activeWatcher.on('add', (filePath) => {
        onFileChange({
          type: 'add',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('change', (filePath) => {
        onFileChange({
          type: 'change',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('unlink', (filePath) => {
        onFileChange({
          type: 'unlink',
          path: filePath,
          timestamp: new Date().toISOString(),
        });
      });

      activeWatcher.on('ready', () => {
        onReady?.(initialFiles.length);
      });

      activeWatcher.on('error', (error: unknown) => {
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      });
    });
  } catch (err) {
    onError?.(err instanceof Error ? err.message : 'Failed to start watcher');
  }
}

/**
 * Stop the active watcher
 */
export function stopWatcher(): void {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
}

/**
 * Check if watcher is currently active
 */
export function isWatcherActive(): boolean {
  return activeWatcher !== null;
}

/**
 * Get the test file path for a source file
 * Preserves the source file extension (e.g., .ts -> .test.ts, .tsx -> .test.tsx)
 */
export function getTestFilePath(
  sourceFile: string,
  config: WatcherConfig
): string {
  const parsed = path.parse(sourceFile);
  // Use the source file's extension for the test file
  const ext = parsed.ext; // e.g., '.ts', '.tsx', '.js', '.jsx'
  const testFileName = `${parsed.name}.test${ext}`;

  if (config.outputPattern === 'colocated') {
    return path.join(parsed.dir, testFileName);
  } else {
    // Separate directory
    const outputDir = config.outputDir || 'tests';
    const relativePath = path.relative(process.cwd(), parsed.dir);
    return path.join(process.cwd(), outputDir, relativePath, testFileName);
  }
}

/**
 * Read source file content
 */
export function readSourceFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Write test file content
 */
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

/**
 * Check if test file already exists
 */
export function testFileExists(testPath: string): boolean {
  return fs.existsSync(testPath);
}

/**
 * Read existing test file content
 */
export function readTestFile(testPath: string): string | null {
  try {
    if (fs.existsSync(testPath)) {
      return fs.readFileSync(testPath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }
  return null;
}
