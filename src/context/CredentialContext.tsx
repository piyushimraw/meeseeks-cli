import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ServiceId, ServiceCredential, ServiceDefinition } from '../types/index.js';
import { credentialService } from '../services/credentials.js';
import { loadConfig, saveConfig } from '../utils/settings.js';

// Service definitions - what credentials each service needs
const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  {
    id: 'jira',
    name: 'JIRA Cloud',
    description: 'Atlassian JIRA for ticket management',
    fields: [
      {
        key: 'url',
        label: 'JIRA URL',
        type: 'url',
        placeholder: 'https://your-company.atlassian.net',
        validation: (v) => {
          if (!v) return 'URL is required';
          try { new URL(v); return null; } catch { return 'Invalid URL format'; }
        }
      },
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        placeholder: 'you@company.com',
        validation: (v) => !v ? 'Email is required' : null
      },
      {
        key: 'token',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your JIRA API token',
        validation: (v) => !v ? 'API token is required' : null
      }
    ],
    testConnection: async (creds) => {
      // Placeholder - Phase 2 will implement actual JIRA test
      // For now, just validate fields are present
      if (!creds.url || !creds.email || !creds.token) {
        return { success: false, error: 'All fields are required' };
      }
      return { success: true };
    }
  },
  {
    id: 'squadcast',
    name: 'Squadcast',
    description: 'Incident management platform',
    fields: [
      {
        key: 'token',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your Squadcast API token',
        validation: (v) => !v ? 'API token is required' : null
      }
    ],
    testConnection: async (creds) => {
      if (!creds.token) return { success: false, error: 'API token is required' };
      return { success: true };
    }
  },
  {
    id: 'solarwinds',
    name: 'SolarWinds',
    description: 'Log management and monitoring',
    fields: [
      {
        key: 'url',
        label: 'API URL',
        type: 'url',
        placeholder: 'https://api.solarwinds.com',
        validation: (v) => {
          if (!v) return 'URL is required';
          try { new URL(v); return null; } catch { return 'Invalid URL format'; }
        }
      },
      {
        key: 'token',
        label: 'API Token',
        type: 'password',
        placeholder: 'Your SolarWinds API token',
        validation: (v) => !v ? 'API token is required' : null
      }
    ],
    testConnection: async (creds) => {
      if (!creds.url || !creds.token) return { success: false, error: 'All fields are required' };
      return { success: true };
    }
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Metrics and dashboards',
    fields: [
      {
        key: 'url',
        label: 'Grafana URL',
        type: 'url',
        placeholder: 'https://your-grafana.com',
        validation: (v) => {
          if (!v) return 'URL is required';
          try { new URL(v); return null; } catch { return 'Invalid URL format'; }
        }
      },
      {
        key: 'token',
        label: 'Service Account Token',
        type: 'password',
        placeholder: 'Your Grafana service account token',
        validation: (v) => !v ? 'Token is required' : null
      }
    ],
    testConnection: async (creds) => {
      if (!creds.url || !creds.token) return { success: false, error: 'All fields are required' };
      return { success: true };
    }
  }
];

interface CredentialState {
  services: ServiceCredential[];
  isLoading: boolean;
  isInitialized: boolean;
}

interface CredentialContextType {
  state: CredentialState;
  getServiceDefinition: (id: ServiceId) => ServiceDefinition | undefined;
  getAllServiceDefinitions: () => ServiceDefinition[];
  getServiceStatus: (id: ServiceId) => ServiceCredential | undefined;
  saveCredentials: (serviceId: ServiceId, fields: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  deleteCredentials: (serviceId: ServiceId) => Promise<void>;
  testConnection: (serviceId: ServiceId, fields: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

const CredentialContext = createContext<CredentialContextType | undefined>(undefined);

export const CredentialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CredentialState>({
    services: [],
    isLoading: true,
    isInitialized: false,
  });

  // Load service status from config and verify credentials exist in keychain
  const loadServiceStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    const config = loadConfig();
    const services: ServiceCredential[] = [];

    for (const def of SERVICE_DEFINITIONS) {
      const fieldKeys = def.fields.map(f => f.key);
      const storedFields = await credentialService.retrieveFields(def.id, fieldKeys);

      // Check if all required fields have values
      const hasAllFields = fieldKeys.every(k => storedFields[k] !== null);

      // Get saved metadata from config
      const savedMeta = config.services?.[def.id];

      services.push({
        serviceId: def.id,
        fields: Object.fromEntries(
          Object.entries(storedFields).map(([k, v]) => [k, v || ''])
        ),
        isConfigured: hasAllFields,
        lastVerified: savedMeta?.lastVerified,
      });
    }

    setState({
      services,
      isLoading: false,
      isInitialized: true,
    });
  }, []);

  useEffect(() => {
    loadServiceStatus();
  }, [loadServiceStatus]);

  const getServiceDefinition = (id: ServiceId): ServiceDefinition | undefined => {
    return SERVICE_DEFINITIONS.find(s => s.id === id);
  };

  const getAllServiceDefinitions = (): ServiceDefinition[] => {
    return SERVICE_DEFINITIONS;
  };

  const getServiceStatus = (id: ServiceId): ServiceCredential | undefined => {
    return state.services.find(s => s.serviceId === id);
  };

  const testConnection = async (
    serviceId: ServiceId,
    fields: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    const def = getServiceDefinition(serviceId);
    if (!def) return { success: false, error: 'Unknown service' };

    // Validate all fields first
    for (const fieldDef of def.fields) {
      if (fieldDef.validation) {
        const error = fieldDef.validation(fields[fieldDef.key] || '');
        if (error) return { success: false, error };
      }
    }

    // Run service-specific test
    return def.testConnection(fields);
  };

  const saveCredentials = async (
    serviceId: ServiceId,
    fields: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    const def = getServiceDefinition(serviceId);
    if (!def) return { success: false, error: 'Unknown service' };

    try {
      // Store credentials in keychain
      await credentialService.storeFields(serviceId, fields);

      // Update config with metadata (NOT credentials - just verification timestamp)
      const config = loadConfig();
      if (!config.services) config.services = {};
      config.services[serviceId] = {
        lastVerified: new Date().toISOString(),
      };
      saveConfig(config);

      // Refresh state
      await loadServiceStatus();

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save credentials'
      };
    }
  };

  const deleteCredentials = async (serviceId: ServiceId): Promise<void> => {
    const def = getServiceDefinition(serviceId);
    if (!def) return;

    const fieldKeys = def.fields.map(f => f.key);
    await credentialService.deleteAll(serviceId, fieldKeys);

    // Remove from config
    const config = loadConfig();
    if (config.services) {
      delete config.services[serviceId];
      saveConfig(config);
    }

    // Refresh state
    await loadServiceStatus();
  };

  const refresh = async (): Promise<void> => {
    await loadServiceStatus();
  };

  return (
    <CredentialContext.Provider
      value={{
        state,
        getServiceDefinition,
        getAllServiceDefinitions,
        getServiceStatus,
        saveCredentials,
        deleteCredentials,
        testConnection,
        refresh,
      }}
    >
      {children}
    </CredentialContext.Provider>
  );
};

export const useCredentials = (): CredentialContextType => {
  const context = useContext(CredentialContext);
  if (!context) {
    throw new Error('useCredentials must be used within a CredentialProvider');
  }
  return context;
};
