import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '../components/Spinner.js';
import type { MetaPromptExtension } from '../types/index.js';
import { detectTechStack, hashTechStack } from '../utils/metaPrompt/techStackDetector.js';
import {
  ensureTargetDir,
  getTargetDir,
  getPrimeSubdir,
  checkExistingFile,
  generateFile,
  savePrimeMetadata,
} from '../utils/metaPrompt/generator.js';
import { generatePrimeStub, getAllPrimeFileNames } from '../utils/metaPrompt/primeAnalyzer.js';
import { getEmbeddedTemplate, getEmbeddedModeTemplate, type TemplateName, type ModeTemplateName } from '../utils/metaPrompt/embeddedTemplates.js';
import type { TechStack, OverwriteChoice, FileGenerationResult } from '../utils/metaPrompt/types.js';
import * as path from 'path';

// Mode files for KiloCode custom modes (Phase 7.1)
const MODE_FILES: ModeTemplateName[] = [
  'prime',
  'orchestrate',
  'discuss',
  'plan',
  'generate-verification',
  'execute',
  'verify',
];

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
        const primeSubdir = getPrimeSubdir(state.extension!);

        for (const primeName of primeFiles) {
          const primeDir = primeSubdir
            ? path.join(state.targetDir!, primeSubdir)
            : state.targetDir!;
          const filePath = path.join(primeDir, `${primeName}.md`);
          const existing = checkExistingFile(filePath);

          if (existing.exists && existing.content) {
            filesToPrompt.push({ file: filePath, existingContent: existing.content });
          }
        }

        // Check command files for RooCode only (KiloCode uses modes instead)
        if (state.extension === 'roocode') {
          const commandFileNames = ['prime', 'plan', 'define-acceptance', 'execute', 'verify', 'status'];

          for (const cmd of commandFileNames) {
            const outputFilename = `${cmd}.md`;
            const filePath = path.join(state.targetDir!, 'commands', outputFilename);
            const existing = checkExistingFile(filePath);

            if (existing.exists && existing.content) {
              filesToPrompt.push({ file: filePath, existingContent: existing.content });
            }
          }
        }

        // Check mode files for KiloCode (Phase 7.1)
        if (state.extension === 'kilocode') {
          // Check .kilocodemodes in project root
          const projectRoot = process.cwd();
          const kilocodemodesPath = path.join(projectRoot, '.kilocodemodes');
          const existingKilocodemodes = checkExistingFile(kilocodemodesPath);
          if (existingKilocodemodes.exists && existingKilocodemodes.content) {
            filesToPrompt.push({ file: kilocodemodesPath, existingContent: existingKilocodemodes.content });
          }

          // Check mode prompt files in .meeseeks/modes/ directory
          const modesDir = path.join(projectRoot, '.meeseeks', 'modes');
          for (const modeName of MODE_FILES) {
            const modeFilePath = path.join(modesDir, `meeseeks-${modeName}.prompt.md`);
            const existingMode = checkExistingFile(modeFilePath);
            if (existingMode.exists && existingMode.content) {
              filesToPrompt.push({ file: modeFilePath, existingContent: existingMode.content });
            }
          }
        }

        // Check mode files for RooCode (Phase 7.2 - T014)
        if (state.extension === 'roocode') {
          // Check .roomodes in project root
          const projectRoot = process.cwd();
          const roommodesPath = path.join(projectRoot, '.roomodes');
          const existingRoomodes = checkExistingFile(roommodesPath);
          if (existingRoomodes.exists && existingRoomodes.content) {
            filesToPrompt.push({ file: roommodesPath, existingContent: existingRoomodes.content });
          }

          // Check mode prompt files in .meeseeks/modes/ directory
          const modesDir = path.join(projectRoot, '.meeseeks', 'modes');
          for (const modeName of MODE_FILES) {
            const modeFilePath = path.join(modesDir, `meeseeks-${modeName}.prompt.md`);
            const existingMode = checkExistingFile(modeFilePath);
            if (existingMode.exists && existingMode.content) {
              filesToPrompt.push({ file: modeFilePath, existingContent: existingMode.content });
            }
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

          // Generate prime stub files in context/ subdirectory for KiloCode
          const primeSubdir = getPrimeSubdir(state.extension!);
          const primeDir = primeSubdir
            ? path.join(state.targetDir!, primeSubdir)
            : state.targetDir!;

          // Ensure prime directory exists
          ensureTargetDir(primeDir);

          const primeFiles = getAllPrimeFileNames();
          for (const primeName of primeFiles) {
            const filePath = path.join(primeDir, `${primeName}.md`);
            const choice = state.overwriteChoices.get(filePath) || 'overwrite';

            if (choice !== 'skip') {
              const content = generatePrimeStub(primeName, state.techStack!);
              const result = await generateFile(filePath, content, choice);
              results.push(result);
            } else {
              results.push({ path: filePath, status: 'skipped' });
            }
          }

          // Copy command templates from embedded templates (RooCode only - KiloCode uses modes)
          if (state.extension === 'roocode') {
            const commandFiles = [
              { name: 'prime' },
              { name: 'plan' },
              { name: 'define-acceptance' },
              { name: 'execute' },
              { name: 'verify' },
              { name: 'status' },
            ];

            for (const cmd of commandFiles) {
              // Get content from embedded templates
              const content = getEmbeddedTemplate(state.extension!, cmd.name as TemplateName);

              // Determine output filename with correct extension
              const outputFilename = `${cmd.name}.md`;

              // Determine target path - RooCode uses commands/ subdirectory
              const targetPath = path.join(state.targetDir!, 'commands', outputFilename);

              const choice = state.overwriteChoices.get(targetPath) || 'overwrite';

              if (choice !== 'skip') {
                const result = await generateFile(targetPath, content, choice);
                results.push(result);
              } else {
                results.push({ path: targetPath, status: 'skipped' });
              }
            }
          }

          // Generate mode files for KiloCode (Phase 7.1)
          if (state.extension === 'kilocode') {
            // Generate .kilocodemodes in project root
            const kilocodemodesPath = path.join(projectRoot, '.kilocodemodes');
            const kilocodemodesChoice = state.overwriteChoices.get(kilocodemodesPath) || 'overwrite';
            if (kilocodemodesChoice !== 'skip') {
              const kilocodemodesContent = getEmbeddedModeTemplate('kilocode', 'kilocodemodes');
              const kilocodemodesResult = await generateFile(kilocodemodesPath, kilocodemodesContent, kilocodemodesChoice);
              results.push(kilocodemodesResult);
            } else {
              results.push({ path: kilocodemodesPath, status: 'skipped' });
            }

            // Generate mode prompt files in .meeseeks/modes/ directory
            const modesDir = path.join(projectRoot, '.meeseeks', 'modes');
            ensureTargetDir(modesDir);

            for (const modeName of MODE_FILES) {
              const modeFilePath = path.join(modesDir, `meeseeks-${modeName}.prompt.md`);
              const modeChoice = state.overwriteChoices.get(modeFilePath) || 'overwrite';

              if (modeChoice !== 'skip') {
                const modeContent = getEmbeddedModeTemplate('kilocode', modeName);
                const modeResult = await generateFile(modeFilePath, modeContent, modeChoice);
                results.push(modeResult);
              } else {
                results.push({ path: modeFilePath, status: 'skipped' });
              }
            }
          }

          // Generate mode files for RooCode (Phase 7.2 - T015 and T016)
          if (state.extension === 'roocode') {
            // T015: Generate .roomodes in project root
            const roommodesPath = path.join(projectRoot, '.roomodes');
            const roommodesChoice = state.overwriteChoices.get(roommodesPath) || 'overwrite';
            if (roommodesChoice !== 'skip') {
              const roommodesContent = getEmbeddedModeTemplate('roocode', 'roomodes');
              const roommodesResult = await generateFile(roommodesPath, roommodesContent, roommodesChoice);
              results.push(roommodesResult);
            } else {
              results.push({ path: roommodesPath, status: 'skipped' });
            }

            // T016: Generate mode prompt files in .meeseeks/modes/ directory
            const modesDir = path.join(projectRoot, '.meeseeks', 'modes');
            ensureTargetDir(modesDir);

            for (const modeName of MODE_FILES) {
              const modeFilePath = path.join(modesDir, `meeseeks-${modeName}.prompt.md`);
              const modeChoice = state.overwriteChoices.get(modeFilePath) || 'overwrite';

              if (modeChoice !== 'skip') {
                // Use KiloCode mode templates for RooCode as well (same content)
                const modeContent = getEmbeddedModeTemplate('kilocode', modeName);
                const modeResult = await generateFile(modeFilePath, modeContent, modeChoice);
                results.push(modeResult);
              } else {
                results.push({ path: modeFilePath, status: 'skipped' });
              }
            }
          }

          // Save metadata in prime directory
          const metaDir = primeSubdir
            ? path.join(state.targetDir!, primeSubdir)
            : state.targetDir!;
          const metadata = {
            lastCommit: '', // Will be set by /prime command
            lastRun: new Date().toISOString(),
            filesGenerated: results.filter((r) => r.status !== 'error').map((r) => r.path),
            techStackHash: hashTechStack(state.techStack!),
          };
          savePrimeMetadata(metaDir, metadata);

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
