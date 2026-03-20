import React, {useState, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {
  createInitialState,
  transitionToScoping,
  transitionToBrainstorming,
  transitionToPlanning,
  transitionToExecuting,
  transitionToPaused,
  transitionToCompleted,
  addQuestionAnswer,
  skipQuestion,
  confirmPhaseBreakdown,
  setError,
  addLlmQuestion,
  type SuperRalphScreenState,
} from '../hooks/useSuperRalphState.js';
import {getTemplateQuestions} from '../utils/superRalph/brainstorm.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

interface SuperRalphProps {
  onBack: () => void;
}

export const SuperRalph: React.FC<SuperRalphProps> = ({onBack}) => {
  const [state, setState] = useState<SuperRalphScreenState>(createInitialState());
  const [inputValue, setInputValue] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
  });

  const handleTaskSubmit = useCallback((value: string) => {
    if (!value.trim()) return;
    setState(prev => transitionToScoping(prev, value.trim()));
    setInputValue('');
  }, []);

  const handleAnswerSubmit = useCallback((value: string) => {
    if (value.toLowerCase() === 'skip') {
      setState(prev => skipQuestion(prev));
    } else if (value.toLowerCase() === 'done') {
      setState(prev => transitionToPlanning(prev));
    } else {
      setState(prev => addQuestionAnswer(prev, value));
    }
    setInputValue('');
  }, []);

  const renderContent = () => {
    switch (state.step) {
      case 'idle':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow}>Describe your task:</Text>
            <Box marginTop={1}>
              <Text color={palette.cyan}>&gt; </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleTaskSubmit}
                placeholder="e.g., Build the analytics dashboard from Figma"
              />
            </Box>
          </Box>
        );

      case 'scoping':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={palette.cyan}>
                <Spinner type="dots" />
              </Text>
              <Text color={palette.yellow}> {state.loadingMessage}</Text>
            </Box>
          </Box>
        );

      case 'brainstorming': {
        if (state.currentQuestionIndex >= state.questions.length) {
          return (
            <Box flexDirection="column" marginTop={1}>
              <Text color={palette.green}>Brainstorming complete for this phase.</Text>
            </Box>
          );
        }

        const currentQuestion = state.questions[state.currentQuestionIndex];
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow}>
              Phase {state.currentPhaseIndex + 1} — Question {state.currentQuestionIndex + 1}/{state.questions.length}
            </Text>
            <Box marginTop={1}>
              <Text color={palette.cyan}>{currentQuestion.question}</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.cyan}>&gt; </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleAnswerSubmit}
                placeholder="Type answer, 'skip', or 'done'"
              />
            </Box>
          </Box>
        );
      }

      case 'planning':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={palette.cyan}>
                <Spinner type="dots" />
              </Text>
              <Text color={palette.yellow}> {state.loadingMessage}</Text>
            </Box>
          </Box>
        );

      case 'executing':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow} bold>Executing Ralph Loop</Text>
            {state.executionProgress && (
              <Box flexDirection="column" marginTop={1}>
                <Text>Phase: {state.executionProgress.phase}</Text>
                <Text>Iteration: {state.executionProgress.iteration}/{state.executionProgress.maxIterations}</Text>
                <Text>
                  Tasks: {state.executionProgress.tasksCompleted.length}/
                  {state.executionProgress.tasksCompleted.length + state.executionProgress.tasksRemaining.length}
                </Text>
              </Box>
            )}
          </Box>
        );

      case 'paused':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red} bold>Paused: {state.pauseReason}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      case 'completed':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.green} bold>All phases completed!</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red}>Error: {state.error}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>{'+-[ Super Ralph ]' + '-'.repeat(45) + '+'}</Text>

      <Box flexDirection="column" paddingLeft={1}>
        {renderContent()}
      </Box>

      <Box marginTop={1}>
        <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc Back</Text>
      </Box>
    </Box>
  );
};
