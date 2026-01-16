import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {
  getGitStatus,
  getFileDiff,
  getUntrackedFileContent,
  type GitFileChange,
  type GitStatus,
  type FileDiff,
} from '../utils/git.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type ScreenState = 'loading' | 'not-repo' | 'file-list' | 'file-diff' | 'error';

interface GitChangesProps {
  onBack: () => void;
}

export const GitChanges: React.FC<GitChangesProps> = ({onBack}) => {
  const [state, setState] = useState<ScreenState>('loading');
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentDiff, setCurrentDiff] = useState<FileDiff | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadGitStatus = () => {
    setState('loading');
    const status = getGitStatus();
    setGitStatus(status);

    if (status.error) {
      setErrorMessage(status.error);
      setState('error');
    } else if (!status.isRepo) {
      setState('not-repo');
    } else {
      setState('file-list');
      setSelectedIndex(0);
    }
  };

  useEffect(() => {
    loadGitStatus();
  }, []);

  const handleViewDiff = (change: GitFileChange) => {
    let diff: FileDiff;
    if (change.status === 'untracked') {
      diff = getUntrackedFileContent(change.path);
    } else {
      diff = getFileDiff(change.path, change.staged);
    }
    setCurrentDiff(diff);
    setState('file-diff');
  };

  useInput((input, key) => {
    if (state === 'file-diff') {
      if (input === 'b' || key.escape) {
        setState('file-list');
        setCurrentDiff(null);
      }
      return;
    }

    if (state === 'file-list') {
      if (input === 'b' || key.escape) {
        onBack();
        return;
      }

      if (input === 'r') {
        loadGitStatus();
        return;
      }

      const changes = gitStatus?.changes || [];

      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : changes.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < changes.length - 1 ? prev + 1 : 0));
      }

      if (key.return && changes.length > 0) {
        handleViewDiff(changes[selectedIndex]);
      }
      return;
    }

    if (state === 'not-repo' || state === 'error') {
      if (input === 'b' || key.escape) {
        onBack();
      }
    }
  });

  const getStatusIndicator = (change: GitFileChange): string => {
    if (change.status === 'untracked') return '[?]';
    return change.staged ? '[S]' : '[U]';
  };

  const getStatusColor = (change: GitFileChange): string => {
    switch (change.status) {
      case 'added':
        return palette.green;
      case 'deleted':
        return palette.red;
      case 'modified':
        return palette.yellow;
      case 'renamed':
        return palette.cyan;
      case 'untracked':
        return palette.dim;
      default:
        return palette.dim;
    }
  };

  const renderDiffLine = (line: string, index: number) => {
    let color = undefined;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      color = palette.green;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      color = palette.red;
    } else if (line.startsWith('@@')) {
      color = palette.cyan;
    } else if (line.startsWith('diff ') || line.startsWith('index ')) {
      color = palette.dim;
    }

    return (
      <Text key={index} color={color}>
        {line}
      </Text>
    );
  };

  if (state === 'loading') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={palette.orange}>{'+-[ Git Changes ]' + '-'.repeat(45) + '+'}</Text>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.yellow}>Loading git status...</Text>
        </Box>
      </Box>
    );
  }

  if (state === 'not-repo') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={palette.orange}>{'+-[ Git Changes ]' + '-'.repeat(45) + '+'}</Text>
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color={palette.red}>Not a git repository</Text>
          <Text color={palette.dim}>
            The current directory is not inside a git repository.
          </Text>
        </Box>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.dim}>b Back</Text>
        </Box>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={palette.orange}>{'+-[ Git Changes ]' + '-'.repeat(45) + '+'}</Text>
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          <Text color={palette.red}>Error: {errorMessage}</Text>
        </Box>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.dim}>b Back</Text>
        </Box>
      </Box>
    );
  }

  if (state === 'file-diff' && currentDiff) {
    const lines = currentDiff.content.split('\n');
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={palette.orange}>{'+-[ Diff: ' + currentDiff.path + ' ]' + '-'.repeat(Math.max(0, 52 - currentDiff.path.length)) + '+'}</Text>
        <Box flexDirection="column" marginTop={1} marginLeft={1}>
          {lines.map((line, i) => renderDiffLine(line, i))}
        </Box>
        <Box marginTop={1} marginLeft={2}>
          <Text color={palette.dim}>b Back to file list</Text>
        </Box>
      </Box>
    );
  }

  // file-list state
  const changes = gitStatus?.changes || [];
  const stagedCount = changes.filter((c) => c.staged).length;
  const unstagedCount = changes.filter((c) => !c.staged && c.status !== 'untracked').length;
  const untrackedCount = changes.filter((c) => c.status === 'untracked').length;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>{'+-[ Git Changes ]' + '-'.repeat(45) + '+'}</Text>

      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        {/* Branch and repo info */}
        <Box>
          <Text color={palette.cyan}>Branch: </Text>
          <Text color={palette.green}>{gitStatus?.currentBranch || 'unknown'}</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color={palette.dim}>
            {stagedCount} staged, {unstagedCount} unstaged, {untrackedCount} untracked
          </Text>
        </Box>

        {changes.length === 0 ? (
          <Box marginTop={1}>
            <Text color={palette.green}>No changes detected - working tree clean</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {changes.map((change, index) => {
              const isSelected = index === selectedIndex;
              const statusIndicator = getStatusIndicator(change);
              const statusColor = getStatusColor(change);

              return (
                <Box key={`${change.path}-${change.staged}`}>
                  <Text color={isSelected ? palette.cyan : undefined}>
                    {isSelected ? '> ' : '  '}
                  </Text>
                  <Text color={statusColor}>{statusIndicator} </Text>
                  <Text color={isSelected ? palette.cyan : statusColor}>
                    {change.oldPath ? `${change.oldPath} -> ` : ''}
                    {change.path}
                  </Text>
                  <Text color={palette.dim}> ({change.status})</Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>
          Up/Down Navigate  Enter View diff  r Refresh  b Back
        </Text>
      </Box>
    </Box>
  );
};
