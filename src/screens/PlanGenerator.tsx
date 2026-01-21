import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useCopilot } from '../context/CopilotContext.js';
import { useKnowledgeBase } from '../context/KnowledgeBaseContext.js';
import { chatWithCopilot } from '../utils/copilot.js';
import { savePlan, hasExistingPlans } from '../utils/planGenerator.js';
import { Spinner } from '../components/Spinner.js';
import type { JiraTicket, KnowledgeBase, SearchResult, ClarifyingQuestion } from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type PlanWizardStep =
  | 'confirm-ticket'
  | 'select-kb'
  | 'initial-research'
  | 'clarifying-questions'
  | 'research-summary'
  | 'generating-impl'
  | 'review-impl'
  | 'generating-verify'
  | 'complete'
  | 'error';

interface PlanWizardState {
  step: PlanWizardStep;
  ticket: JiraTicket;
  selectedKB: KnowledgeBase | null;
  kbResults: SearchResult[];
  kbContext: string;
  questions: ClarifyingQuestion[];
  currentQuestionIndex: number;
  answers: Map<string, string>;
  selectedOptionIndex: number;
  isEnteringCustom: boolean;
  customInput: string;
  implPlan: string | null;
  verifyPlan: string | null;
  savedImplPath: string | null;
  savedVerifyPath: string | null;
  error?: string;
  canRegenerate: boolean;
}

interface PlanGeneratorProps {
  ticket: JiraTicket;
  onBack: () => void;
  onComplete?: () => void;
}

export const PlanGenerator: React.FC<PlanGeneratorProps> = ({ ticket, onBack, onComplete }) => {
  const { authState, getToken } = useCopilot();
  const { knowledgeBases, searchKB, formatSearchContext } = useKnowledgeBase();

  const [state, setState] = useState<PlanWizardState>({
    step: 'confirm-ticket',
    ticket,
    selectedKB: null,
    kbResults: [],
    kbContext: '',
    questions: [],
    currentQuestionIndex: 0,
    answers: new Map(),
    selectedOptionIndex: 0,
    isEnteringCustom: false,
    customInput: '',
    implPlan: null,
    verifyPlan: null,
    savedImplPath: null,
    savedVerifyPath: null,
    canRegenerate: false,
  });

  const [selectedKBIndex, setSelectedKBIndex] = useState(0);

  // Parse clarifying questions from AI response
  const parseQuestionsFromResponse = useCallback((response: string): ClarifyingQuestion[] => {
    const lines = response.split('\n').filter(line => line.trim().startsWith('QUESTION:'));
    return lines.map((line, index) => {
      const match = line.match(/QUESTION:\s*(.+?)\s*\|\s*OPTIONS:\s*(.+)/);
      if (match) {
        const [, question, optionsStr] = match;
        const options = optionsStr.split(',').map(o => o.trim());
        return {
          id: `q${index}`,
          question: question.trim(),
          options,
          allowOther: true,
        };
      }
      return null;
    }).filter((q): q is ClarifyingQuestion => q !== null);
  }, []);

  // Generate clarifying questions from ticket + KB context
  const generateClarifyingQuestions = useCallback(async (kbContext: string) => {
    const token = getToken();
    if (!token) {
      setState(prev => ({ ...prev, step: 'error', error: 'No Copilot token available' }));
      return;
    }

    const prompt = `Based on this ticket and context, generate 3-5 clarifying questions to better understand the implementation requirements.

## Ticket
- Key: ${state.ticket.key}
- Summary: ${state.ticket.summary}

## Knowledge Base Context
${kbContext || 'No relevant context found.'}

## Output Format
For each question, output in this exact format (one per line):
QUESTION: [question text] | OPTIONS: [option1], [option2], [option3], [Other]

Example:
QUESTION: What authentication method should be used? | OPTIONS: JWT tokens, Session cookies, OAuth 2.0, Other`;

    const result = await chatWithCopilot(token, [
      { role: 'system', content: 'You are a helpful assistant that generates clarifying questions for development tickets.' },
      { role: 'user', content: prompt },
    ], authState.selectedModel);

    if (result.success && result.content) {
      const questions = parseQuestionsFromResponse(result.content);
      setState(prev => ({
        ...prev,
        kbContext,
        questions,
        currentQuestionIndex: 0,
        step: questions.length > 0 ? 'clarifying-questions' : 'research-summary',
      }));
    } else {
      // Proceed without questions on error
      setState(prev => ({
        ...prev,
        kbContext,
        questions: [],
        step: 'research-summary',
      }));
    }
  }, [getToken, authState.selectedModel, state.ticket, parseQuestionsFromResponse]);

  // Perform initial KB research
  const performInitialResearch = useCallback(async () => {
    if (!state.selectedKB) {
      // Skip KB search, go directly to questions (they'll be generic)
      await generateClarifyingQuestions('');
      return;
    }

    setState(prev => ({ ...prev, step: 'initial-research' }));

    // Build search query from ticket
    const query = `${state.ticket.key} ${state.ticket.summary}`;

    try {
      const results = await searchKB(state.selectedKB.id, query, 5);
      const context = formatSearchContext(results);

      setState(prev => ({
        ...prev,
        kbResults: results,
        kbContext: context,
      }));

      // Now generate clarifying questions with this context
      await generateClarifyingQuestions(context);
    } catch (err) {
      // Proceed without KB context on error
      await generateClarifyingQuestions('');
    }
  }, [state.selectedKB, state.ticket, searchKB, formatSearchContext, generateClarifyingQuestions]);

  // Generate implementation plan
  const generateImplementationPlan = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState(prev => ({ ...prev, step: 'error', error: 'No Copilot token available' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'generating-impl' }));

    // Format answers
    const answersFormatted = Array.from(state.answers.entries())
      .map(([qId, answer]) => {
        const question = state.questions.find(q => q.id === qId);
        return question ? `- ${question.question}: ${answer}` : '';
      })
      .filter(Boolean)
      .join('\n');

    // Phase 2 KB search - more specific based on answers
    let refinedContext = state.kbContext;
    if (state.selectedKB && state.questions.length > 0) {
      const refinedQuery = `${state.ticket.summary} ${answersFormatted}`;
      try {
        const results = await searchKB(state.selectedKB.id, refinedQuery, 10);
        refinedContext = formatSearchContext(results);
      } catch {
        // Keep original context on error
      }
    }

    const systemPrompt = 'You are an expert software architect generating detailed implementation plans.';
    const userPrompt = `You are generating an implementation plan for a development ticket.

## Ticket
- Key: ${state.ticket.key}
- Summary: ${state.ticket.summary}

## Knowledge Base Context
${refinedContext || 'No relevant KB entries found.'}

## Clarifying Answers
${answersFormatted || 'No clarifying answers provided.'}

## Output Format
Generate a detailed implementation plan with:
1. **Summary** - 2-3 sentence overview
2. **Steps** - Numbered list with:
   - Clear action description
   - File paths to modify (if applicable)
   - Code hints or pseudocode (where helpful)
   - Effort estimate: [small/medium/large]
3. **Dependencies** - External libraries or services needed
4. **Risks** - Potential issues to watch for

Reference existing codebase patterns where applicable.`;

    const result = await chatWithCopilot(token, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], authState.selectedModel);

    if (result.success && result.content) {
      setState(prev => ({
        ...prev,
        implPlan: result.content || null,
        step: 'review-impl',
        canRegenerate: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to generate implementation plan',
      }));
    }
  }, [state, getToken, authState.selectedModel, searchKB, formatSearchContext]);

  // Generate verification plan
  const generateVerificationPlan = useCallback(async () => {
    const token = getToken();
    if (!token || !state.implPlan) {
      setState(prev => ({ ...prev, step: 'error', error: 'Missing requirements' }));
      return;
    }

    setState(prev => ({ ...prev, step: 'generating-verify' }));

    const systemPrompt = 'You are a QA expert generating comprehensive verification plans.';
    const userPrompt = `You are generating a verification plan for a development ticket.

## Ticket
- Key: ${state.ticket.key}
- Summary: ${state.ticket.summary}

## Implementation Plan
${state.implPlan}

## Output Format
Generate a verification plan with:
1. **Automated Tests**
   - Unit tests with descriptions
   - Integration tests if applicable
   - Test file locations
2. **Manual QA Steps**
   - Step-by-step verification checklist
   - Expected outcomes for each step
3. **Edge Cases**
   - Boundary conditions to test
   - Error scenarios to verify
4. **Regression Scope**
   - Related features to verify still work`;

    const result = await chatWithCopilot(token, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], authState.selectedModel);

    if (result.success && result.content) {
      // Save both plans
      const implResult = savePlan(state.implPlan!, {
        ticketKey: state.ticket.key,
        ticketSummary: state.ticket.summary,
        planType: 'impl',
        generatedAt: new Date().toISOString(),
        model: authState.selectedModel,
        kbUsed: state.selectedKB?.name,
      });

      const verifyResult = savePlan(result.content, {
        ticketKey: state.ticket.key,
        ticketSummary: state.ticket.summary,
        planType: 'verify',
        generatedAt: new Date().toISOString(),
        model: authState.selectedModel,
        kbUsed: state.selectedKB?.name,
      });

      setState(prev => ({
        ...prev,
        verifyPlan: result.content || null,
        savedImplPath: implResult.path || null,
        savedVerifyPath: verifyResult.path || null,
        step: 'complete',
      }));
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to generate verification plan',
      }));
    }
  }, [state, getToken, authState.selectedModel]);

  // Keyboard input handling
  useInput((input, key) => {
    // Custom input mode for "Other" option
    if (state.isEnteringCustom) {
      if (key.return) {
        if (state.customInput.trim()) {
          const currentQuestion = state.questions[state.currentQuestionIndex];
          const newAnswers = new Map(state.answers);
          newAnswers.set(currentQuestion.id, state.customInput.trim());

          // Move to next question or summary
          if (state.currentQuestionIndex < state.questions.length - 1) {
            setState(prev => ({
              ...prev,
              answers: newAnswers,
              currentQuestionIndex: prev.currentQuestionIndex + 1,
              selectedOptionIndex: 0,
              isEnteringCustom: false,
              customInput: '',
            }));
          } else {
            setState(prev => ({
              ...prev,
              answers: newAnswers,
              step: 'research-summary',
              isEnteringCustom: false,
              customInput: '',
            }));
          }
        }
      } else if (key.escape) {
        setState(prev => ({ ...prev, isEnteringCustom: false, customInput: '' }));
      } else if (key.backspace || key.delete) {
        setState(prev => ({ ...prev, customInput: prev.customInput.slice(0, -1) }));
      } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setState(prev => ({ ...prev, customInput: prev.customInput + input }));
      }
      return;
    }

    // Step-specific handling
    switch (state.step) {
      case 'confirm-ticket':
        if (key.return) {
          setState(prev => ({ ...prev, step: 'select-kb' }));
        } else if (key.escape) {
          onBack();
        }
        break;

      case 'select-kb':
        if (key.return) {
          const selected = knowledgeBases[selectedKBIndex];
          setState(prev => ({ ...prev, selectedKB: selected || null }));
          performInitialResearch();
        } else if (input === 's' || input === 'S') {
          setState(prev => ({ ...prev, selectedKB: null }));
          performInitialResearch();
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'confirm-ticket' }));
        } else if (key.upArrow || input === 'k') {
          setSelectedKBIndex(prev => prev > 0 ? prev - 1 : knowledgeBases.length - 1);
        } else if (key.downArrow || input === 'j') {
          setSelectedKBIndex(prev => prev < knowledgeBases.length - 1 ? prev + 1 : 0);
        } else {
          const num = parseInt(input);
          if (num >= 1 && num <= 9 && num <= knowledgeBases.length) {
            setSelectedKBIndex(num - 1);
          }
        }
        break;

      case 'clarifying-questions':
        if (input === 'e' || input === 'E') {
          // "Enough, just plan" - skip remaining questions
          setState(prev => ({ ...prev, step: 'research-summary' }));
        } else if (key.return) {
          const currentQuestion = state.questions[state.currentQuestionIndex];
          const selectedOption = currentQuestion.options[state.selectedOptionIndex];

          if (selectedOption === 'Other') {
            // Enter custom input mode
            setState(prev => ({ ...prev, isEnteringCustom: true, customInput: '' }));
          } else {
            const newAnswers = new Map(state.answers);
            newAnswers.set(currentQuestion.id, selectedOption);

            // Move to next question or summary
            if (state.currentQuestionIndex < state.questions.length - 1) {
              setState(prev => ({
                ...prev,
                answers: newAnswers,
                currentQuestionIndex: prev.currentQuestionIndex + 1,
                selectedOptionIndex: 0,
              }));
            } else {
              setState(prev => ({
                ...prev,
                answers: newAnswers,
                step: 'research-summary',
              }));
            }
          }
        } else if (input === 'o' || input === 'O') {
          // Quick "Other" shortcut
          setState(prev => ({ ...prev, isEnteringCustom: true, customInput: '' }));
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'select-kb' }));
        } else if (key.upArrow || input === 'k') {
          const currentQuestion = state.questions[state.currentQuestionIndex];
          setState(prev => ({
            ...prev,
            selectedOptionIndex: prev.selectedOptionIndex > 0
              ? prev.selectedOptionIndex - 1
              : currentQuestion.options.length - 1,
          }));
        } else if (key.downArrow || input === 'j') {
          const currentQuestion = state.questions[state.currentQuestionIndex];
          setState(prev => ({
            ...prev,
            selectedOptionIndex: prev.selectedOptionIndex < currentQuestion.options.length - 1
              ? prev.selectedOptionIndex + 1
              : 0,
          }));
        } else {
          const num = parseInt(input);
          const currentQuestion = state.questions[state.currentQuestionIndex];
          if (num >= 1 && num <= currentQuestion.options.length) {
            setState(prev => ({ ...prev, selectedOptionIndex: num - 1 }));
          }
        }
        break;

      case 'research-summary':
        if (key.return) {
          generateImplementationPlan();
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'clarifying-questions' }));
        }
        break;

      case 'review-impl':
        if (key.return) {
          generateVerificationPlan();
        } else if (input === 'r' || input === 'R') {
          setState(prev => ({ ...prev, canRegenerate: true }));
          generateImplementationPlan();
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'research-summary' }));
        }
        break;

      case 'complete':
        if (input === 'n' || input === 'N') {
          if (onComplete) {
            onComplete();
          } else {
            onBack();
          }
        } else if (input === 'q' || input === 'Q' || key.escape) {
          onBack();
        }
        break;

      case 'error':
        if (input === 'r' || input === 'R') {
          setState(prev => ({ ...prev, step: 'confirm-ticket', error: undefined }));
        } else if (input === 'b' || input === 'B' || key.escape) {
          onBack();
        }
        break;
    }
  });

  const renderConfirmTicket = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Confirm Ticket</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color={palette.dim}>Ticket: </Text>
          <Text color={palette.yellow} bold>{state.ticket.key}</Text>
        </Box>
        <Box>
          <Text color={palette.dim}>Summary: </Text>
          <Text>{state.ticket.summary}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={palette.dim}>Priority: </Text>
          <Text>{state.ticket.priority}</Text>
          <Text color={palette.dim}> | Status: </Text>
          <Text>{state.ticket.status}</Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          Enter Start plan generation  Esc Cancel
        </Text>
      </Box>
    </Box>
  );

  const renderSelectKB = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Select Knowledge Base (Optional)</Text>
      </Box>

      {knowledgeBases.length === 0 ? (
        <Box flexDirection="column" marginLeft={2}>
          <Text color={palette.dim}>No Knowledge Bases available</Text>
          <Box marginTop={1}>
            <Text>Proceeding without KB context...</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginLeft={2}>
          {knowledgeBases.map((kb, index) => {
            const isSelected = index === selectedKBIndex;
            return (
              <Box key={kb.id}>
                <Text color={isSelected ? palette.cyan : palette.dim}>{index + 1} </Text>
                <Text color={isSelected ? palette.cyan : undefined}>
                  {isSelected ? '> ' : '  '}
                </Text>
                <Text color={isSelected ? palette.green : undefined}>{kb.name}</Text>
                <Text color={palette.dim}> ({kb.totalPages} pages)</Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={2}>
        <Text color={palette.dim}>
          {knowledgeBases.length > 0 ? 'j/k Navigate  1-9 Quick select  Enter Select  ' : ''}S Skip  Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderInitialResearch = () => (
    <Box flexDirection="column">
      <Spinner label="Searching Knowledge Base for context..." />
    </Box>
  );

  const renderClarifyingQuestions = () => {
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) return null;

    if (state.isEnteringCustom) {
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={palette.cyan} bold>Custom Answer</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2}>
            <Box marginBottom={1}>
              <Text color={palette.dim}>Question: </Text>
              <Text>{currentQuestion.question}</Text>
            </Box>
            <Box>
              <Text color={palette.dim}>Your answer: </Text>
              <Text color={palette.green}>{state.customInput}</Text>
              <Text color={palette.dim}>|</Text>
            </Box>
          </Box>

          <Box marginTop={2}>
            <Text color={palette.dim}>
              Enter Confirm  Esc Cancel
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={palette.cyan} bold>Clarifying Questions ({state.currentQuestionIndex + 1}/{state.questions.length})</Text>
        </Box>

        <Box flexDirection="column" marginLeft={2}>
          <Box marginBottom={1}>
            <Text color={palette.yellow}>{currentQuestion.question}</Text>
          </Box>

          {currentQuestion.options.map((option, index) => {
            const isSelected = index === state.selectedOptionIndex;
            return (
              <Box key={index}>
                <Text color={isSelected ? palette.cyan : palette.dim}>{index + 1} </Text>
                <Text color={isSelected ? palette.cyan : undefined}>
                  {isSelected ? '> ' : '  '}
                </Text>
                <Text color={isSelected ? palette.green : undefined}>{option}</Text>
              </Box>
            );
          })}
        </Box>

        <Box marginTop={2}>
          <Text color={palette.dim}>
            j/k Navigate  1-{currentQuestion.options.length} Quick select  O Other  E Enough, just plan  Enter Confirm
          </Text>
        </Box>
      </Box>
    );
  };

  const renderResearchSummary = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Research Summary</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {state.selectedKB && (
          <Box>
            <Text color={palette.dim}>Knowledge Base: </Text>
            <Text color={palette.green}>{state.selectedKB.name}</Text>
          </Box>
        )}
        <Box>
          <Text color={palette.dim}>Questions answered: </Text>
          <Text color={palette.yellow}>{state.answers.size}</Text>
        </Box>
        {state.kbResults.length > 0 && (
          <Box marginTop={1}>
            <Text color={palette.dim}>Found {state.kbResults.length} relevant KB entries</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          Enter Generate implementation plan  Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderGeneratingImpl = () => (
    <Box flexDirection="column">
      <Spinner label="Generating implementation plan..." />
    </Box>
  );

  const renderReviewImpl = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Implementation Plan Generated</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color={palette.green}>Implementation plan ready!</Text>
        </Box>
        {state.implPlan && (
          <Box marginTop={1}>
            <Text color={palette.dim}>Preview: {state.implPlan.slice(0, 150)}...</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          Enter Generate verification plan  R Regenerate  Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderGeneratingVerify = () => (
    <Box flexDirection="column">
      <Spinner label="Generating verification plan and saving files..." />
    </Box>
  );

  const renderComplete = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.green} bold>Plans Generated Successfully</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color={palette.dim}>Ticket: </Text>
          <Text color={palette.yellow}>{state.ticket.key}</Text>
        </Box>
        {state.savedImplPath && (
          <Box marginTop={1}>
            <Text color={palette.dim}>Implementation plan: </Text>
            <Text color={palette.green}>{state.savedImplPath}</Text>
          </Box>
        )}
        {state.savedVerifyPath && (
          <Box>
            <Text color={palette.dim}>Verification plan: </Text>
            <Text color={palette.green}>{state.savedVerifyPath}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color={palette.cyan}>Next steps:</Text>
        <Text color={palette.dim}>  Review the generated plans in ./plans/</Text>
        <Text color={palette.dim}>  Start implementing with confidence!</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>
          N Generate another plan  Q/Esc Back to menu
        </Text>
      </Box>
    </Box>
  );

  const renderError = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.red} bold>Error</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Text color={palette.red}>{state.error}</Text>
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          R Retry  B/Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (state.step) {
      case 'confirm-ticket':
        return renderConfirmTicket();
      case 'select-kb':
        return renderSelectKB();
      case 'initial-research':
        return renderInitialResearch();
      case 'clarifying-questions':
        return renderClarifyingQuestions();
      case 'research-summary':
        return renderResearchSummary();
      case 'generating-impl':
        return renderGeneratingImpl();
      case 'review-impl':
        return renderReviewImpl();
      case 'generating-verify':
        return renderGeneratingVerify();
      case 'complete':
        return renderComplete();
      case 'error':
        return renderError();
      default:
        return null;
    }
  };

  // Step indicator
  const steps = [
    { key: 'confirm-ticket', label: 'Confirm' },
    { key: 'select-kb', label: 'KB' },
    { key: 'clarifying-questions', label: 'Questions' },
    { key: 'generating-impl', label: 'Impl Plan' },
    { key: 'generating-verify', label: 'Verify Plan' },
    { key: 'complete', label: 'Done' },
  ];

  const currentStepIndex = steps.findIndex(s =>
    s.key === state.step ||
    (s.key === 'select-kb' && state.step === 'initial-research') ||
    (s.key === 'clarifying-questions' && state.step === 'research-summary') ||
    (s.key === 'generating-impl' && state.step === 'review-impl') ||
    (s.key === 'generating-verify' && (state.step === 'generating-verify' || state.step === 'complete'))
  );

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Plan Generator: ' + state.ticket.key + ' ]' + '-'.repeat(Math.max(0, 41 - state.ticket.key.length)) + '+'}
      </Text>

      {/* Step indicator */}
      <Box marginLeft={2} marginY={1}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.key}>
            <Text color={idx < currentStepIndex ? palette.green : idx === currentStepIndex ? palette.cyan : palette.dim}>
              {idx < currentStepIndex ? '\u2713' : idx === currentStepIndex ? '\u25CF' : '\u25CB'}
            </Text>
            <Text color={idx === currentStepIndex ? palette.cyan : palette.dim}> {step.label} </Text>
            {idx < steps.length - 1 && <Text color={palette.dim}>{'>'} </Text>}
          </React.Fragment>
        ))}
      </Box>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>
    </Box>
  );
};
