import React from 'react';
import {Box, Text, useInput} from 'ink';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  dim: '#666666',
};

interface QAPlanProps {
  onBack: () => void;
}

export const QAPlan: React.FC<QAPlanProps> = ({onBack}) => {
  useInput((input, key) => {
    if (input === 'b' || key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'┌─ Create a QA Plan ' + '─'.repeat(43) + '┐'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        <Text color={palette.cyan} bold>
          QA Plan Generator
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Text>This feature will:</Text>
          <Box marginTop={1} flexDirection="column" marginLeft={2}>
            <Text color={palette.green}>• Diff your current branch with main</Text>
            <Text color={palette.green}>• Analyze changes using internal knowledge base</Text>
            <Text color={palette.green}>• Generate comprehensive test plan for developers</Text>
            <Text color={palette.green}>• Help verify changes before merging</Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text color={palette.yellow} italic>
            Coming soon...
          </Text>
        </Box>
      </Box>

      <Text color={palette.orange}>{'└' + '─'.repeat(62) + '┘'}</Text>

      {/* Keyboard hints */}
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
