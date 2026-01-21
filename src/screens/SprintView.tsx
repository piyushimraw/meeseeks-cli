import React, { useState, useEffect, useMemo } from 'react';
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

type ViewState = 'list' | 'actions' | 'not-configured' | 'filter';

interface SprintViewProps {
  onBack: () => void;
}

// Priority indicator
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
const truncateSummary = (summary: string, maxLength: number = 40): string => {
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength - 3) + '...';
};

export const SprintView: React.FC<SprintViewProps> = ({ onBack }) => {
  const { state: jiraState, loadTickets, selectTicket, refresh, clearError } = useJira();
  const { getServiceStatus } = useCredentials();
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterText, setFilterText] = useState('');

  const jiraConfigured = getServiceStatus('jira')?.isConfigured;

  // Initial load - only once when connected, not on error
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (jiraConfigured && jiraState.isConnected && !hasLoaded && !jiraState.isLoading && !jiraState.error) {
      setHasLoaded(true);
      loadTickets();
    }
  }, [jiraConfigured, jiraState.isConnected, hasLoaded, jiraState.isLoading, jiraState.error, loadTickets]);

  // Check if configured
  useEffect(() => {
    if (!jiraConfigured) {
      setViewState('not-configured');
    } else if (viewState === 'not-configured') {
      setViewState('list');
    }
  }, [jiraConfigured, viewState]);

  // Filter tickets based on filterText
  const filteredTickets = useMemo(() => {
    if (!filterText.trim()) {
      return jiraState.tickets;
    }
    const search = filterText.toLowerCase().trim();
    return jiraState.tickets.filter((ticket: JiraTicket) =>
      ticket.key.toLowerCase().includes(search) ||
      ticket.summary.toLowerCase().includes(search) ||
      ticket.status.toLowerCase().includes(search)
    );
  }, [jiraState.tickets, filterText]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filterText]);

  // Sync selectedIndex with selectedTicket from state
  useEffect(() => {
    if (jiraState.selectedTicket && filteredTickets.length > 0) {
      const idx = filteredTickets.findIndex(t => t.key === jiraState.selectedTicket?.key);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    }
  }, [jiraState.selectedTicket, filteredTickets]);

  // Keyboard navigation
  useInput((input, key) => {
    // Filter mode input handling
    if (viewState === 'filter') {
      if (key.escape) {
        setViewState('list');
        return;
      }
      if (key.return) {
        setViewState('list');
        return;
      }
      if (key.backspace || key.delete) {
        setFilterText(prev => prev.slice(0, -1));
        return;
      }
      // Add printable characters to filter
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setFilterText(prev => prev + input);
        return;
      }
      return;
    }

    // Global back
    if (input === 'b' || key.escape) {
      if (viewState === 'actions') {
        setViewState('list');
      } else if (filterText) {
        // Clear filter first
        setFilterText('');
      } else {
        onBack();
      }
      return;
    }

    // Refresh
    if (input === 'r') {
      clearError();
      setHasLoaded(false);
      refresh();
      return;
    }

    // Enter filter mode with /
    if (input === '/' && viewState === 'list') {
      setViewState('filter');
      return;
    }

    // Clear filter with c
    if (input === 'c' && viewState === 'list' && filterText) {
      setFilterText('');
      return;
    }

    if (viewState === 'list' && filteredTickets.length > 0) {
      // Arrow/vim navigation
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredTickets.length - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => (prev < filteredTickets.length - 1 ? prev + 1 : 0));
      }

      // Number shortcuts 1-9
      const num = parseInt(input);
      if (num >= 1 && num <= 9 && num <= filteredTickets.length) {
        setSelectedIndex(num - 1);
      }

      // Select ticket
      if (key.return) {
        const ticket = filteredTickets[selectedIndex];
        selectTicket(ticket);
        setViewState('actions');
      }
    }

    // Actions view
    if (viewState === 'actions') {
      if (input === '1') {
        // Start work - will be implemented in Phase 3
        onBack();
      } else if (input === '2') {
        // View details
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
      <Spinner label="Loading your tickets..." />
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

  const renderEmptyState = () => (
    <Box flexDirection="column">
      <Text color={palette.yellow}>No open tickets assigned to you</Text>
      <Text color={palette.dim}>Filter: assignee = currentUser() AND resolution = Unresolved</Text>
      <Box marginTop={1}>
        <Text color={palette.dim}>Press r to refresh  b to go back</Text>
      </Box>
    </Box>
  );

  const renderFilterInput = () => (
    <Box marginBottom={1}>
      <Text color={palette.cyan}>Filter: </Text>
      <Text color={palette.yellow}>{filterText}</Text>
      <Text color={palette.dim}>█</Text>
      {viewState === 'filter' && (
        <Text color={palette.dim}> (Enter to confirm, Esc to cancel)</Text>
      )}
    </Box>
  );

  const renderTicketList = () => (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={palette.cyan}>My Tickets </Text>
        <Text color={palette.dim}>
          ({filteredTickets.length}
          {filterText && ` of ${jiraState.tickets.length}`} open)
        </Text>
        {jiraState.selectedTicket && (
          <>
            <Text color={palette.dim}> | Working on: </Text>
            <Text color={palette.green}>{jiraState.selectedTicket.key}</Text>
          </>
        )}
      </Box>

      {/* Filter input */}
      {(filterText || viewState === 'filter') && renderFilterInput()}

      {/* No matches message */}
      {filteredTickets.length === 0 && filterText && (
        <Box marginY={1}>
          <Text color={palette.yellow}>No tickets match "{filterText}"</Text>
          <Text color={palette.dim}> - press c to clear filter</Text>
        </Box>
      )}

      {/* Ticket list */}
      <Box flexDirection="column">
        {filteredTickets.map((ticket, index) => {
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
          j/k Navigate  / Filter  {filterText && 'c Clear  '}Enter Select  r Refresh  b Back
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
        {'+-[ My Tickets ]' + '-'.repeat(46) + '+'}
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
