#!/usr/bin/env node
import React, {useState} from 'react';
import {Box, Text, render} from 'ink';
import {meeseeksArt} from './ascii.js';
import {Menu} from './components/Menu.js';
import {CopilotConnect} from './screens/CopilotConnect.js';
import {QAPlan} from './screens/QAPlan.js';
import {GitChanges} from './screens/GitChanges.js';
import {KnowledgeBase} from './screens/KnowledgeBase.js';
import {ModelSelect} from './screens/ModelSelect.js';
import {TestWatcher} from './screens/TestWatcher.js';
import {Settings} from './screens/Settings.js';
import {SprintView} from './screens/SprintView.js';
import {WorkflowWizard} from './screens/WorkflowWizard.js';
import {CopilotProvider} from './context/CopilotContext.js';
import {JiraProvider} from './context/JiraContext.js';
import {KnowledgeBaseProvider} from './context/KnowledgeBaseContext.js';
import {CredentialProvider} from './context/CredentialContext.js';
import type {Screen, JiraTicket} from './types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
};

const AppContent = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [workflowTicket, setWorkflowTicket] = useState<JiraTicket | null>(null);

  const handleSelect = (screen: Screen, ticket?: JiraTicket) => {
    if (ticket) setWorkflowTicket(ticket);
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'copilot-connect':
        return <CopilotConnect onBack={handleBack} />;
      case 'qa-plan':
        return <QAPlan onBack={handleBack} />;
      case 'git-changes':
        return <GitChanges onBack={handleBack} />;
      case 'knowledge-base':
        return <KnowledgeBase onBack={handleBack} />;
      case 'model-select':
        return <ModelSelect onBack={handleBack} />;
      case 'test-watcher':
        return <TestWatcher onBack={handleBack} />;
      case 'settings':
        return <Settings onBack={handleBack} />;
      case 'sprint':
        return <SprintView onBack={handleBack} onStartWorkflow={(ticket) => handleSelect('workflow', ticket)} />;
      case 'workflow':
        return workflowTicket ? (
          <WorkflowWizard
            ticket={workflowTicket}
            onBack={handleBack}
            onComplete={handleBack}
          />
        ) : (
          <SprintView onBack={handleBack} onStartWorkflow={(ticket) => handleSelect('workflow', ticket)} />
        );
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
    <CredentialProvider>
      <JiraProvider>
        <CopilotProvider>
          <KnowledgeBaseProvider>
            <AppContent />
          </KnowledgeBaseProvider>
        </CopilotProvider>
      </JiraProvider>
    </CredentialProvider>
  );
};

render(<App />);
