import React, {useState, useCallback, useEffect} from 'react';
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
  setError,
  addLlmQuestion,
  addLogEntry,
  type SuperRalphScreenState,
  type ActivityLogEntry,
} from '../hooks/useSuperRalphState.js';
import {getTemplateQuestions, buildScopeAssessmentPrompt, parseScopeAssessment, buildFollowUpPrompt, buildBrainstormOutput} from '../utils/superRalph/brainstorm.js';
import {gatherCodebaseStructure, gatherProjectDocs, buildContextPrompt} from '../utils/superRalph/contextGatherer.js';
import {createSession, getTasksDir} from '../utils/superRalph/session.js';
import {buildPlanGenerationPrompt, parsePlan, generatePromptFile, savePlan} from '../utils/superRalph/planGenerator.js';
import {isClaudeInstalled, runClaude} from '../utils/claudeCli.js';
import {runGit} from '../utils/git.js';
import fs from 'node:fs';

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

const LogIcon: Record<ActivityLogEntry['type'], string> = {
  info: '›',
  context: '◉',
  llm: '⚡',
  success: '✓',
  error: '✗',
  phase: '▸',
};

const LogColor: Record<ActivityLogEntry['type'], string> = {
  info: palette.dim,
  context: palette.cyan,
  llm: palette.yellow,
  success: palette.green,
  error: palette.red,
  phase: palette.orange,
};

const ActivityLog: React.FC<{entries: ActivityLogEntry[]}> = ({entries}) => {
  if (entries.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.yellow} bold>Activity Log</Text>
      <Box flexDirection="column" marginLeft={1}>
        {entries.slice(0, 10).map((entry) => (
          <Box key={entry.id} flexDirection="column">
            <Box>
              <Text color={palette.dim}>[{entry.timestamp}] </Text>
              <Text color={LogColor[entry.type]}>{LogIcon[entry.type]} {entry.message}</Text>
            </Box>
            {entry.detail && (
              <Box marginLeft={2}>
                <Text color={palette.dim}>{entry.detail}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const SuperRalph: React.FC<SuperRalphProps> = ({onBack}) => {
  const [state, setState] = useState<SuperRalphScreenState>(createInitialState());
  const [inputValue, setInputValue] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
  });

  // Run scoping pipeline when step transitions to 'scoping'
  useEffect(() => {
    if (state.step !== 'scoping') return;

    let cancelled = false;
    const projectRoot = process.cwd();

    const runScoping = async () => {
      // Step 1: Check Claude is installed
      setState(prev => addLogEntry(prev, 'info', 'Checking Claude Code installation...'));

      if (!isClaudeInstalled()) {
        setState(prev => setError(
          addLogEntry(prev, 'error', 'Claude Code not found', 'Install with: npm install -g @anthropic-ai/claude-code'),
          'Claude Code CLI is not installed. Run: npm install -g @anthropic-ai/claude-code',
        ));
        return;
      }
      if (cancelled) return;
      setState(prev => addLogEntry(prev, 'success', 'Claude Code found'));

      // Step 2: Create session
      setState(prev => addLogEntry(prev, 'info', 'Creating session...'));
      const session = createSession(projectRoot, state.taskDescription);
      if (cancelled) return;
      setState(prev => ({
        ...addLogEntry(prev, 'success', 'Session created', `ID: ${session.id}`),
        sessionId: session.id,
      }));

      // Step 3: Gather codebase structure (depth 2 to keep it concise)
      setState(prev => addLogEntry(prev, 'context', 'Scanning codebase structure...'));
      const codebaseStructure = gatherCodebaseStructure(projectRoot, 2);
      if (cancelled) return;
      const fileCount = codebaseStructure.split('\n').length;
      setState(prev => addLogEntry(prev, 'success', `Codebase scanned`, `${fileCount} entries found`));

      // Step 4: Gather project docs
      setState(prev => addLogEntry(prev, 'context', 'Reading project documentation...', 'Looking for README.md, CLAUDE.md, AGENTS.md'));
      const projectDocs = gatherProjectDocs(projectRoot);
      if (cancelled) return;
      const docsFound = projectDocs ? 'Found project docs' : 'No project docs found';
      setState(prev => addLogEntry(prev, 'success', docsFound));

      // Step 5: Gather git history
      setState(prev => addLogEntry(prev, 'context', 'Reading git history...'));
      const gitResult = runGit(['log', '--oneline', '-10']);
      const gitHistory = gitResult.success ? gitResult.stdout : '';
      if (cancelled) return;
      setState(prev => addLogEntry(prev, 'success', 'Git history gathered', `${gitHistory.split('\n').filter(Boolean).length} recent commits`));

      // Step 6: Build context prompt
      const contextPrompt = buildContextPrompt({codebaseStructure, gitHistory, projectDocs});
      setState(prev => addLogEntry(prev, 'info', 'Context assembled', `${contextPrompt.length} chars of context`));

      // Step 7: Call Claude for scope assessment
      setState(prev => ({
        ...addLogEntry(prev, 'llm', 'Calling Claude Code for scope assessment...', 'Determining if task needs multiple phases'),
        loadingMessage: 'Claude is analyzing task scope...',
      }));

      const scopePrompt = buildScopeAssessmentPrompt(state.taskDescription, contextPrompt);
      const result = await runClaude({prompt: scopePrompt, cwd: projectRoot});
      if (cancelled) return;

      if (!result.success) {
        setState(prev => setError(
          addLogEntry(prev, 'error', 'Claude scope assessment failed', result.error),
          `Scope assessment failed: ${result.error}`,
        ));
        return;
      }

      // Step 8: Parse scope assessment
      setState(prev => addLogEntry(prev, 'info', 'Parsing Claude response...', `${result.output.length} chars received`));
      try {
        const assessment = parseScopeAssessment(result.output);
        setState(prev => {
          let s = addLogEntry(prev, 'success', 'Scope assessment complete');
          if (assessment.isMultiPhase) {
            s = addLogEntry(s, 'phase', `Multi-phase: ${assessment.proposedPhases.length} phases proposed`, assessment.reasoning);
            for (const phase of assessment.proposedPhases) {
              s = addLogEntry(s, 'info', `  Phase: ${phase.title}`, phase.description);
            }
          } else {
            s = addLogEntry(s, 'info', 'Single phase task', assessment.reasoning);
          }

          const templateQuestions = getTemplateQuestions();
          s = addLogEntry(s, 'info', 'Starting brainstorming...', `${templateQuestions.length} template questions ready`);

          return {
            ...s,
            step: 'scope-confirm',
            scopeAssessment: assessment,
            confirmedPhases: assessment.proposedPhases,
            isLoading: false,
            loadingMessage: '',
          };
        });
      } catch (err) {
        setState(prev => {
          let s = addLogEntry(prev, 'error', 'Failed to parse scope assessment', String(err));
          s = addLogEntry(s, 'info', 'Raw response (first 200 chars):', result.output.slice(0, 200));
          return setError(s, `Could not parse scope assessment from Claude response`);
        });
      }
    };

    runScoping();
    return () => { cancelled = true; };
  }, [state.step === 'scoping']);

  const handleTaskSubmit = useCallback((value: string) => {
    if (!value.trim()) return;
    setState(prev => {
      let s = transitionToScoping(prev, value.trim());
      s = addLogEntry(s, 'phase', `Task: "${value.trim()}"`);
      return s;
    });
    setInputValue('');
  }, []);

  const handleScopeConfirm = useCallback(() => {
    setState(prev => {
      const templateQuestions = getTemplateQuestions();
      let s: SuperRalphScreenState = {
        ...prev,
        step: 'brainstorming',
        questions: templateQuestions,
        currentQuestionIndex: 0,
      };
      s = addLogEntry(s, 'success', 'Phase breakdown confirmed');
      s = addLogEntry(s, 'phase', `Brainstorming Phase ${s.currentPhaseIndex + 1}: ${s.confirmedPhases[s.currentPhaseIndex]?.title || 'Main'}`);
      return s;
    });
  }, []);

  const handleAnswerSubmit = useCallback((value: string) => {
    if (value.toLowerCase() === 'skip') {
      setState(prev => {
        let s = skipQuestion(prev);
        s = addLogEntry(s, 'info', 'Question skipped');
        return s;
      });
    } else if (value.toLowerCase() === 'done') {
      setState(prev => {
        let s = addLogEntry(prev, 'success', 'Brainstorming complete — generating plan...');
        s = transitionToPlanning(s);
        return s;
      });
    } else {
      setState(prev => {
        let s = addQuestionAnswer(prev, value);
        s = addLogEntry(s, 'success', 'Answer recorded', value.slice(0, 80) + (value.length > 80 ? '...' : ''));
        return s;
      });
    }
    setInputValue('');
  }, []);

  // Run plan generation when step transitions to 'planning'
  useEffect(() => {
    if (state.step !== 'planning') return;

    let cancelled = false;
    const projectRoot = process.cwd();

    const runPlanning = async () => {
      const phaseIndex = state.currentPhaseIndex;
      const phaseTitle = state.confirmedPhases[phaseIndex]?.title || 'Main';

      setState(prev => addLogEntry(prev, 'context', 'Building brainstorm output...'));

      const brainstormOutput = buildBrainstormOutput(
        phaseIndex + 1,
        phaseTitle,
        state.questions,
        [],
      );
      if (cancelled) return;

      // Save brainstorm output
      if (state.sessionId) {
        const tasksDir = getTasksDir(projectRoot, state.sessionId);
        fs.mkdirSync(tasksDir, {recursive: true});
        fs.writeFileSync(
          `${tasksDir}/phase-${phaseIndex + 1}-brainstorm.json`,
          JSON.stringify(brainstormOutput, null, 2),
        );
        setState(prev => addLogEntry(prev, 'success', 'Brainstorm output saved'));
      }

      // Gather context for plan generation
      setState(prev => addLogEntry(prev, 'context', 'Gathering context for plan generation...'));
      const codebaseStructure = gatherCodebaseStructure(projectRoot);
      const projectDocs = gatherProjectDocs(projectRoot);
      const contextPrompt = buildContextPrompt({codebaseStructure, gitHistory: '', projectDocs});
      if (cancelled) return;

      // Call Claude for plan generation
      setState(prev => ({
        ...addLogEntry(prev, 'llm', 'Calling Claude Code to generate plan...', `Phase ${phaseIndex + 1}: ${phaseTitle}`),
        loadingMessage: 'Claude is creating the implementation plan...',
      }));

      const planPrompt = buildPlanGenerationPrompt(brainstormOutput, contextPrompt);
      const result = await runClaude({prompt: planPrompt, cwd: projectRoot});
      if (cancelled) return;

      if (!result.success) {
        setState(prev => setError(
          addLogEntry(prev, 'error', 'Plan generation failed', result.error),
          `Plan generation failed: ${result.error}`,
        ));
        return;
      }

      try {
        const plan = parsePlan(result.output);
        const promptFile = generatePromptFile(plan, brainstormOutput);

        if (state.sessionId) {
          const tasksDir = getTasksDir(projectRoot, state.sessionId);
          savePlan(tasksDir, phaseIndex + 1, plan, promptFile);
        }

        setState(prev => {
          let s = addLogEntry(prev, 'success', 'Implementation plan generated', `${plan.tasks.length} tasks, risk: ${plan.riskLevel}`);
          for (const task of plan.tasks) {
            s = addLogEntry(s, 'info', `  Task: ${task.id} — ${task.title}`);
          }
          s = addLogEntry(s, 'phase', 'Ready to execute ralph loop');
          return {
            ...s,
            step: 'executing',
            isLoading: false,
            loadingMessage: '',
          };
        });
      } catch (err) {
        setState(prev => setError(
          addLogEntry(prev, 'error', 'Failed to parse plan', String(err)),
          'Could not parse implementation plan from Claude response',
        ));
      }
    };

    runPlanning();
    return () => { cancelled = true; };
  }, [state.step === 'planning']);

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
            <ActivityLog entries={state.activityLog} />
          </Box>
        );

      case 'scope-confirm': {
        const assessment = state.scopeAssessment;
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow} bold>Scope Assessment</Text>
            {assessment && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={palette.dim}>
                  {assessment.isMultiPhase ? 'Multi-phase' : 'Single phase'}: {assessment.reasoning}
                </Text>
                <Box flexDirection="column" marginTop={1}>
                  <Text color={palette.yellow}>Proposed phases:</Text>
                  {assessment.proposedPhases.map((phase, i) => (
                    <Box key={i} marginLeft={1}>
                      <Text color={palette.cyan}>{i + 1}. {phase.title}</Text>
                      <Text color={palette.dim}> — {phase.description}</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={palette.green}>Press Enter to confirm, Esc to go back</Text>
            </Box>
            <Box marginTop={1}>
              <Text color={palette.cyan}>&gt; </Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleScopeConfirm}
                placeholder="Press Enter to confirm phase breakdown"
              />
            </Box>
            <ActivityLog entries={state.activityLog} />
          </Box>
        );
      }

      case 'brainstorming': {
        if (state.currentQuestionIndex >= state.questions.length) {
          return (
            <Box flexDirection="column" marginTop={1}>
              <Text color={palette.green}>Brainstorming complete for this phase.</Text>
              <ActivityLog entries={state.activityLog} />
            </Box>
          );
        }

        const currentQuestion = state.questions[state.currentQuestionIndex];
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow}>
              Phase {state.currentPhaseIndex + 1} — Question {state.currentQuestionIndex + 1}/{state.questions.length}+
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
            <ActivityLog entries={state.activityLog} />
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
            <ActivityLog entries={state.activityLog} />
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
            <ActivityLog entries={state.activityLog} />
          </Box>
        );

      case 'paused':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red} bold>Paused: {state.pauseReason}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
            <ActivityLog entries={state.activityLog} />
          </Box>
        );

      case 'completed':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.green} bold>All phases completed!</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
            <ActivityLog entries={state.activityLog} />
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.red}>Error: {state.error}</Text>
            <Text color={palette.dim}>Press Esc to go back.</Text>
            <ActivityLog entries={state.activityLog} />
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
