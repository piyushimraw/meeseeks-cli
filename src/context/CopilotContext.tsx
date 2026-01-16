import React, {createContext, useContext, useState, useEffect} from 'react';
import type {TokenSource} from '../types/index.js';
import {
  getCopilotConfig,
  saveCopilotConfig,
  clearCopilotConfig,
  isCopilotConnected as checkConnected,
} from '../utils/settings.js';
import {
  detectCopilotToken,
  verifyCopilotToken,
  type DetectedToken,
} from '../utils/copilot.js';

export interface CopilotAuthState {
  isConnected: boolean;
  tokenSource?: TokenSource;
  lastVerified?: string;
  isLoading: boolean;
  token?: string;
}

interface CopilotContextType {
  authState: CopilotAuthState;
  connect: (tokenSource: TokenSource, token: string) => void;
  disconnect: () => void;
  refresh: () => void;
  autoDetect: () => Promise<DetectedToken | null>;
  verify: (token: string) => Promise<{success: boolean; error?: string}>;
  getToken: () => string | null;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

// Store token in memory (not persisted to disk for security)
let memoryToken: string | null = null;

export const CopilotProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<CopilotAuthState>({
    isConnected: false,
    isLoading: true,
  });

  const loadState = () => {
    const config = getCopilotConfig();
    setAuthState({
      isConnected: checkConnected(),
      tokenSource: config?.tokenSource,
      lastVerified: config?.lastVerified,
      isLoading: false,
    });
  };

  useEffect(() => {
    loadState();
  }, []);

  const connect = (tokenSource: TokenSource, token: string) => {
    memoryToken = token;
    saveCopilotConfig(tokenSource);
    setAuthState({
      isConnected: true,
      tokenSource,
      lastVerified: new Date().toISOString(),
      isLoading: false,
    });
  };

  const disconnect = () => {
    memoryToken = null;
    clearCopilotConfig();
    setAuthState({
      isConnected: false,
      isLoading: false,
    });
  };

  const refresh = () => {
    loadState();
  };

  const autoDetect = async (): Promise<DetectedToken | null> => {
    return detectCopilotToken();
  };

  const verify = async (
    token: string,
  ): Promise<{success: boolean; error?: string}> => {
    return verifyCopilotToken(token);
  };

  const getToken = (): string | null => {
    // If we have a token in memory, use it
    if (memoryToken) {
      return memoryToken;
    }

    // Otherwise try to auto-detect
    const detected = detectCopilotToken();
    if (detected) {
      memoryToken = detected.token;
      return detected.token;
    }

    return null;
  };

  return (
    <CopilotContext.Provider
      value={{authState, connect, disconnect, refresh, autoDetect, verify, getToken}}
    >
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilot = (): CopilotContextType => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
};
