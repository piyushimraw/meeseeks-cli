#!/usr/bin/env node
import React from 'react';
import {Box, Text, render} from 'ink';
import {meeseeksArt, tagline} from './ascii.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
};

const App = () => {
  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      {/* Top border */}
      <Text color={palette.orange}>{'╔' + '═'.repeat(62) + '╗'}</Text>
      
      {/* ASCII Art */}
      <Box flexDirection="column">
        {meeseeksArt.split('\n').map((line, i) => (
          <Text key={i} color={palette.cyan}>{'║ '}{line.padEnd(60)}{'║'}</Text>
        ))}
      </Box>

      {/* Bottom border */}
      <Text color={palette.orange}>{'╚' + '═'.repeat(62) + '╝'}</Text>
      
      {/* Status line */}
      <Box marginTop={1}>
        <Text color={palette.green}>
          {'  '}&gt; Welcome to Meeseeks CLI - Ready to help!
        </Text>
      </Box>
    </Box>
  );
};

render(<App />);
