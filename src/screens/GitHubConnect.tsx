import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {useGitHub} from '../context/GitHubContext.js';
import {verifyGitHubPAT, testCopilotCompletion} from '../utils/github.js';

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
  | 'connected'
  | 'input'
  | 'verifying'
  | 'testing-copilot'
  | 'success'
  | 'error';

interface GitHubConnectProps {
  onBack: () => void;
}

export const GitHubConnect: React.FC<GitHubConnectProps> = ({onBack}) => {
  const {authState, connect, disconnect} = useGitHub();
  const [state, setState] = useState<ConnectionState>('idle');
  const [patInput, setPatInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    username: string;
    hasCopilot: boolean;
    copilotMessage?: string;
  } | null>(null);

  useEffect(() => {
    if (authState.isConnected) {
      setState('connected');
    } else {
      setState('idle');
    }
  }, [authState.isConnected]);

  useInput((input, key) => {
    if (state === 'input') {
      return; // Let TextInput handle input
    }

    if (input === 'b' || key.escape) {
      if (state === 'error' || state === 'success') {
        setState(authState.isConnected ? 'connected' : 'idle');
        setError(null);
      } else {
        onBack();
      }
    }

    if (state === 'idle' && input === 'c') {
      setState('input');
    }

    if (state === 'connected' && input === 'd') {
      disconnect();
      setState('idle');
    }

    if (state === 'connected' && input === 't') {
      testCopilot();
    }
  });

  const handlePatSubmit = async (value: string) => {
    if (!value.trim()) {
      setError('Please enter a valid PAT');
      setState('error');
      return;
    }

    setState('verifying');
    setError(null);

    try {
      const result = await verifyGitHubPAT(value.trim());

      if (!result.success || !result.user) {
        setError(result.error || 'Failed to verify PAT');
        setState('error');
        return;
      }

      const hasCopilot = result.copilot?.hasAccess ?? false;

      // Save credentials
      connect(value.trim(), result.user.login, hasCopilot);

      setSuccessInfo({
        username: result.user.login,
        hasCopilot,
        copilotMessage: result.copilot?.error,
      });
      setState('success');
      setPatInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  };

  const testCopilot = async () => {
    setState('testing-copilot');
    const config = await import('../utils/settings.js').then(m =>
      m.getGitHubConfig(),
    );
    if (!config?.pat) {
      setError('No PAT found');
      setState('error');
      return;
    }

    const result = await testCopilotCompletion(config.pat);
    if (result.success) {
      setSuccessInfo({
        username: authState.username || '',
        hasCopilot: true,
        copilotMessage: result.message,
      });
      setState('success');
    } else {
      setError(result.message);
      setState('error');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              GitHub Copilot Connection
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>Connect your GitHub account to use Copilot models.</Text>
              <Box marginTop={1} flexDirection="column" marginLeft={2}>
                <Text color={palette.green}>
                  + Authenticate with GitHub PAT
                </Text>
                <Text color={palette.green}>+ Access GitHub Copilot models</Text>
                <Text color={palette.green}>
                  + Use AI-powered code assistance
                </Text>
              </Box>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>
                Press 'c' to connect with your GitHub PAT
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Note: Your PAT needs 'Copilot Requests' permission for Copilot
                access
              </Text>
            </Box>
          </Box>
        );

      case 'connected':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              Connected to GitHub
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text>Username: </Text>
                <Text color={palette.cyan} bold>
                  {authState.username}
                </Text>
              </Box>
              <Box>
                <Text>Copilot Access: </Text>
                <Text
                  color={authState.hasCopilotAccess ? palette.green : palette.red}
                  bold
                >
                  {authState.hasCopilotAccess ? 'Yes' : 'No'}
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
              {authState.hasCopilotAccess && (
                <Text color={palette.yellow}>
                  Press 't' to test Copilot connection
                </Text>
              )}
              <Text color={palette.orange}>
                Press 'd' to disconnect
              </Text>
            </Box>
          </Box>
        );

      case 'input':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Enter your GitHub Personal Access Token
            </Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Create a fine-grained PAT at:{' '}
              </Text>
            </Box>
            <Text color={palette.cyan}>
              https://github.com/settings/tokens?type=beta
            </Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Required permission: Copilot Requests
              </Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>PAT: </Text>
              <TextInput
                value={patInput}
                onChange={setPatInput}
                onSubmit={handlePatSubmit}
                mask="*"
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </Box>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Press Enter to submit, Esc to cancel
              </Text>
            </Box>
          </Box>
        );

      case 'verifying':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>
              Verifying GitHub PAT...
            </Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Checking authentication and Copilot access
              </Text>
            </Box>
          </Box>
        );

      case 'testing-copilot':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>
              Testing Copilot connection...
            </Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Sending a test request to GitHub Copilot
              </Text>
            </Box>
          </Box>
        );

      case 'success':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              Connection Successful!
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Box>
                <Text>Username: </Text>
                <Text color={palette.cyan} bold>
                  {successInfo?.username}
                </Text>
              </Box>
              <Box>
                <Text>Copilot Access: </Text>
                <Text
                  color={successInfo?.hasCopilot ? palette.green : palette.yellow}
                  bold
                >
                  {successInfo?.hasCopilot ? 'Yes' : 'No'}
                </Text>
              </Box>
              {successInfo?.copilotMessage && (
                <Box marginTop={1}>
                  <Text color={palette.dim}>
                    {successInfo.copilotMessage}
                  </Text>
                </Box>
              )}
            </Box>
            <Box marginTop={2}>
              <Text color={palette.dim}>
                Your credentials have been saved to ~/.meeseeks/config.json
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.yellow}>Press Esc/b to continue</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Connection Failed
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press Esc/b to try again</Text>
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
        {'+-[ Connect to GitHub ]' + '-'.repeat(40) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      {/* Keyboard hints */}
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
