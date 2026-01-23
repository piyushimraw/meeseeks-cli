import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '../components/Spinner.js';
import type { MetaPromptExtension } from '../types/index.js';
import { detectTechStack, hashTechStack } from '../utils/metaPrompt/techStackDetector.js';
import {
  ensureTargetDir,
  getTargetDir,
  getCommandsSubdir,
  getOutputExtension,
  checkExistingFile,
  generateFile,
  generateIndexMd,
  listGeneratedFiles,
  savePrimeMetadata,
} from '../utils/metaPrompt/generator.js';
import { generatePrimeStub, getAllPrimeFileNames } from '../utils/metaPrompt/primeAnalyzer.js';
import type { TechStack, OverwriteChoice, FileGenerationResult } from '../utils/metaPrompt/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type WizardStep =
  | 'select-extension'
  | 'detecting-stack'
  | 'confirm-generation'
  | 'checking-existing'
  | 'prompt-overwrite'
  | 'generating'
  | 'complete'
  | 'error';

interface FileOverwritePrompt {
  file: string;
  existingContent: string;
}

interface WizardState {
  step: WizardStep;
  extension?: MetaPromptExtension;
  techStack?: TechStack;
  targetDir?: string;
  error?: string;
  selectedExtensionIndex: number;
  filesToPrompt: FileOverwritePrompt[];
  currentFileIndex: number;
  overwriteChoices: Map<string, OverwriteChoice>;
  generationResults: FileGenerationResult[];
}

interface MetaPromptInitProps {
  onBack: () => void;
}

export const MetaPromptInit: React.FC<MetaPromptInitProps> = ({ onBack }) => {
  const [state, setState] = useState<WizardState>({
    step: 'select-extension',
    selectedExtensionIndex: 0,
    filesToPrompt: [],
    currentFileIndex: 0,
    overwriteChoices: new Map(),
    generationResults: [],
  });

  const extensions: Array<{ value: MetaPromptExtension; label: string; description: string }> = [
    { value: 'roocode', label: 'RooCode', description: 'RooCode AI assistant extension' },
    { value: 'kilocode', label: 'KiloCode', description: 'KiloCode AI assistant extension' },
  ];

  // Auto-detect tech stack after extension selection
  useEffect(() => {
    if (state.step === 'detecting-stack' && state.extension) {
      const detect = async () => {
        try {
          const projectRoot = process.cwd();
          const techStack = await detectTechStack(projectRoot);
          const targetDir = getTargetDir(projectRoot, state.extension!);

          setState((prev) => ({
            ...prev,
            techStack,
            targetDir,
            step: 'confirm-generation',
          }));
        } catch (error) {
          setState((prev) => ({
            ...prev,
            step: 'error',
            error: error instanceof Error ? error.message : 'Failed to detect tech stack',
          }));
        }
      };

      detect();
    }
  }, [state.step, state.extension]);

  // Check for existing files
  useEffect(() => {
    if (state.step === 'checking-existing' && state.targetDir) {
      const checkFiles = async () => {
        const filesToPrompt: FileOverwritePrompt[] = [];
        const primeFiles = getAllPrimeFileNames();

        for (const primeName of primeFiles) {
          const filePath = path.join(state.targetDir!, `${primeName}.md`);
          const existing = checkExistingFile(filePath);

          if (existing.exists && existing.content) {
            filesToPrompt.push({ file: filePath, existingContent: existing.content });
          }
        }

        // Also check command files
        const commandFileNames = ['prime', 'plan', 'define-acceptance', 'execute', 'verify', 'status'];
        const commandsSubdir = state.extension === 'roocode' ? 'commands' : '';
        const outputExt = state.extension === 'roocode' ? '.md' : '.prompt.md';

        for (const cmd of commandFileNames) {
          const filePath = commandsSubdir
            ? path.join(state.targetDir!, commandsSubdir, `${cmd}${outputExt}`)
            : path.join(state.targetDir!, `${cmd}${outputExt}`);
          const existing = checkExistingFile(filePath);

          if (existing.exists && existing.content) {
            filesToPrompt.push({ file: filePath, existingContent: existing.content });
          }
        }

        if (filesToPrompt.length > 0) {
          setState((prev) => ({
            ...prev,
            filesToPrompt,
            step: 'prompt-overwrite',
          }));
        } else {
          // No conflicts, proceed to generation
          setState((prev) => ({
            ...prev,
            step: 'generating',
          }));
        }
      };

      checkFiles();
    }
  }, [state.step, state.targetDir]);

  // Generate files
  useEffect(() => {
    if (state.step === 'generating' && state.targetDir && state.techStack && state.extension) {
      const generate = async () => {
        try {
          const results: FileGenerationResult[] = [];
          const projectRoot = process.cwd();

          // Ensure target directory exists
          ensureTargetDir(state.targetDir!);

          // Generate prime stub files
          const primeFiles = getAllPrimeFileNames();
          for (const primeName of primeFiles) {
            const filePath = path.join(state.targetDir!, `${primeName}.md`);
            const choice = state.overwriteChoices.get(filePath) || 'overwrite';

            if (choice !== 'skip') {
              const content = generatePrimeStub(primeName, state.techStack!);
              const result = await generateFile(filePath, content, choice);
              results.push(result);
            } else {
              results.push({ path: filePath, status: 'skipped' });
            }
          }

          // Copy command templates from bundled templates
          const commandFiles = [
            { name: 'prime', source: 'prime.prompt.md' },
            { name: 'plan', source: 'plan.prompt.md' },
            { name: 'define-acceptance', source: 'define-acceptance.prompt.md' },
            { name: 'execute', source: 'execute.prompt.md' },
            { name: 'verify', source: 'verify.prompt.md' },
            { name: 'status', source: 'status.prompt.md' },
          ];

          // Get template path relative to compiled code
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const templatesBaseDir = path.join(__dirname, '..', 'templates', state.extension!);

          const commandsSubdir = getCommandsSubdir(state.extension!);
          const outputExt = getOutputExtension(state.extension!);

          for (const cmd of commandFiles) {
            const sourcePath = path.join(templatesBaseDir, 'commands', cmd.source);

            // Determine output filename with correct extension
            const outputFilename = state.extension === 'roocode'
              ? `${cmd.name}.md`  // RooCode: rename .prompt.md to .md
              : `${cmd.name}.prompt.md`;  // KiloCode: keep .prompt.md

            // Determine target path with correct subdirectory
            const targetPath = commandsSubdir
              ? path.join(state.targetDir!, commandsSubdir, outputFilename)
              : path.join(state.targetDir!, outputFilename);

            const choice = state.overwriteChoices.get(targetPath) || 'overwrite';

            if (choice !== 'skip') {
              // Check if source exists (for development with tsx vs built)
              let content: string;
              if (fs.existsSync(sourcePath)) {
                content = fs.readFileSync(sourcePath, 'utf-8');
              } else {
                // Fallback to src/ for development mode
                const devPath = path.join(projectRoot, 'src', 'templates', state.extension!, 'commands', cmd.source);
                if (fs.existsSync(devPath)) {
                  content = fs.readFileSync(devPath, 'utf-8');
                } else {
                  throw new Error(`Template not found: ${cmd.source}`);
                }
              }

              const result = await generateFile(targetPath, content, choice);
              results.push(result);
            } else {
              results.push({ path: targetPath, status: 'skipped' });
            }
          }

          // Generate INDEX.md
          const allFiles = listGeneratedFiles(state.targetDir!);
          const indexContent = generateIndexMd(state.targetDir!, allFiles);
          const indexPath = path.join(state.targetDir!, 'INDEX.md');
          const indexResult = await generateFile(indexPath, indexContent, 'overwrite');
          results.push(indexResult);

          // Save metadata
          const metadata = {
            lastCommit: '', // Will be set by /prime command
            lastRun: new Date().toISOString(),
            filesGenerated: results.filter((r) => r.status !== 'error').map((r) => r.path),
            techStackHash: hashTechStack(state.techStack!),
          };
          savePrimeMetadata(state.targetDir!, metadata);

          setState((prev) => ({
            ...prev,
            generationResults: results,
            step: 'complete',
          }));
        } catch (error) {
          setState((prev) => ({
            ...prev,
            step: 'error',
            error: error instanceof Error ? error.message : 'Failed to generate files',
          }));
        }
      };

      generate();
    }
  }, [state.step, state.targetDir, state.techStack, state.extension, state.overwriteChoices]);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      onBack();
      return;
    }

    if (state.step === 'select-extension') {
      if (key.upArrow) {
        setState((prev) => ({
          ...prev,
          selectedExtensionIndex:
            prev.selectedExtensionIndex > 0 ? prev.selectedExtensionIndex - 1 : extensions.length - 1,
        }));
      } else if (key.downArrow) {
        setState((prev) => ({
          ...prev,
          selectedExtensionIndex:
            prev.selectedExtensionIndex < extensions.length - 1 ? prev.selectedExtensionIndex + 1 : 0,
        }));
      } else if (key.return) {
        const selected = extensions[state.selectedExtensionIndex];
        setState((prev) => ({
          ...prev,
          extension: selected.value,
          step: 'detecting-stack',
        }));
      }
    } else if (state.step === 'confirm-generation') {
      if (input === 'y' || key.return) {
        setState((prev) => ({ ...prev, step: 'checking-existing' }));
      } else if (input === 'n') {
        onBack();
      }
    } else if (state.step === 'prompt-overwrite') {
      const currentFile = state.filesToPrompt[state.currentFileIndex];

      if (input === 'o') {
        // Overwrite
        const newChoices = new Map(state.overwriteChoices);
        newChoices.set(currentFile.file, 'overwrite');

        if (state.currentFileIndex < state.filesToPrompt.length - 1) {
          setState((prev) => ({
            ...prev,
            overwriteChoices: newChoices,
            currentFileIndex: prev.currentFileIndex + 1,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            overwriteChoices: newChoices,
            step: 'generating',
          }));
        }
      } else if (input === 's') {
        // Skip
        const newChoices = new Map(state.overwriteChoices);
        newChoices.set(currentFile.file, 'skip');

        if (state.currentFileIndex < state.filesToPrompt.length - 1) {
          setState((prev) => ({
            ...prev,
            overwriteChoices: newChoices,
            currentFileIndex: prev.currentFileIndex + 1,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            overwriteChoices: newChoices,
            step: 'generating',
          }));
        }
      } else if (input === 'a') {
        // Overwrite all remaining
        const newChoices = new Map(state.overwriteChoices);
        for (let i = state.currentFileIndex; i < state.filesToPrompt.length; i++) {
          newChoices.set(state.filesToPrompt[i].file, 'overwrite');
        }
        setState((prev) => ({
          ...prev,
          overwriteChoices: newChoices,
          step: 'generating',
        }));
      }
    } else if (state.step === 'complete') {
      if (key.return || input === 'q') {
        onBack();
      }
    } else if (state.step === 'error') {
      if (key.return || input === 'q') {
        onBack();
      }
    }
  });

  const renderSelectExtension = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.cyan}>Select extension to configure:</Text>
      </Box>
      <Box flexDirection="column" marginTop={1} marginLeft={4}>
        {extensions.map((ext, index) => (
          <Box key={ext.value}>
            <Text color={index === state.selectedExtensionIndex ? palette.cyan : undefined}>
              {index === state.selectedExtensionIndex ? '> ' : '  '}
              {ext.label}
            </Text>
            <Text color={palette.dim}> - {ext.description}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={2} marginLeft={2}>
        <Text color={palette.dim}>Up/Down Navigate  Enter Select  q Back</Text>
      </Box>
    </Box>
  );

  const renderDetectingStack = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Spinner label="Detecting tech stack..." />
      </Box>
    </Box>
  );

  const renderConfirmGeneration = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.cyan}>Detected Tech Stack:</Text>
      </Box>
      <Box flexDirection="column" marginTop={1} marginLeft={4}>
        <Text>
          <Text color={palette.yellow}>Runtime:</Text> {state.techStack?.runtime}
        </Text>
        {state.techStack?.language && (
          <Text>
            <Text color={palette.yellow}>Language:</Text> {state.techStack.language}
          </Text>
        )}
        {state.techStack?.packageManager && (
          <Text>
            <Text color={palette.yellow}>Package Manager:</Text> {state.techStack.packageManager}
          </Text>
        )}
        {state.techStack?.frameworks && state.techStack.frameworks.length > 0 && (
          <Text>
            <Text color={palette.yellow}>Frameworks:</Text> {state.techStack.frameworks.join(', ')}
          </Text>
        )}
        {state.techStack?.testFramework && (
          <Text>
            <Text color={palette.yellow}>Test Framework:</Text> {state.techStack.testFramework}
          </Text>
        )}
        {state.techStack?.buildTool && (
          <Text>
            <Text color={palette.yellow}>Build Tool:</Text> {state.techStack.buildTool}
          </Text>
        )}
      </Box>
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.cyan}>Target Directory:</Text>
        <Text color={palette.dim}> {state.targetDir}</Text>
      </Box>
      <Box marginTop={2} marginLeft={2}>
        <Text color={palette.green}>Generate meta prompting files?</Text>
        <Text color={palette.dim}> (y/n)</Text>
      </Box>
    </Box>
  );

  const renderCheckingExisting = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Spinner label="Checking for existing files..." />
      </Box>
    </Box>
  );

  const renderPromptOverwrite = () => {
    const currentFile = state.filesToPrompt[state.currentFileIndex];
    const fileName = path.basename(currentFile.file);

    return (
      <Box flexDirection="column">
        <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.yellow}>
            File exists ({state.currentFileIndex + 1}/{state.filesToPrompt.length}):
          </Text>
          <Text color={palette.cyan}> {fileName}</Text>
        </Box>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.dim}>Path: {currentFile.file}</Text>
        </Box>
        <Box marginTop={2} marginLeft={2}>
          <Text color={palette.green}>What would you like to do?</Text>
        </Box>
        <Box flexDirection="column" marginTop={1} marginLeft={4}>
          <Text>
            <Text color={palette.cyan}>o</Text> - Overwrite this file
          </Text>
          <Text>
            <Text color={palette.cyan}>s</Text> - Skip this file
          </Text>
          <Text>
            <Text color={palette.cyan}>a</Text> - Overwrite all remaining files
          </Text>
        </Box>
      </Box>
    );
  };

  const renderGenerating = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Spinner label="Generating files..." />
      </Box>
    </Box>
  );

  const renderComplete = () => {
    const created = state.generationResults.filter((r) => r.status === 'created').length;
    const updated = state.generationResults.filter((r) => r.status === 'updated').length;
    const skipped = state.generationResults.filter((r) => r.status === 'skipped').length;
    const errors = state.generationResults.filter((r) => r.status === 'error');

    return (
      <Box flexDirection="column">
        <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.green}>Setup Complete!</Text>
        </Box>
        <Box flexDirection="column" marginTop={1} marginLeft={4}>
          {created > 0 && (
            <Text>
              <Text color={palette.green}>Created:</Text> {created} files
            </Text>
          )}
          {updated > 0 && (
            <Text>
              <Text color={palette.yellow}>Updated:</Text> {updated} files
            </Text>
          )}
          {skipped > 0 && (
            <Text>
              <Text color={palette.dim}>Skipped:</Text> {skipped} files
            </Text>
          )}
          {errors.length > 0 && (
            <Box flexDirection="column">
              <Text color={palette.red}>Errors: {errors.length}</Text>
              {errors.map((err, i) => (
                <Text key={i} color={palette.red}>
                  - {err.path}: {err.error}
                </Text>
              ))}
            </Box>
          )}
          {created === 0 && updated === 0 && skipped === 0 && errors.length === 0 && (
            <Text color={palette.dim}>No files were processed.</Text>
          )}
        </Box>
        <Box marginTop={2} marginLeft={2}>
          <Text color={palette.cyan}>Target directory:</Text>
          <Text color={palette.dim}> {state.targetDir}</Text>
        </Box>
        <Box marginTop={2} marginLeft={2}>
          <Text color={palette.yellow}>Next Steps:</Text>
        </Box>
        <Box flexDirection="column" marginTop={1} marginLeft={4}>
          <Text>1. Review the generated files in {state.targetDir}</Text>
          <Text>2. Run the AI commands to populate context:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text color={palette.cyan}>/prime</Text>
            <Text color={palette.dim}> - Analyze codebase and generate context files</Text>
          </Box>
          <Text>3. Create plans with:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text color={palette.cyan}>/plan</Text>
            <Text color={palette.dim}> - Generate implementation plan</Text>
          </Box>
        </Box>
        <Box marginTop={2} marginLeft={2}>
          <Text color={palette.dim}>Press Enter or q to return to menu</Text>
        </Box>
      </Box>
    );
  };

  const renderError = () => (
    <Box flexDirection="column">
      <Text color={palette.orange}>{'+-[ Meta Prompting Setup ]' + '-'.repeat(37) + '+'}</Text>
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.red}>Error: {state.error}</Text>
      </Box>
      <Box marginTop={2} marginLeft={2}>
        <Text color={palette.dim}>Press Enter or q to return to menu</Text>
      </Box>
    </Box>
  );

  switch (state.step) {
    case 'select-extension':
      return renderSelectExtension();
    case 'detecting-stack':
      return renderDetectingStack();
    case 'confirm-generation':
      return renderConfirmGeneration();
    case 'checking-existing':
      return renderCheckingExisting();
    case 'prompt-overwrite':
      return renderPromptOverwrite();
    case 'generating':
      return renderGenerating();
    case 'complete':
      return renderComplete();
    case 'error':
      return renderError();
    default:
      return <Text>Unknown step</Text>;
  }
};
