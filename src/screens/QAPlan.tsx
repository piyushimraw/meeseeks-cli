import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {useCopilot} from '../context/CopilotContext.js';
import {chatWithCopilot} from '../utils/copilot.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type QAPlanState = 'idle' | 'generating' | 'complete' | 'error';

interface QAPlanProps {
  onBack: () => void;
}

export const QAPlan: React.FC<QAPlanProps> = ({onBack}) => {
  const {authState, getToken} = useCopilot();
  const [state, setState] = useState<QAPlanState>('idle');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const token = getToken();
    if (!token) {
      setError('No Copilot token available. Please connect first.');
      setState('error');
      return;
    }

    setState('generating');
    setError(null);

    const result = await chatWithCopilot(token, [
      {
        role: 'system',
        content:
          'You are a QA engineer assistant. Generate concise, actionable test plans for code changes.',
      },
      {
        role: 'user',
        content:
          'Generate a brief sample QA test plan for a feature that adds user authentication. List 3-5 test cases with clear steps.',
      },
    ]);

    if (result.success && result.content) {
      setOutput(result.content);
      setState('complete');
    } else {
      setError(result.error || 'Failed to generate QA plan');
      setState('error');
    }
  };

  useInput((input, key) => {
    if (input === 'b' || key.escape) {
      onBack();
    }

    if (state === 'idle' && input === 'g' && authState.isConnected) {
      handleGenerate();
    }

    if ((state === 'complete' || state === 'error') && input === 'r') {
      setState('idle');
      setOutput(null);
      setError(null);
    }
  });

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              QA Plan Generator
            </Text>

            <Box marginTop={1} flexDirection="column">
              <Text>This feature will:</Text>
              <Box marginTop={1} flexDirection="column" marginLeft={2}>
                <Text color={palette.green}>
                  - Diff your current branch with main
                </Text>
                <Text color={palette.green}>
                  - Analyze changes using GitHub Copilot
                </Text>
                <Text color={palette.green}>
                  - Generate comprehensive test plan
                </Text>
                <Text color={palette.green}>
                  - Help verify changes before merging
                </Text>
              </Box>
            </Box>

            {authState.isConnected ? (
              <Box marginTop={2}>
                <Text color={palette.yellow}>
                  Press 'g' to generate a sample QA plan
                </Text>
              </Box>
            ) : (
              <Box marginTop={2} flexDirection="column">
                <Text color={palette.red}>
                  Not connected to Copilot
                </Text>
                <Text color={palette.dim}>
                  Please connect to Copilot first from the main menu
                </Text>
              </Box>
            )}
          </Box>
        );

      case 'generating':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Generating QA plan...</Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Analyzing with GitHub Copilot
              </Text>
            </Box>
          </Box>
        );

      case 'complete':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              QA Plan Generated
            </Text>
            <Box marginTop={1} flexDirection="column">
              {output?.split('\n').map((line, i) => (
                <Text key={i} color={palette.dim}>
                  {line}
                </Text>
              ))}
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to reset</Text>
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
              <Text color={palette.yellow}>Press 'r' to retry</Text>
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
        {'+-[ Create a QA Plan ]' + '-'.repeat(40) + '+'}
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
