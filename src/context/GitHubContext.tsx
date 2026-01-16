import React, {createContext, useContext, useState, useEffect} from 'react';
import {
  getGitHubConfig,
  saveGitHubPAT,
  clearGitHubConfig,
  isGitHubConnected as checkConnected,
} from '../utils/settings.js';

export interface GitHubAuthState {
  isConnected: boolean;
  username?: string;
  hasCopilotAccess?: boolean;
  lastVerified?: string;
  isLoading: boolean;
}

interface GitHubContextType {
  authState: GitHubAuthState;
  connect: (
    pat: string,
    username: string,
    hasCopilotAccess: boolean,
  ) => void;
  disconnect: () => void;
  refresh: () => void;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export const GitHubProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<GitHubAuthState>({
    isConnected: false,
    isLoading: true,
  });

  const loadState = () => {
    const config = getGitHubConfig();
    setAuthState({
      isConnected: checkConnected(),
      username: config?.username,
      hasCopilotAccess: config?.hasCopilotAccess,
      lastVerified: config?.lastVerified,
      isLoading: false,
    });
  };

  useEffect(() => {
    loadState();
  }, []);

  const connect = (
    pat: string,
    username: string,
    hasCopilotAccess: boolean,
  ) => {
    saveGitHubPAT(pat, username, hasCopilotAccess);
    setAuthState({
      isConnected: true,
      username,
      hasCopilotAccess,
      lastVerified: new Date().toISOString(),
      isLoading: false,
    });
  };

  const disconnect = () => {
    clearGitHubConfig();
    setAuthState({
      isConnected: false,
      isLoading: false,
    });
  };

  const refresh = () => {
    loadState();
  };

  return (
    <GitHubContext.Provider value={{authState, connect, disconnect, refresh}}>
      {children}
    </GitHubContext.Provider>
  );
};

export const useGitHub = (): GitHubContextType => {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within a GitHubProvider');
  }
  return context;
};
