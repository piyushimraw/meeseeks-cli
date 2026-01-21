import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useJira, JiraTransition } from '../context/JiraContext.js';
import { Spinner } from '../components/Spinner.js';
import { generateBranchName, isValidBranchName } from '../utils/branchName.js';
import {
  hasUncommittedChanges,
  stashPush,
  branchExists,
  createBranch,
  checkoutBranch,
  getLocalBranches,
  getDefaultBranch,
} from '../utils/git.js';
import type { JiraTicket } from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type WizardStep =
  | 'confirm-transition'
  | 'transitioning'
  | 'edit-branch-name'
  | 'select-base-branch'
  | 'handle-changes'
  | 'creating'
  | 'complete'
  | 'error';

interface WizardState {
  step: WizardStep;
  ticket: JiraTicket;
  branchName: string;
  baseBranch: string;
  error?: string;
  transitionSkipped: boolean;
  stashed: boolean;
  branches: string[];
  selectedBranchIndex: number;
  branchExistsPrompt: boolean;
}

interface WorkflowWizardProps {
  ticket: JiraTicket;
  onBack: () => void;
  onComplete: (action?: 'plan') => void;
}

export const WorkflowWizard: React.FC<WorkflowWizardProps> = ({ ticket, onBack, onComplete }) => {
  const { findTransitionToStatus, transitionTicket } = useJira();

  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<WizardState>({
    step: 'confirm-transition',
    ticket,
    branchName: generateBranchName(ticket.key, ticket.summary),
    baseBranch: 'main',
    transitionSkipped: false,
    stashed: false,
    branches: [],
    selectedBranchIndex: 0,
    branchExistsPrompt: false,
  });

  // Initialize branches asynchronously to avoid blocking the UI
  useEffect(() => {
    // Use setTimeout to defer the blocking git operations
    const timer = setTimeout(() => {
      const branches = getLocalBranches();
      const defaultBranch = getDefaultBranch();
      const defaultIndex = branches.indexOf(defaultBranch);

      setState(prev => ({
        ...prev,
        branches,
        baseBranch: defaultBranch,
        selectedBranchIndex: defaultIndex >= 0 ? defaultIndex : 0,
      }));
      setIsInitializing(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Check if already In Progress
  const isAlreadyInProgress = ticket.status.toLowerCase() === 'in progress';

  // Auto-advance if already in progress
  useEffect(() => {
    if (state.step === 'confirm-transition' && isAlreadyInProgress) {
      setState(prev => ({ ...prev, step: 'edit-branch-name', transitionSkipped: true }));
    }
  }, [state.step, isAlreadyInProgress]);

  // Handle transition execution
  const executeTransition = useCallback(async () => {
    setState(prev => ({ ...prev, step: 'transitioning' }));

    const transition = await findTransitionToStatus(ticket.key, 'In Progress');

    if (!transition) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: 'No path to "In Progress" status. Your workflow may not allow this transition.',
      }));
      return;
    }

    if (transition.hasScreen) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: 'Transition requires additional input in JIRA. Please complete it in the JIRA web UI.',
      }));
      return;
    }

    // Try transition, with one retry on 409
    let result = await transitionTicket(ticket.key, transition.id);
    if (!result.success && result.error?.includes('409')) {
      // Retry once
      result = await transitionTicket(ticket.key, transition.id);
    }

    if (result.success) {
      setState(prev => ({ ...prev, step: 'edit-branch-name' }));
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to transition ticket',
      }));
    }
  }, [findTransitionToStatus, transitionTicket, ticket.key]);

  // Handle branch creation
  const handleCreateBranch = useCallback(() => {
    setState(prev => ({ ...prev, step: 'creating' }));

    // Check if branch already exists
    if (branchExists(state.branchName)) {
      setState(prev => ({ ...prev, branchExistsPrompt: true }));
      return;
    }

    // Create branch
    const result = createBranch(state.branchName, state.baseBranch);
    if (result.success) {
      setState(prev => ({ ...prev, step: 'complete' }));
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to create branch',
      }));
    }
  }, [state.branchName, state.baseBranch]);

  // Handle checkout existing branch
  const handleCheckoutExisting = useCallback(() => {
    const result = checkoutBranch(state.branchName);
    if (result.success) {
      setState(prev => ({ ...prev, step: 'complete', branchExistsPrompt: false }));
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to checkout branch',
        branchExistsPrompt: false,
      }));
    }
  }, [state.branchName]);

  // Handle stash
  const handleStash = useCallback(() => {
    const result = stashPush(`meeseeks: ${ticket.key} workflow stash`);
    if (result.success) {
      setState(prev => ({ ...prev, stashed: true }));
      handleCreateBranch();
    } else {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: result.error || 'Failed to stash changes',
      }));
    }
  }, [ticket.key, handleCreateBranch]);

  // Keyboard input handling
  useInput((input, key) => {
    // Branch exists prompt takes priority
    if (state.branchExistsPrompt) {
      if (input === 'y' || input === 'Y') {
        handleCheckoutExisting();
      } else if (input === 'n' || input === 'N') {
        setState(prev => ({ ...prev, step: 'edit-branch-name', branchExistsPrompt: false }));
      }
      return;
    }

    // Step-specific handling
    switch (state.step) {
      case 'confirm-transition':
        if (key.return) {
          executeTransition();
        } else if (input === 's' || input === 'S') {
          setState(prev => ({ ...prev, step: 'edit-branch-name', transitionSkipped: true }));
        } else if (key.escape) {
          onBack();
        }
        break;

      case 'edit-branch-name':
        if (key.return) {
          if (isValidBranchName(state.branchName)) {
            setState(prev => ({ ...prev, step: 'select-base-branch' }));
          }
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'confirm-transition' }));
        } else if (key.backspace || key.delete) {
          setState(prev => ({
            ...prev,
            branchName: prev.branchName.slice(0, -1),
          }));
        } else if (input && input.length === 1 && !key.ctrl && !key.meta) {
          setState(prev => ({
            ...prev,
            branchName: prev.branchName + input,
          }));
        }
        break;

      case 'select-base-branch':
        if (key.return) {
          const selectedBranch = state.branches[state.selectedBranchIndex];
          if (selectedBranch) {
            setState(prev => ({ ...prev, baseBranch: selectedBranch }));
            // Check for uncommitted changes
            if (hasUncommittedChanges()) {
              setState(prev => ({ ...prev, step: 'handle-changes' }));
            } else {
              handleCreateBranch();
            }
          }
        } else if (key.escape) {
          setState(prev => ({ ...prev, step: 'edit-branch-name' }));
        } else if (key.upArrow || input === 'k') {
          setState(prev => ({
            ...prev,
            selectedBranchIndex: prev.selectedBranchIndex > 0
              ? prev.selectedBranchIndex - 1
              : prev.branches.length - 1,
          }));
        } else if (key.downArrow || input === 'j') {
          setState(prev => ({
            ...prev,
            selectedBranchIndex: prev.selectedBranchIndex < prev.branches.length - 1
              ? prev.selectedBranchIndex + 1
              : 0,
          }));
        } else {
          // Number shortcuts 1-9
          const num = parseInt(input);
          if (num >= 1 && num <= 9 && num <= state.branches.length) {
            setState(prev => ({ ...prev, selectedBranchIndex: num - 1 }));
          }
        }
        break;

      case 'handle-changes':
        if (input === 's' || input === 'S') {
          handleStash();
        } else if (input === 'c' || input === 'C' || key.escape) {
          onBack();
        }
        break;

      case 'complete':
        if (input === 'p' || input === 'P') {
          onComplete('plan');
        } else if (input === 'q' || input === 'Q' || key.escape) {
          onBack();
        }
        break;

      case 'error':
        if (input === 'r' || input === 'R') {
          // Retry - go back to transition step
          setState(prev => ({ ...prev, step: 'confirm-transition', error: undefined }));
        } else if (input === 'c' || input === 'C') {
          // Continue anyway
          setState(prev => ({ ...prev, step: 'edit-branch-name', error: undefined, transitionSkipped: true }));
        } else if (input === 'b' || input === 'B' || key.escape) {
          onBack();
        }
        break;
    }
  });

  const renderConfirmTransition = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Confirm Ticket Transition</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color={palette.dim}>Ticket: </Text>
          <Text color={palette.yellow} bold>{ticket.key}</Text>
        </Box>
        <Box>
          <Text color={palette.dim}>Summary: </Text>
          <Text>{ticket.summary.length > 50 ? ticket.summary.slice(0, 47) + '...' : ticket.summary}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={palette.dim}>Current: </Text>
          <Text color={palette.orange}>{ticket.status}</Text>
          <Text color={palette.dim}> -&gt; Target: </Text>
          <Text color={palette.green}>In Progress</Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          Enter Transition  S Skip transition  Esc Cancel
        </Text>
      </Box>
    </Box>
  );

  const renderTransitioning = () => (
    <Box flexDirection="column">
      <Spinner label="Transitioning ticket to In Progress..." />
    </Box>
  );

  const renderEditBranchName = () => {
    const isValid = isValidBranchName(state.branchName);

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={palette.cyan} bold>Edit Branch Name</Text>
        </Box>

        <Box flexDirection="column" marginLeft={2}>
          <Box>
            <Text color={palette.dim}>Branch: </Text>
            <Text color={isValid ? palette.green : palette.red}>{state.branchName}</Text>
            <Text color={palette.dim}>|</Text>
          </Box>
          {!isValid && (
            <Box marginTop={1}>
              <Text color={palette.red}>Invalid branch name</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color={palette.dim}>({state.branchName.length}/50 characters)</Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text color={palette.dim}>
            Enter Confirm  Esc Back
          </Text>
        </Box>
      </Box>
    );
  };

  const renderSelectBaseBranch = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.cyan} bold>Select Base Branch</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2} marginBottom={1}>
        <Text color={palette.dim}>New branch: </Text>
        <Text color={palette.yellow}>{state.branchName}</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        {state.branches.slice(0, 9).map((branch, index) => {
          const isSelected = index === state.selectedBranchIndex;
          const isDefault = branch === getDefaultBranch();
          return (
            <Box key={branch}>
              <Text color={isSelected ? palette.cyan : palette.dim}>{index + 1} </Text>
              <Text color={isSelected ? palette.cyan : undefined}>
                {isSelected ? '> ' : '  '}
              </Text>
              <Text color={isSelected ? palette.green : undefined}>{branch}</Text>
              {isDefault && <Text color={palette.dim}> (default)</Text>}
            </Box>
          );
        })}
        {state.branches.length > 9 && (
          <Text color={palette.dim}>... and {state.branches.length - 9} more branches</Text>
        )}
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          j/k Navigate  1-9 Quick select  Enter Confirm  Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderHandleChanges = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.yellow} bold>Uncommitted Changes Detected</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Text>You have uncommitted changes in your working directory.</Text>
        <Text color={palette.dim}>These must be stashed before creating a new branch.</Text>
      </Box>

      <Box marginTop={2}>
        <Text color={palette.dim}>
          S Stash changes  C Cancel
        </Text>
      </Box>
    </Box>
  );

  const renderCreating = () => {
    if (state.branchExistsPrompt) {
      return (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={palette.yellow} bold>Branch Already Exists</Text>
          </Box>

          <Box flexDirection="column" marginLeft={2}>
            <Text>Branch "{state.branchName}" already exists.</Text>
            <Text color={palette.dim}>Do you want to checkout the existing branch?</Text>
          </Box>

          <Box marginTop={2}>
            <Text color={palette.dim}>
              Y Checkout existing  N Edit name
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Spinner label="Creating branch..." />
      </Box>
    );
  };

  const renderComplete = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={palette.green} bold>Workflow Complete</Text>
      </Box>

      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text color={palette.dim}>Now on branch: </Text>
          <Text color={palette.green}>{state.branchName}</Text>
        </Box>
        {!state.transitionSkipped && (
          <Box>
            <Text color={palette.dim}>Ticket </Text>
            <Text color={palette.yellow}>{ticket.key}</Text>
            <Text color={palette.dim}> is now </Text>
            <Text color={palette.cyan}>In Progress</Text>
          </Box>
        )}
        {state.stashed && (
          <Box marginTop={1}>
            <Text color={palette.dim}>Note: Your changes were stashed. Run </Text>
            <Text color={palette.yellow}>git stash pop</Text>
            <Text color={palette.dim}> to restore them.</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text color={palette.cyan}>Next steps:</Text>
        <Text color={palette.dim}>  P Plan your work (Phase 4)</Text>
        <Text color={palette.dim}>  Q Return to menu</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>
          P Plan  Q/Esc Quit
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
          R Retry  C Continue anyway  B/Esc Back
        </Text>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (state.step) {
      case 'confirm-transition':
        return renderConfirmTransition();
      case 'transitioning':
        return renderTransitioning();
      case 'edit-branch-name':
        return renderEditBranchName();
      case 'select-base-branch':
        return renderSelectBaseBranch();
      case 'handle-changes':
        return renderHandleChanges();
      case 'creating':
        return renderCreating();
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
    { key: 'confirm-transition', label: 'Transition' },
    { key: 'edit-branch-name', label: 'Branch Name' },
    { key: 'select-base-branch', label: 'Base Branch' },
    { key: 'creating', label: 'Create' },
    { key: 'complete', label: 'Done' },
  ];

  const currentStepIndex = steps.findIndex(s =>
    s.key === state.step ||
    (s.key === 'confirm-transition' && state.step === 'transitioning') ||
    (s.key === 'creating' && state.step === 'handle-changes')
  );

  // Show loading during initialization
  if (isInitializing) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={palette.orange}>
          {'+-[ Start Work: ' + ticket.key + ' ]' + '-'.repeat(Math.max(0, 45 - ticket.key.length)) + '+'}
        </Text>
        <Box flexDirection="column" paddingLeft={2} paddingY={2}>
          <Spinner label="Loading workflow..." />
        </Box>
        <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Start Work: ' + ticket.key + ' ]' + '-'.repeat(Math.max(0, 45 - ticket.key.length)) + '+'}
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
