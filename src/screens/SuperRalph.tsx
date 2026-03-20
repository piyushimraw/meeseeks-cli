import React, {useState, useCallback, useEffect, useRef} from 'react';
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
  appendLiveOutput,
  clearLiveOutput,
  type SuperRalphScreenState,
  type ActivityLogEntry,
} from '../hooks/useSuperRalphState.js';
import {getTemplateQuestions, buildScopeAssessmentPrompt, parseScopeAssessment, buildFollowUpPrompt, buildBrainstormOutput} from '../utils/superRalph/brainstorm.js';
import {gatherCodebaseStructure, gatherProjectDocs, buildContextPrompt} from '../utils/superRalph/contextGatherer.js';
import {createSession, getTasksDir, listSessions, loadSession} from '../utils/superRalph/session.js';
import {loadProgress} from '../utils/superRalph/executor.js';
import {buildPlanGenerationPrompt, parsePlan, generatePromptFile, savePlan} from '../utils/superRalph/planGenerator.js';
import {isClaudeInstalled, runClaude} from '../utils/claudeCli.js';
import {executePhase} from '../utils/superRalph/executor.js';
import {sendNotification} from '../utils/superRalph/notifications.js';
import {DEFAULT_SUPER_RALPH_CONFIG} from '../types/superRalph.js';
import type {SuperRalphPlan} from '../types/superRalph.js';
import {runGit} from '../utils/git.js';
import fs from 'node:fs';
import path from 'node:path';

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

function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

interface ResumableSession {
  id: string;
  task: string;
  status: string;
  phaseNum: number;
  totalPhases: number;
  updatedAt: string;
  hasProgress: boolean;
}

function findResumableSessions(): ResumableSession[] {
  const projectRoot = process.cwd();
  const sessions = listSessions(projectRoot);

  return sessions
    .filter(s => s.status !== 'completed')
    .map(s => {
      const phaseNum = s.currentPhase || 1;
      const tasksDir = getTasksDir(projectRoot, s.id);
      const planExists = fs.existsSync(path.join(tasksDir, `phase-${phaseNum}-plan.json`));
      const progress = planExists ? loadProgress(tasksDir, phaseNum) : null;

      return {
        id: s.id,
        task: s.task,
        status: s.status,
        phaseNum,
        totalPhases: s.phases.length,
        updatedAt: s.updatedAt,
        hasProgress: Boolean(progress),
      };
    })
    .filter(s => {
      // Only show sessions that have a plan to resume from
      const tasksDir = getTasksDir(process.cwd(), s.id);
      return fs.existsSync(path.join(tasksDir, `phase-${s.phaseNum}-plan.json`));
    });
}

export const SuperRalph: React.FC<SuperRalphProps> = ({onBack}) => {
  const [state, setState] = useState<SuperRalphScreenState>(createInitialState());
  const [inputValue, setInputValue] = useState('');
  const [resumableSessions] = useState<ResumableSession[]>(() => findResumableSessions());
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(-1);
  const executionStartedRef = useRef(false);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    // Navigate resumable sessions on idle screen
    if (state.step === 'idle' && resumableSessions.length > 0) {
      if (key.upArrow) {
        setSelectedSessionIndex(prev => prev > 0 ? prev - 1 : resumableSessions.length - 1);
      }
      if (key.downArrow) {
        setSelectedSessionIndex(prev => prev < resumableSessions.length - 1 ? prev + 1 : 0);
      }
      if (key.return && selectedSessionIndex >= 0) {
        handleResumeSession(resumableSessions[selectedSessionIndex]);
      }
    }
  });

  const handleResumeSession = useCallback((session: ResumableSession) => {
    const projectRoot = process.cwd();
    const tasksDir = getTasksDir(projectRoot, session.id);
    const phaseNum = session.phaseNum;

    // Load plan to get phase info
    const planPath = path.join(tasksDir, `phase-${phaseNum}-plan.json`);
    const plan: SuperRalphPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const progress = loadProgress(tasksDir, phaseNum);

    const completedCount = progress ? progress.tasksCompleted.length : 0;
    const totalCount = plan.tasks.length;

    setState(prev => {
      let s: SuperRalphScreenState = {
        ...prev,
        step: 'executing',
        sessionId: session.id,
        taskDescription: session.task,
        currentPhaseIndex: phaseNum - 1,
        confirmedPhases: [{title: plan.title, description: ''}],
        executionProgress: progress,
      };
      s = addLogEntry(s, 'phase', `Resuming session: "${session.task}"`);
      s = addLogEntry(s, 'info', `Phase ${phaseNum}: ${plan.title}`, `${completedCount}/${totalCount} tasks completed`);
      if (progress && progress.failures.length > 0) {
        s = addLogEntry(s, 'error', `${progress.failures.length} previous failure(s)`);
      }
      return s;
    });
  }, []);

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

  const transitionToPlanningWithLog = useCallback(() => {
    setState(prev => {
      let s = addLogEntry(prev, 'success', 'Brainstorming complete — generating plan...');
      s = transitionToPlanning(s);
      return s;
    });
  }, []);

  const handleAnswerSubmit = useCallback((value: string) => {
    if (value.toLowerCase() === 'skip') {
      setState(prev => {
        let s = skipQuestion(prev);
        s = addLogEntry(s, 'info', 'Question skipped');
        // Auto-advance if all questions answered
        if (s.currentQuestionIndex >= s.questions.length) {
          s = addLogEntry(s, 'success', 'All questions answered — generating plan...');
          s = transitionToPlanning(s);
        }
        return s;
      });
    } else if (value.toLowerCase() === 'done') {
      transitionToPlanningWithLog();
    } else {
      setState(prev => {
        let s = addQuestionAnswer(prev, value);
        s = addLogEntry(s, 'success', 'Answer recorded', value.slice(0, 80) + (value.length > 80 ? '...' : ''));
        // Auto-advance if all questions answered
        if (s.currentQuestionIndex >= s.questions.length) {
          s = addLogEntry(s, 'success', 'All questions answered — generating plan...');
          s = transitionToPlanning(s);
        }
        return s;
      });
    }
    setInputValue('');
  }, [transitionToPlanningWithLog]);

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

  // Run ralph loop when step transitions to 'executing'
  useEffect(() => {
    if (state.step !== 'executing') return;
    if (executionStartedRef.current) return;
    executionStartedRef.current = true;

    let cancelled = false;
    const projectRoot = process.cwd();

    const runExecution = async () => {
      if (!state.sessionId) {
        setState(prev => setError(addLogEntry(prev, 'error', 'No session ID'), 'No session to execute'));
        return;
      }

      const phaseIndex = state.currentPhaseIndex;
      const phaseNum = phaseIndex + 1;
      const tasksDir = getTasksDir(projectRoot, state.sessionId);

      // Load the plan and prompt from disk
      const planPath = path.join(tasksDir, `phase-${phaseNum}-plan.json`);
      const promptPath = path.join(tasksDir, `phase-${phaseNum}-prompt.md`);

      if (!fs.existsSync(planPath) || !fs.existsSync(promptPath)) {
        setState(prev => setError(
          addLogEntry(prev, 'error', 'Plan files not found', `Expected: ${planPath}`),
          'Plan files missing — cannot execute',
        ));
        return;
      }

      const plan: SuperRalphPlan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
      const phasePrompt = fs.readFileSync(promptPath, 'utf-8');

      setState(prev => addLogEntry(prev, 'phase', `Starting ralph loop for Phase ${phaseNum}`, `${plan.tasks.length} tasks, max ${DEFAULT_SUPER_RALPH_CONFIG.maxIterationsPerPhase} iterations`));

      const finalProgress = await executePhase(
        tasksDir,
        phaseNum,
        phasePrompt,
        plan,
        DEFAULT_SUPER_RALPH_CONFIG.maxIterationsPerPhase,
        DEFAULT_SUPER_RALPH_CONFIG.maxConsecutiveFailures,
        projectRoot,
        {
          onIterationStart: (iteration, promptPreview) => {
            if (cancelled) return;
            setState(prev => {
              let s = clearLiveOutput(prev);
              s = addLogEntry(s, 'llm', `Iteration ${iteration} started`, promptPreview);
              return {
                ...s,
                executionProgress: {
                  ...(s.executionProgress || {phase: phaseNum, iteration: 0, maxIterations: DEFAULT_SUPER_RALPH_CONFIG.maxIterationsPerPhase, tasksCompleted: [], tasksRemaining: plan.tasks.map(t => t.id), currentTask: null, failures: [], filesChanged: []}),
                  iteration,
                },
              };
            });
          },
          onOutputChunk: (chunk) => {
            if (cancelled) return;
            setState(prev => appendLiveOutput(prev, chunk));
          },
          onIterationComplete: (iteration, output) => {
            if (cancelled) return;
            // Extract meaningful summary from output
            const lines = output.split('\n').filter(l => l.trim());
            const lastLines = lines.slice(-3).join(' | ').slice(0, 200);
            setState(prev => {
              let s = addLogEntry(prev, 'success', `Iteration ${iteration} complete (${output.length} chars)`, lastLines);
              s = clearLiveOutput(s);
              return s;
            });
          },
          onTaskComplete: (taskId) => {
            if (cancelled) return;
            setState(prev => addLogEntry(prev, 'success', `Task ${taskId} completed`));
          },
          onFailure: (failure) => {
            if (cancelled) return;
            setState(prev => {
              let s = addLogEntry(prev, 'error', `Task ${failure.taskId} failed (iter ${failure.iteration})`, failure.error.slice(0, 200));
              s = clearLiveOutput(s);
              return s;
            });
          },
          onPause: (reason) => {
            if (cancelled) return;
            sendNotification('failure', {taskId: 'loop', error: reason});
            setState(prev => {
              let s = addLogEntry(prev, 'error', `Loop paused: ${reason}`);
              return transitionToPaused(s, reason);
            });
          },
          onPhaseComplete: () => {
            if (cancelled) return;
            sendNotification('phase-complete', {phase: phaseNum, title: plan.title});
            setState(prev => {
              let s = addLogEntry(prev, 'success', `Phase ${phaseNum} complete!`, `All ${plan.tasks.length} tasks done`);
              // Check if more phases remain
              const nextPhaseIndex = phaseIndex + 1;
              if (nextPhaseIndex < prev.confirmedPhases.length) {
                s = addLogEntry(s, 'phase', `Moving to Phase ${nextPhaseIndex + 1}: ${prev.confirmedPhases[nextPhaseIndex].title}`);
                // TODO: trigger next phase brainstorming
              } else {
                sendNotification('session-complete', {task: prev.taskDescription});
                s = transitionToCompleted(s);
                s = addLogEntry(s, 'success', 'All phases complete!');
              }
              return s;
            });
          },
        },
      );

      // Update final progress in state
      if (!cancelled) {
        setState(prev => ({
          ...prev,
          executionProgress: finalProgress,
        }));
      }
    };

    runExecution();
    return () => { cancelled = true; };
  }, [state.step]);

  const renderContent = () => {
    switch (state.step) {
      case 'idle':
        return (
          <Box flexDirection="column" marginTop={1}>
            {resumableSessions.length > 0 && (
              <Box flexDirection="column" marginBottom={1}>
                <Text color={palette.yellow} bold>Resume a session:</Text>
                <Box flexDirection="column" marginLeft={1} marginTop={1}>
                  {resumableSessions.map((s, i) => {
                    const isSelected = i === selectedSessionIndex;
                    const age = getRelativeTime(s.updatedAt);
                    return (
                      <Box key={s.id}>
                        <Text color={isSelected ? palette.cyan : palette.dim}>
                          {isSelected ? '> ' : '  '}
                          {s.task.slice(0, 50)}{s.task.length > 50 ? '...' : ''}
                        </Text>
                        <Text color={palette.dim}> ({age}, phase {s.phaseNum}, {s.status})</Text>
                      </Box>
                    );
                  })}
                </Box>
                <Box marginTop={1} marginLeft={1}>
                  <Text color={palette.dim}>Up/Down to select, Enter to resume</Text>
                </Box>
                <Box marginTop={1}>
                  <Text color={palette.orange}>{'— or —'}</Text>
                </Box>
              </Box>
            )}
            <Text color={palette.yellow}>New task:</Text>
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

      case 'executing': {
        const progress = state.executionProgress;
        const totalTasks = progress
          ? progress.tasksCompleted.length + progress.tasksRemaining.length
          : 0;
        const completedTasks = progress ? progress.tasksCompleted.length : 0;
        const progressBar = totalTasks > 0
          ? '█'.repeat(Math.round((completedTasks / totalTasks) * 20)) + '░'.repeat(20 - Math.round((completedTasks / totalTasks) * 20))
          : '';

        return (
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color={palette.cyan}>
                <Spinner type="dots" />
              </Text>
              <Text color={palette.yellow} bold> Executing Ralph Loop</Text>
            </Box>
            {progress && (
              <Box flexDirection="column" marginTop={1} marginLeft={2}>
                <Text>Phase: {progress.phase}  |  Iteration: {progress.iteration}/{progress.maxIterations}</Text>
                <Text>Tasks: {completedTasks}/{totalTasks}  {progressBar}</Text>
                {progress.failures.length > 0 && (
                  <Text color={palette.red}>Failures: {progress.failures.length}</Text>
                )}
              </Box>
            )}

            {state.liveOutput.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={palette.cyan} bold>Claude Output:</Text>
                <Box flexDirection="column" marginLeft={1} borderStyle="single" borderColor={palette.dim} paddingX={1}>
                  {state.liveOutput.map((line, i) => (
                    <Text key={i} color={palette.dim} wrap="truncate">{line.slice(0, 100)}</Text>
                  ))}
                </Box>
              </Box>
            )}

            <ActivityLog entries={state.activityLog} />
          </Box>
        );
      }

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
