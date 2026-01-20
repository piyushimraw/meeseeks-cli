import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

const palette = {
  cyan: '#00DFFF',
  yellow: '#FFD700',
  dim: '#666666',
};

interface SpinnerProps {
  label: string;
  subtext?: string;
  color?: string;
}

/**
 * Reusable loading spinner component
 * Standardizes async feedback across all screens
 */
export const Spinner: React.FC<SpinnerProps> = ({
  label,
  subtext,
  color = palette.yellow
}) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color}>
          <InkSpinner type="dots" />
        </Text>
        <Text> {label}</Text>
      </Box>
      {subtext && (
        <Box marginLeft={2}>
          <Text color={palette.dim}>{subtext}</Text>
        </Box>
      )}
    </Box>
  );
};
