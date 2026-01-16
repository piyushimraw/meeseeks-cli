import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import type {Screen} from '../types/index.js';
import {useCopilot} from '../context/CopilotContext.js';
import {getSourceDisplayName} from '../utils/copilot.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

interface MenuProps {
  onSelect: (screen: Screen) => void;
}

interface MenuItemData {
  label: string;
  value: Screen;
  description?: string;
  category: 'providers' | 'agents' | 'tools';
}

const menuItems: MenuItemData[] = [
  {
    label: 'Connect to Copilot',
    value: 'copilot-connect',
    description: 'GitHub Copilot models',
    category: 'providers',
  },
  {
    label: 'Create a QA Plan',
    value: 'qa-plan',
    description: 'Diff branch & generate test plan',
    category: 'agents',
  },
  {
    label: 'View Git Changes',
    value: 'git-changes',
    description: 'See modified files in project',
    category: 'tools',
  },
];

export const Menu: React.FC<MenuProps> = ({onSelect}) => {
  const {exit} = useApp();
  const {authState} = useCopilot();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
    }

    if (key.return) {
      onSelect(menuItems[selectedIndex].value);
    }
  });

  const providerItems = menuItems.filter((item) => item.category === 'providers');
  const agentItems = menuItems.filter((item) => item.category === 'agents');
  const toolItems = menuItems.filter((item) => item.category === 'tools');

  const renderItem = (item: MenuItemData) => {
    const globalIndex = menuItems.indexOf(item);
    const isSelected = globalIndex === selectedIndex;
    const isCopilot = item.value === 'copilot-connect';

    return (
      <Box key={item.value}>
        <Text color={isSelected ? palette.cyan : undefined}>
          {isSelected ? '> ' : '  '}
          {item.label}
        </Text>
        {isCopilot && authState.isConnected ? (
          <Text color={palette.green}>
            {' '}
            [Connected: {getSourceDisplayName(authState.tokenSource || 'unknown')}]
          </Text>
        ) : (
          item.description && (
            <Text color={palette.dim}> ({item.description})</Text>
          )
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Menu box */}
      <Text color={palette.orange}>{'+-[ Main Menu ]' + '-'.repeat(47) + '+'}</Text>

      <Box flexDirection="column" paddingLeft={1}>
        {/* Providers Section */}
        <Box marginTop={1}>
          <Text color={palette.yellow} bold>
            PROVIDERS
          </Text>
          {authState.isInitializing ? (
            <Text color={palette.dim}> (detecting...)</Text>
          ) : authState.isConnected ? (
            <Text color={palette.green}> (1 connected)</Text>
          ) : null}
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          {providerItems.map(renderItem)}
        </Box>

        {/* Agents Section */}
        <Box marginTop={1}>
          <Text color={palette.yellow} bold>
            AGENTS
          </Text>
        </Box>
        <Box flexDirection="column" marginLeft={2}>
          {agentItems.map(renderItem)}
        </Box>

        {/* Tools Section */}
        <Box marginTop={1}>
          <Text color={palette.yellow} bold>
            TOOLS
          </Text>
        </Box>
        <Box flexDirection="column" marginLeft={2} marginBottom={1}>
          {toolItems.map(renderItem)}
        </Box>
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      {/* Keyboard hints */}
      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Up/Down Navigate  Enter Select  q Quit</Text>
      </Box>
    </Box>
  );
};
