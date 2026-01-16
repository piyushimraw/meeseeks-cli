import React, {createContext, useContext, useState, useEffect} from 'react';
import type {TokenSource} from '../types/index.js';
import {
  getCopilotConfig,
  saveCopilotConfig,
  clearCopilotConfig,
  isCopilotConnected as checkConnected,
  saveSelectedModel,
  getSelectedModel,
} from '../utils/settings.js';
import {
  detectCopilotToken,
  verifyCopilotToken,
  clearCopilotTokenCache,
  DEFAULT_MODEL_ID,
  type DetectedToken,
} from '../utils/copilot.js';

export interface CopilotAuthState {
  isConnected: boolean;
  tokenSource?: TokenSource;
  lastVerified?: string;
  isLoading: boolean;
  isInitializing: boolean;
  initAttempted: boolean;
  initError?: string;
  token?: string;
  selectedModel: string;
}

interface CopilotContextType {
  authState: CopilotAuthState;
  connect: (tokenSource: TokenSource, token: string) => void;
  disconnect: () => void;
  refresh: () => void;
  autoDetect: () => Promise<DetectedToken | null>;
  verify: (token: string) => Promise<{success: boolean; error?: string}>;
  getToken: () => string | null;
  retryInit: () => void;
  setModel: (modelId: string) => void;
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
    isInitializing: true,
    initAttempted: false,
    selectedModel: getSelectedModel() || DEFAULT_MODEL_ID,
  });

  const initializeAuth = async () => {
    setAuthState((prev) => ({
      ...prev,
      isInitializing: true,
      initError: undefined,
    }));

    try {
      // Detect token from known locations
      const detected = detectCopilotToken();

      if (!detected) {
        // No token found - not an error, just not connected
        setAuthState((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          isInitializing: false,
          initAttempted: true,
        }));
        return;
      }

      // Verify the detected token
      const result = await verifyCopilotToken(detected.token);

      if (result.success) {
        // Token is valid - store in memory and save config
        memoryToken = detected.token;
        saveCopilotConfig(detected.source);
        setAuthState((prev) => ({
          ...prev,
          isConnected: true,
          tokenSource: detected.source,
          lastVerified: new Date().toISOString(),
          isLoading: false,
          isInitializing: false,
          initAttempted: true,
        }));
      } else {
        // Token is invalid/expired - clear any stale config
        clearCopilotConfig();
        setAuthState((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          isInitializing: false,
          initAttempted: true,
          initError: result.error || 'Token verification failed',
        }));
      }
    } catch (error) {
      // Network or other error during verification
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        isInitializing: false,
        initAttempted: true,
        initError:
          error instanceof Error ? error.message : 'Failed to initialize',
      }));
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const connect = (tokenSource: TokenSource, token: string) => {
    memoryToken = token;
    saveCopilotConfig(tokenSource);
    setAuthState((prev) => ({
      ...prev,
      isConnected: true,
      tokenSource,
      lastVerified: new Date().toISOString(),
      isLoading: false,
    }));
  };

  const disconnect = () => {
    memoryToken = null;
    clearCopilotConfig();
    clearCopilotTokenCache();
    setAuthState((prev) => ({
      ...prev,
      isConnected: false,
      tokenSource: undefined,
      lastVerified: undefined,
      isLoading: false,
      initError: undefined,
    }));
  };

  const refresh = () => {
    const config = getCopilotConfig();
    setAuthState((prev) => ({
      ...prev,
      isConnected: checkConnected(),
      tokenSource: config?.tokenSource,
      lastVerified: config?.lastVerified,
      isLoading: false,
    }));
  };

  const retryInit = () => {
    initializeAuth();
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

  const setModel = (modelId: string): void => {
    saveSelectedModel(modelId);
    setAuthState((prev) => ({
      ...prev,
      selectedModel: modelId,
    }));
  };

  return (
    <CopilotContext.Provider
      value={{authState, connect, disconnect, refresh, autoDetect, verify, getToken, retryInit, setModel}}
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
