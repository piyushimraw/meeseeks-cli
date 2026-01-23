#!/usr/bin/env node
import React, {useState, useCallback} from 'react';
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
import {PlanGenerator} from './screens/PlanGenerator.js';
import {MetaPromptInit} from './screens/MetaPromptInit.js';
import {CopilotProvider} from './context/CopilotContext.js';
import {JiraProvider, useJira} from './context/JiraContext.js';
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
  const [planTicket, setPlanTicket] = useState<JiraTicket | null>(null);
  const { refresh } = useJira();

  const handleSelect = (screen: Screen, ticket?: JiraTicket) => {
    if (ticket) setWorkflowTicket(ticket);
    setCurrentScreen(screen);
  };

  const handleBack = () => {
    setCurrentScreen('main');
  };

  // Go back to sprint view (from workflow)
  const handleBackToSprint = useCallback(() => {
    setCurrentScreen('sprint');
  }, []);

  // Generate plan handler
  const handleGeneratePlan = useCallback((ticket: JiraTicket) => {
    setPlanTicket(ticket);
    setCurrentScreen('plan-generator');
  }, []);

  // Plan generator completion: refresh tickets and go to sprint
  const handlePlanComplete = useCallback(() => {
    refresh();
    setCurrentScreen('sprint');
  }, [refresh]);

  // Complete workflow: refresh tickets and go to sprint, or plan if requested
  const handleWorkflowComplete = useCallback((action?: 'plan') => {
    refresh();
    if (action === 'plan' && workflowTicket) {
      setPlanTicket(workflowTicket);
      setCurrentScreen('plan-generator');
    } else {
      setCurrentScreen('sprint');
    }
  }, [refresh, workflowTicket]);

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
        return (
          <SprintView
            onBack={handleBack}
            onStartWorkflow={(ticket) => handleSelect('workflow', ticket)}
            onGeneratePlan={handleGeneratePlan}
          />
        );
      case 'workflow':
        return workflowTicket ? (
          <WorkflowWizard
            ticket={workflowTicket}
            onBack={handleBackToSprint}
            onComplete={handleWorkflowComplete}
          />
        ) : (
          <SprintView
            onBack={handleBack}
            onStartWorkflow={(ticket) => handleSelect('workflow', ticket)}
            onGeneratePlan={handleGeneratePlan}
          />
        );
      case 'plan-generator':
        return planTicket ? (
          <PlanGenerator
            ticket={planTicket}
            onBack={handleBackToSprint}
            onComplete={handlePlanComplete}
          />
        ) : (
          <SprintView
            onBack={handleBack}
            onStartWorkflow={(ticket) => handleSelect('workflow', ticket)}
            onGeneratePlan={handleGeneratePlan}
          />
        );
      case 'meta-init':
        return <MetaPromptInit onBack={handleBack} />;
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
