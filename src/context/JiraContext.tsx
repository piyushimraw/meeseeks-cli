import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { JiraTicket, JiraSprint, JiraBoard, ActionableError } from '../types/index.js';
import { createJiraService, JiraService } from '../services/jira.js';
import { useCredentials } from './CredentialContext.js';
import { loadConfig, saveConfig } from '../utils/settings.js';
import { formatApiError } from '../components/ErrorMessage.js';

interface JiraState {
  isConnected: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  boards: JiraBoard[];
  selectedBoard: JiraBoard | null;
  activeSprint: JiraSprint | null;
  tickets: JiraTicket[];
  selectedTicket: JiraTicket | null;
  error: ActionableError | null;
}

interface JiraContextType {
  state: JiraState;
  loadBoards: () => Promise<void>;
  selectBoard: (board: JiraBoard) => Promise<void>;
  loadTickets: () => Promise<void>;
  selectTicket: (ticket: JiraTicket | null) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const JiraContext = createContext<JiraContextType | undefined>(undefined);

export const JiraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getServiceStatus } = useCredentials();
  const [state, setState] = useState<JiraState>({
    isConnected: false,
    isLoading: false,
    isInitialized: false,
    boards: [],
    selectedBoard: null,
    activeSprint: null,
    tickets: [],
    selectedTicket: null,
    error: null,
  });
  const jiraServiceRef = useRef<JiraService | null>(null);

  // Load sprint for a board (internal helper)
  const loadSprintForBoard = useCallback(async (boardId: number) => {
    if (!jiraServiceRef.current) return;

    const sprint = await jiraServiceRef.current.getActiveSprint(boardId);
    setState(prev => ({ ...prev, activeSprint: sprint }));

    if (sprint) {
      await loadTicketsForSprint(sprint.id);
    }
  }, []);

  // Load tickets for a sprint (internal helper)
  const loadTicketsForSprint = useCallback(async (sprintId: number) => {
    if (!jiraServiceRef.current) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const tickets = await jiraServiceRef.current.getMySprintIssues(sprintId);

      // Sort by priority (Highest first)
      const priorityOrder = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
      tickets.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.priority) === -1 ? 2 : priorityOrder.indexOf(a.priority);
        const bIndex = priorityOrder.indexOf(b.priority) === -1 ? 2 : priorityOrder.indexOf(b.priority);
        return aIndex - bIndex;
      });

      // Restore selected ticket from config
      const config = loadConfig();
      let selectedTicket: JiraTicket | null = null;
      if (config.jira?.selectedTicketKey) {
        selectedTicket = tickets.find(t => t.key === config.jira!.selectedTicketKey) || null;
      }

      setState(prev => ({ ...prev, tickets, selectedTicket, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: formatApiError(error instanceof Error ? error : new Error('Failed to load tickets'))
      }));
    }
  }, []);

  // Initialize JIRA service when credentials are available
  useEffect(() => {
    const initService = async () => {
      const jiraStatus = getServiceStatus('jira');

      if (!jiraStatus?.isConfigured) {
        setState(prev => ({ ...prev, isConnected: false, isInitialized: true }));
        return;
      }

      const service = createJiraService({
        host: jiraStatus.fields.url || '',
        email: jiraStatus.fields.email || '',
        apiToken: jiraStatus.fields.token || '',
      });

      // Verify connection
      const result = await service.testConnection();

      if (result.success) {
        jiraServiceRef.current = service;
        setState(prev => ({ ...prev, isConnected: true, isInitialized: true }));
      } else {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isInitialized: true,
          error: formatApiError(new Error(result.error || 'JIRA connection failed'))
        }));
      }
    };

    initService();
  }, [getServiceStatus]);

  const loadBoards = useCallback(async () => {
    if (!jiraServiceRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const boards = await jiraServiceRef.current.getBoards();

      // Auto-select first board if only one, or restore from config
      const config = loadConfig();
      let selectedBoard: JiraBoard | null = null;

      if (config.jira?.selectedBoardId) {
        selectedBoard = boards.find(b => b.id === config.jira!.selectedBoardId) || null;
      }
      if (!selectedBoard && boards.length === 1) {
        selectedBoard = boards[0];
      }

      setState(prev => ({ ...prev, boards, selectedBoard, isLoading: false }));

      // If we have a selected board, load its sprint
      if (selectedBoard) {
        await loadSprintForBoard(selectedBoard.id);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: formatApiError(error instanceof Error ? error : new Error('Failed to load boards'))
      }));
    }
  }, [loadSprintForBoard]);

  const selectBoard = useCallback(async (board: JiraBoard) => {
    // Save selection to config
    const config = loadConfig();
    if (!config.jira) config.jira = {};
    config.jira.selectedBoardId = board.id;
    saveConfig(config);

    setState(prev => ({ ...prev, selectedBoard: board, activeSprint: null, tickets: [] }));
    await loadSprintForBoard(board.id);
  }, [loadSprintForBoard]);

  const loadTickets = useCallback(async () => {
    if (state.activeSprint) {
      await loadTicketsForSprint(state.activeSprint.id);
    }
  }, [state.activeSprint, loadTicketsForSprint]);

  const selectTicket = useCallback((ticket: JiraTicket | null) => {
    // Save selection to config for persistence (per CONTEXT.md)
    const config = loadConfig();
    if (!config.jira) config.jira = {};
    config.jira.selectedTicketKey = ticket?.key || undefined;
    saveConfig(config);

    setState(prev => ({ ...prev, selectedTicket: ticket }));
  }, []);

  const refresh = useCallback(async () => {
    if (state.selectedBoard) {
      await loadSprintForBoard(state.selectedBoard.id);
    } else {
      await loadBoards();
    }
  }, [state.selectedBoard, loadBoards, loadSprintForBoard]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <JiraContext.Provider
      value={{
        state,
        loadBoards,
        selectBoard,
        loadTickets,
        selectTicket,
        refresh,
        clearError,
      }}
    >
      {children}
    </JiraContext.Provider>
  );
};

export const useJira = (): JiraContextType => {
  const context = useContext(JiraContext);
  if (!context) {
    throw new Error('useJira must be used within a JiraProvider');
  }
  return context;
};
