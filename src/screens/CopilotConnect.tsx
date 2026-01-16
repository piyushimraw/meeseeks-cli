import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {useCopilot} from '../context/CopilotContext.js';
import {
  getSourceDisplayName,
  testCopilotConnection,
  type DetectedToken,
} from '../utils/copilot.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type ConnectionState =
  | 'idle'
  | 'detecting'
  | 'verifying'
  | 'connected'
  | 'testing'
  | 'no-token'
  | 'success'
  | 'error';

interface CopilotConnectProps {
  onBack: () => void;
}

export const CopilotConnect: React.FC<CopilotConnectProps> = ({onBack}) => {
  const {authState, connect, disconnect, autoDetect, verify} = useCopilot();
  const [state, setState] = useState<ConnectionState>('idle');
  const [detectedToken, setDetectedToken] = useState<DetectedToken | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authState.isConnected) {
      setState('connected');
    } else {
      // Auto-detect on mount
      handleAutoDetect();
    }
  }, []);

  const handleAutoDetect = async () => {
    setState('detecting');
    setError(null);

    const token = await autoDetect();

    if (!token) {
      setState('no-token');
      return;
    }

    setDetectedToken(token);
    setState('verifying');

    const result = await verify(token.token);

    if (result.success) {
      connect(token.source, token.token);
      setState('connected');
    } else {
      setError(result.error || 'Failed to verify token');
      setState('error');
    }
  };

  const handleTest = async () => {
    setState('testing');
    setError(null);

    const token = await autoDetect();
    if (!token) {
      setError('No token found');
      setState('error');
      return;
    }

    const result = await testCopilotConnection(token.token);

    if (result.success) {
      setSuccessMessage(result.content || 'Connection successful!');
      setState('success');
    } else {
      setError(result.error || 'Test failed');
      setState('error');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setState('idle');
    setDetectedToken(null);
  };

  const handleRetry = () => {
    handleAutoDetect();
  };

  useInput((input, key) => {
    if (input === 'b' || key.escape) {
      if (state === 'error' || state === 'success') {
        setState(authState.isConnected ? 'connected' : 'idle');
        setError(null);
        setSuccessMessage(null);
      } else {
        onBack();
      }
    }

    if (state === 'connected') {
      if (input === 't') {
        handleTest();
      }
      if (input === 'd') {
        handleDisconnect();
      }
    }

    if (state === 'no-token' || state === 'error') {
      if (input === 'r') {
        handleRetry();
      }
    }
  });

  const renderContent = () => {
    switch (state) {
      case 'idle':
      case 'detecting':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Detecting Copilot tokens...</Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Checking CLI, VS Code, and JetBrains locations
              </Text>
            </Box>
          </Box>
        );

      case 'verifying':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Verifying token...</Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Found token from {getSourceDisplayName(detectedToken?.source || 'unknown')}
              </Text>
            </Box>
          </Box>
        );

      case 'connected':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              Connected to GitHub Copilot
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text>Token source: </Text>
                <Text color={palette.cyan} bold>
                  {getSourceDisplayName(authState.tokenSource || 'unknown')}
                </Text>
              </Box>
              {authState.lastVerified && (
                <Box>
                  <Text color={palette.dim}>
                    Last verified:{' '}
                    {new Date(authState.lastVerified).toLocaleString()}
                  </Text>
                </Box>
              )}
            </Box>
            <Box marginTop={2} flexDirection="column">
              <Text color={palette.yellow}>Press 't' to test connection</Text>
              <Text color={palette.orange}>Press 'd' to disconnect</Text>
            </Box>
          </Box>
        );

      case 'testing':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Testing Copilot connection...</Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>Sending a test request</Text>
            </Box>
          </Box>
        );

      case 'no-token':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow} bold>
              No Copilot Token Found
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>
                To use meeseeks, you need GitHub Copilot installed.
              </Text>
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.cyan} bold>
                  Option 1: Install GitHub Copilot CLI
                </Text>
                <Box marginLeft={2} flexDirection="column">
                  <Text color={palette.dim}>
                    npm install -g @githubnext/github-copilot-cli
                  </Text>
                  <Text color={palette.dim}>github-copilot-cli auth</Text>
                </Box>
              </Box>
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.cyan} bold>
                  Option 2: VS Code with Copilot Extension
                </Text>
                <Box marginLeft={2}>
                  <Text color={palette.dim}>
                    Install VS Code and the GitHub Copilot extension
                  </Text>
                </Box>
              </Box>
              <Box marginTop={1} flexDirection="column">
                <Text color={palette.cyan} bold>
                  Option 3: JetBrains IDE with Copilot Plugin
                </Text>
                <Box marginLeft={2}>
                  <Text color={palette.dim}>
                    Install the GitHub Copilot plugin in your JetBrains IDE
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to retry detection</Text>
            </Box>
          </Box>
        );

      case 'success':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              Connection Test Successful!
            </Text>
            <Box marginTop={1}>
              <Text color={palette.cyan}>{successMessage}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press Esc/b to continue</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Connection Error
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to retry</Text>
              <Text color={palette.dim}> | </Text>
              <Text color={palette.yellow}>Esc/b to go back</Text>
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
        {'+-[ Connect to Copilot ]' + '-'.repeat(38) + '+'}
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
