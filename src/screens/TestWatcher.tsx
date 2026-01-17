import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useCopilot } from '../context/CopilotContext.js';
import {
  startWatcher,
  stopWatcher,
  getTestFilePath,
  writeTestFile,
  resolveGlobPattern,
} from '../utils/fileWatcher.js';
import { generateTestsForFile } from '../utils/testGenerator.js';
import { getFoundRuleFiles } from '../utils/rulesLoader.js';
import type { FileChangeEvent, WatcherConfig, GeneratedTest } from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type WatcherState =
  | 'idle'
  | 'input-pattern'
  | 'select-output'
  | 'starting'
  | 'watching'
  | 'generating'
  | 'error';

interface ActivityLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'change' | 'generating' | 'success' | 'error';
  message: string;
  detail?: string;
}

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const LoadingSpinner: React.FC<{ text: string; subtext?: string }> = ({ text, subtext }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Text color={palette.yellow}>
        {spinnerFrames[frame]} {text}
      </Text>
      {subtext && (
        <Box marginTop={1}>
          <Text color={palette.dim}>{subtext}</Text>
        </Box>
      )}
    </Box>
  );
};

const ActivityLog: React.FC<{ entries: ActivityLogEntry[] }> = ({ entries }) => {
  if (entries.length === 0) return null;

  const getColor = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'change': return palette.cyan;
      case 'generating': return palette.yellow;
      case 'success': return palette.green;
      case 'error': return palette.red;
      default: return palette.dim;
    }
  };

  const getIcon = (type: ActivityLogEntry['type']) => {
    switch (type) {
      case 'change': return '◉';
      case 'generating': return '⚡';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '›';
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.yellow} bold>Activity Log</Text>
      <Box flexDirection="column" marginLeft={1}>
        {entries.slice(0, 6).map((entry) => (
          <Box key={entry.id} flexDirection="column">
            <Box>
              <Text color={palette.dim}>[{entry.timestamp}] </Text>
              <Text color={getColor(entry.type)}>{getIcon(entry.type)} {entry.message}</Text>
            </Box>
            {entry.detail && (
              <Box marginLeft={2}>
                <Text color={palette.dim}>{entry.detail}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

interface TestWatcherProps {
  onBack: () => void;
}

export const TestWatcher: React.FC<TestWatcherProps> = ({ onBack }) => {
  const { authState, getToken } = useCopilot();
  const [state, setState] = useState<WatcherState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [globPattern, setGlobPattern] = useState('src/**/*.ts');
  const [outputIndex, setOutputIndex] = useState(0);
  const [config, setConfig] = useState<WatcherConfig | null>(null);

  // Watching state
  const [watchedCount, setWatchedCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<FileChangeEvent[]>([]);
  const [lastGenerated, setLastGenerated] = useState<GeneratedTest | null>(null);
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);
  const [rulesFound, setRulesFound] = useState<string[]>([]);

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [logIdCounter, setLogIdCounter] = useState(0);

  const addLogEntry = useCallback((type: ActivityLogEntry['type'], message: string, detail?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogIdCounter((prev) => {
      const newId = prev + 1;
      setActivityLog((prevLog) => [
        { id: newId, timestamp, type, message, detail },
        ...prevLog,
      ].slice(0, 10));
      return newId;
    });
  }, []);

  // Load rules info on mount
  useEffect(() => {
    setRulesFound(getFoundRuleFiles());
  }, []);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      stopWatcher();
    };
  }, []);

  const outputOptions = [
    { label: 'Co-located', value: 'colocated' as const, desc: 'src/file.ts → src/file.test.ts' },
    { label: 'Separate directory', value: 'separate' as const, desc: 'src/file.ts → tests/file.test.ts' },
  ];

  const handleFileChange = useCallback(async (event: FileChangeEvent) => {
    // Skip if already generating or if it's a delete event
    if (state === 'generating' || event.type === 'unlink' || !config) return;

    const fileName = event.path.split('/').pop() || event.path;

    // Log file change detection
    addLogEntry('change', `File ${event.type}: ${fileName}`, event.path);

    // Add to recent events
    setRecentEvents((prev) => [event, ...prev].slice(0, 5));

    // Generate tests for the changed file
    const token = getToken();
    if (!token) {
      addLogEntry('error', 'Skipped: No Copilot token available');
      return;
    }

    const testPath = getTestFilePath(event.path, config);
    const testFileName = testPath.split('/').pop() || testPath;

    // Log test generation start
    addLogEntry('generating', `Generating tests: ${testFileName}`);

    setGeneratingFile(event.path);
    setState('generating');

    const result = await generateTestsForFile(
      event.path,
      testPath,
      token,
      authState.selectedModel
    );

    if (result.success && result.test) {
      // Write the test file
      const written = writeTestFile(testPath, result.test.content);
      if (written) {
        setLastGenerated(result.test);
        addLogEntry('success', `Tests generated: ${testFileName}`, testPath);
      } else {
        setError(`Failed to write test file: ${testPath}`);
        addLogEntry('error', `Failed to write: ${testFileName}`);
      }
    } else {
      setError(result.error || 'Failed to generate tests');
      addLogEntry('error', `Generation failed: ${result.error || 'Unknown error'}`);
    }

    setGeneratingFile(null);
    setState('watching');
  }, [state, config, getToken, authState.selectedModel, addLogEntry]);

  const startWatching = useCallback(async () => {
    if (!config) return;

    setState('starting');
    setActivityLog([]);

    // Verify pattern matches files
    const files = await resolveGlobPattern(config.globPattern);
    if (files.length === 0) {
      setError('No files match the specified pattern');
      setState('error');
      return;
    }

    startWatcher(
      config,
      process.cwd(),
      handleFileChange,
      (count) => {
        setWatchedCount(count);
        setState('watching');
        addLogEntry('info', `Watcher started`, `Watching ${count} files with pattern: ${config.globPattern}`);
      },
      (err) => {
        setError(err);
        setState('error');
        addLogEntry('error', `Watcher error: ${err}`);
      }
    );
  }, [config, handleFileChange, addLogEntry]);

  useInput((input, key) => {
    // Handle back/escape navigation
    if (key.escape || input === 'b') {
      if (state === 'watching' || state === 'generating') {
        stopWatcher();
        setState('idle');
        setActivityLog([]);
        return;
      }
      if (state === 'input-pattern') {
        setState('idle');
        return;
      }
      if (state === 'select-output') {
        setState('input-pattern');
        return;
      }
      if (state === 'error') {
        setState('idle');
        setError(null);
        return;
      }
      onBack();
      return;
    }

    // Idle state - press 'w' to start
    if (state === 'idle' && input === 'w' && authState.isConnected) {
      setState('input-pattern');
      return;
    }

    // Output selection
    if (state === 'select-output') {
      if (key.upArrow) {
        setOutputIndex((prev) => (prev > 0 ? prev - 1 : 1));
      } else if (key.downArrow) {
        setOutputIndex((prev) => (prev < 1 ? prev + 1 : 0));
      } else if (key.return) {
        const selectedOutput = outputOptions[outputIndex];
        const newConfig: WatcherConfig = {
          globPattern,
          outputPattern: selectedOutput.value,
          outputDir: selectedOutput.value === 'separate' ? 'tests' : undefined,
        };
        setConfig(newConfig);
        startWatching();
      }
      return;
    }

    // Stop watching with 's'
    if ((state === 'watching' || state === 'generating') && input === 's') {
      stopWatcher();
      setState('idle');
      setActivityLog([]);
      return;
    }
  });

  const handlePatternSubmit = (value: string) => {
    if (value.trim()) {
      setGlobPattern(value.trim());
      setState('select-output');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Test Watcher
            </Text>

            <Box marginTop={1} flexDirection="column">
              <Text>Automatically generate tests when source files change.</Text>

              <Box marginTop={1} flexDirection="column" marginLeft={2}>
                <Text color={palette.green}>- Watch files matching a glob pattern</Text>
                <Text color={palette.green}>- Generate tests using AI ({authState.selectedModel})</Text>
                <Text color={palette.green}>- Follow project testing rules</Text>
              </Box>

              {rulesFound.length > 0 && (
                <Box marginTop={1}>
                  <Text color={palette.dim}>
                    Found rules: {rulesFound.join(', ')}
                  </Text>
                </Box>
              )}
            </Box>

            {authState.isConnected ? (
              <Box marginTop={2}>
                <Text color={palette.yellow}>Press 'w' to start watching</Text>
              </Box>
            ) : (
              <Box marginTop={2} flexDirection="column">
                <Text color={palette.red}>Not connected to Copilot</Text>
                <Text color={palette.dim}>Please connect to Copilot first from the main menu</Text>
              </Box>
            )}
          </Box>
        );

      case 'input-pattern':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Enter Glob Pattern
            </Text>
            <Text color={palette.dim}>
              Specify which files to watch (e.g., src/**/*.ts)
            </Text>

            <Box marginTop={1}>
              <Text color={palette.yellow}>Pattern: </Text>
              <TextInput
                value={globPattern}
                onChange={setGlobPattern}
                onSubmit={handlePatternSubmit}
              />
            </Box>

            <Box marginTop={2}>
              <Text color={palette.dim}>Enter to confirm  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'select-output':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Select Test Output Location
            </Text>
            <Text color={palette.dim}>
              Pattern: {globPattern}
            </Text>

            <Box flexDirection="column" marginTop={1}>
              {outputOptions.map((opt, index) => (
                <Box key={opt.value} flexDirection="column">
                  <Box>
                    <Text color={index === outputIndex ? palette.cyan : undefined}>
                      {index === outputIndex ? '> ' : '  '}
                      {opt.label}
                    </Text>
                  </Box>
                  <Box marginLeft={4}>
                    <Text color={palette.dim}>{opt.desc}</Text>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box marginTop={2}>
              <Text color={palette.dim}>Up/Down to select  Enter to confirm  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'starting':
        return <LoadingSpinner text="Starting watcher..." subtext={`Pattern: ${globPattern}`} />;

      case 'watching':
      case 'generating':
        return (
          <Box flexDirection="column">
            <Box>
              <Text color={palette.green} bold>
                {state === 'generating' ? '⚡ ' : '👀 '}
                Watching {watchedCount} files
              </Text>
            </Box>
            <Text color={palette.dim}>Pattern: {globPattern}</Text>

            {state === 'generating' && generatingFile && (
              <Box marginTop={1}>
                <LoadingSpinner
                  text="Generating tests..."
                  subtext={generatingFile.split('/').pop()}
                />
              </Box>
            )}

            {lastGenerated && state !== 'generating' && (
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.green}>Last generated:</Text>
                <Text color={palette.dim}>
                  {lastGenerated.sourceFile.split('/').pop()} → {lastGenerated.testFile.split('/').pop()}
                </Text>
              </Box>
            )}

            <ActivityLog entries={activityLog} />

            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 's' to stop  Esc to go back</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Error
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press Esc to go back</Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Test Watcher ]' + '-'.repeat(44) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
