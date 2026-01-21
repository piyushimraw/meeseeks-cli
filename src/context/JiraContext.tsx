import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { JiraTicket, ActionableError } from '../types/index.js';
import { createJiraService, JiraService } from '../services/jira.js';
import { useCredentials } from './CredentialContext.js';
import { loadConfig, saveConfig } from '../utils/settings.js';
import { formatApiError } from '../components/ErrorMessage.js';

interface JiraState {
  isConnected: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  tickets: JiraTicket[];
  selectedTicket: JiraTicket | null;
  error: ActionableError | null;
}

interface JiraContextType {
  state: JiraState;
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
    tickets: [],
    selectedTicket: null,
    error: null,
  });
  const jiraServiceRef = useRef<JiraService | null>(null);

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

  // Load all tickets assigned to current user
  const loadTickets = useCallback(async () => {
    if (!jiraServiceRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const tickets = await jiraServiceRef.current.getMyIssues();

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

  const selectTicket = useCallback((ticket: JiraTicket | null) => {
    // Save selection to config for persistence
    const config = loadConfig();
    if (!config.jira) config.jira = {};
    config.jira.selectedTicketKey = ticket?.key || undefined;
    saveConfig(config);

    setState(prev => ({ ...prev, selectedTicket: ticket }));
  }, []);

  const refresh = useCallback(async () => {
    await loadTickets();
  }, [loadTickets]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <JiraContext.Provider
      value={{
        state,
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
