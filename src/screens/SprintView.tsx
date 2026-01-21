import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useJira } from '../context/JiraContext.js';
import { useCredentials } from '../context/CredentialContext.js';
import { Spinner } from '../components/Spinner.js';
import { ErrorMessage } from '../components/ErrorMessage.js';
import type { JiraTicket } from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type ViewState = 'list' | 'actions' | 'not-configured';

interface SprintViewProps {
  onBack: () => void;
}

// Priority indicator per CONTEXT.md
const getPriorityIndicator = (priority: string): { symbol: string; color: string } => {
  switch (priority) {
    case 'Highest':
    case 'High':
      return { symbol: '\u25B2', color: palette.red };  // Up triangle
    case 'Low':
    case 'Lowest':
      return { symbol: '\u25BC', color: palette.dim };  // Down triangle
    default:
      return { symbol: '-', color: palette.yellow };    // Dash for medium
  }
};

// Truncate summary to fit terminal
const truncateSummary = (summary: string, maxLength: number = 45): string => {
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength - 3) + '...';
};

export const SprintView: React.FC<SprintViewProps> = ({ onBack }) => {
  const { state: jiraState, loadBoards, selectTicket, refresh, clearError } = useJira();
  const { getServiceStatus } = useCredentials();
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const jiraConfigured = getServiceStatus('jira')?.isConfigured;

  // Initial load
  useEffect(() => {
    if (jiraConfigured && jiraState.isConnected && jiraState.boards.length === 0) {
      loadBoards();
    }
  }, [jiraConfigured, jiraState.isConnected, jiraState.boards.length, loadBoards]);

  // Check if configured
  useEffect(() => {
    if (!jiraConfigured) {
      setViewState('not-configured');
    } else {
      setViewState('list');
    }
  }, [jiraConfigured]);

  // Sync selectedIndex with selectedTicket from state
  useEffect(() => {
    if (jiraState.selectedTicket && jiraState.tickets.length > 0) {
      const idx = jiraState.tickets.findIndex(t => t.key === jiraState.selectedTicket?.key);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    }
  }, [jiraState.selectedTicket, jiraState.tickets]);

  // Keyboard navigation
  useInput((input, key) => {
    // Global back
    if (input === 'b' || key.escape) {
      if (viewState === 'actions') {
        setViewState('list');
      } else {
        onBack();
      }
      return;
    }

    // Retry on error (per CONTEXT.md)
    if (input === 'r' && jiraState.error) {
      clearError();
      refresh();
      return;
    }

    if (viewState === 'list' && jiraState.tickets.length > 0) {
      // Arrow/vim navigation
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : jiraState.tickets.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => (prev < jiraState.tickets.length - 1 ? prev + 1 : 0));
      }

      // Number shortcuts 1-9 (per CONTEXT.md)
      const num = parseInt(input);
      if (num >= 1 && num <= 9 && num <= jiraState.tickets.length) {
        setSelectedIndex(num - 1);
      }

      // Select ticket
      if (key.return) {
        const ticket = jiraState.tickets[selectedIndex];
        selectTicket(ticket);
        setViewState('actions');
      }
    }

    // Actions view
    if (viewState === 'actions') {
      if (input === '1') {
        // Start work - will be implemented in Phase 3
        // For now just keeps ticket selected
        onBack();
      } else if (input === '2') {
        // View details - show more info (could expand in future)
        setViewState('list');
      } else if (input === '3') {
        // Back to list
        setViewState('list');
      }
    }
  });

  const renderNotConfigured = () => (
    <Box flexDirection="column">
      <Text color={palette.yellow}>JIRA not configured</Text>
      <Box marginTop={1}>
        <Text>Press , (comma) to open Settings and configure JIRA credentials.</Text>
      </Box>
    </Box>
  );

  const renderLoading = () => (
    <Box flexDirection="column">
      <Spinner
        label="Loading sprint tickets..."
        subtext={jiraState.activeSprint ? `Sprint: ${jiraState.activeSprint.name}` : undefined}
      />
    </Box>
  );

  const renderError = () => (
    <Box flexDirection="column">
      <ErrorMessage error={jiraState.error!} showRetryHint={true} />
      <Box marginTop={1}>
        <Text color={palette.dim}>Press r to retry</Text>
      </Box>
    </Box>
  );

  // Format sprint dates for display
  const formatSprintDates = () => {
    if (!jiraState.activeSprint) return null;
    const { startDate, endDate } = jiraState.activeSprint;
    if (!startDate && !endDate) return null;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    if (startDate) return `Started ${formatDate(startDate)}`;
    if (endDate) return `Ends ${formatDate(endDate)}`;
    return null;
  };

  const renderSprintHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      {/* Board info */}
      {jiraState.selectedBoard && (
        <Box>
          <Text color={palette.cyan}>Board: </Text>
          <Text>{jiraState.selectedBoard.name}</Text>
          <Text color={palette.dim}> ({jiraState.selectedBoard.type})</Text>
        </Box>
      )}

      {/* Sprint info */}
      {jiraState.activeSprint ? (
        <Box>
          <Text color={palette.cyan}>Sprint: </Text>
          <Text>{jiraState.activeSprint.name}</Text>
          {formatSprintDates() && (
            <Text color={palette.dim}> ({formatSprintDates()})</Text>
          )}
        </Box>
      ) : jiraState.selectedBoard && (
        <Box>
          <Text color={palette.yellow}>No active sprint found</Text>
        </Box>
      )}

      {/* Working on indicator */}
      {jiraState.selectedTicket && (
        <Box>
          <Text color={palette.dim}>Working on: </Text>
          <Text color={palette.green}>{jiraState.selectedTicket.key}</Text>
        </Box>
      )}
    </Box>
  );

  const renderEmptyState = () => (
    <Box flexDirection="column">
      {renderSprintHeader()}

      <Box marginTop={1} flexDirection="column">
        <Text color={palette.yellow}>No tickets assigned to you in this sprint</Text>
        <Text color={palette.dim}>Filter: assignee = currentUser()</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={palette.dim}>Press r to refresh  b to go back</Text>
      </Box>
    </Box>
  );

  const renderTicketList = () => (
    <Box flexDirection="column">
      {/* Header with board/sprint info */}
      {renderSprintHeader()}

      {/* Ticket list - compact one-line per ticket per CONTEXT.md */}
      <Box flexDirection="column">
        {jiraState.tickets.map((ticket, index) => {
          const isSelected = index === selectedIndex;
          const priority = getPriorityIndicator(ticket.priority);
          const shortcutNum = index < 9 ? `${index + 1}` : ' ';

          return (
            <Box key={ticket.id}>
              <Text color={isSelected ? palette.cyan : palette.dim}>{shortcutNum} </Text>
              <Text color={isSelected ? palette.cyan : undefined}>
                {isSelected ? '> ' : '  '}
              </Text>
              <Text color={priority.color}>{priority.symbol} </Text>
              <Text color={palette.yellow} bold>{ticket.key}</Text>
              <Text color={palette.dim}> | </Text>
              <Text>{truncateSummary(ticket.summary)}</Text>
              <Text color={palette.dim}> | </Text>
              <Text color={
                ticket.status === 'Done' ? palette.green :
                ticket.status === 'In Progress' ? palette.cyan :
                palette.dim
              }>
                [{ticket.status}]
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box marginTop={2}>
        <Text color={palette.dim}>
          j/k or Up/Down Navigate  1-9 Quick select  Enter Select  r Refresh  b Back
        </Text>
      </Box>
    </Box>
  );

  const renderActions = () => {
    const ticket = jiraState.selectedTicket;
    if (!ticket) return null;

    return (
      <Box flexDirection="column">
        <Text color={palette.cyan} bold>{ticket.key}: {ticket.summary}</Text>
        <Box marginTop={1}>
          <Text color={palette.dim}>Status: </Text>
          <Text>{ticket.status}</Text>
        </Box>

        <Box flexDirection="column" marginTop={2}>
          <Text color={palette.yellow} bold>Actions</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text>1. Start work (Phase 3)</Text>
            <Text>2. View details</Text>
            <Text>3. Back to list</Text>
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text color={palette.dim}>Press 1-3 to select action  b/Esc Back</Text>
        </Box>
      </Box>
    );
  };

  const renderContent = () => {
    if (viewState === 'not-configured') {
      return renderNotConfigured();
    }
    if (!jiraState.isConnected && jiraState.isInitialized) {
      return renderError();
    }
    if (jiraState.isLoading) {
      return renderLoading();
    }
    if (jiraState.error) {
      return renderError();
    }
    if (viewState === 'actions') {
      return renderActions();
    }
    if (jiraState.tickets.length === 0 && jiraState.isInitialized) {
      return renderEmptyState();
    }
    return renderTicketList();
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Sprint Tickets ]' + '-'.repeat(42) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
