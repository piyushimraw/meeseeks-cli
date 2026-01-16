#!/usr/bin/env node
import React, {useState} from 'react';
import {Box, Text, render} from 'ink';
import {meeseeksArt} from './ascii.js';
import {Menu} from './components/Menu.js';
import {GitHubConnect} from './screens/GitHubConnect.js';
import {QAPlan} from './screens/QAPlan.js';
import {GitHubProvider} from './context/GitHubContext.js';
import type {Screen} from './types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
};

const AppContent = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');

  const handleSelect = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'github-connect':
        return <GitHubConnect onBack={handleBack} />;
      case 'qa-plan':
        return <QAPlan onBack={handleBack} />;
      case 'main':
      default:
        return <Menu onSelect={handleSelect} />;
    }
  };

  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      {/* Top border */}
      <Text color={palette.orange}>{'#' + '='.repeat(62) + '#'}</Text>

      {/* ASCII Art */}
      <Box flexDirection="column">
        {meeseeksArt.split('\n').map((line, i) => (
          <Text key={i} color={palette.cyan}>
            {'| '}
            {line.padEnd(60)}
            {'|'}
          </Text>
        ))}
      </Box>

      {/* Bottom border */}
      <Text color={palette.orange}>{'#' + '='.repeat(62) + '#'}</Text>

      {/* Status line */}
      <Box marginTop={1}>
        <Text color={palette.green}>
          {'  '}&gt; Welcome to Meeseeks CLI - Ready to help!
        </Text>
      </Box>

      {/* Current screen */}
      {renderScreen()}
    </Box>
  );
};

const App = () => {
  return (
    <GitHubProvider>
      <AppContent />
    </GitHubProvider>
  );
};

render(<App />);
