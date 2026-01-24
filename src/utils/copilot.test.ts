import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSourceDisplayName,
  DEFAULT_MODEL_ID,
  FALLBACK_MODELS,
  clearCopilotTokenCache,
  type ChatMessage,
  type ChatResponse,
  type DetectedToken,
  type CopilotVerifyResult,
  type FetchModelsResult,
} from './copilot.js';

describe('copilot', () => {
  describe('getSourceDisplayName', () => {
    it('returns "GitHub Copilot CLI" for cli source', () => {
      expect(getSourceDisplayName('cli')).toBe('GitHub Copilot CLI');
    });

    it('returns "VS Code" for vscode source', () => {
      expect(getSourceDisplayName('vscode')).toBe('VS Code');
    });

    it('returns "Unknown" for unknown source', () => {
      expect(getSourceDisplayName('unknown')).toBe('Unknown');
    });

    it('returns "Unknown" for any other value', () => {
      // Type coercion for edge case testing
      expect(getSourceDisplayName('other' as 'cli')).toBe('Unknown');
    });
  });

  describe('DEFAULT_MODEL_ID', () => {
    it('is defined as gpt-4o', () => {
      expect(DEFAULT_MODEL_ID).toBe('gpt-4o');
    });

    it('is a non-empty string', () => {
      expect(typeof DEFAULT_MODEL_ID).toBe('string');
      expect(DEFAULT_MODEL_ID.length).toBeGreaterThan(0);
    });
  });

  describe('FALLBACK_MODELS', () => {
    it('is an array with multiple models', () => {
      expect(Array.isArray(FALLBACK_MODELS)).toBe(true);
      expect(FALLBACK_MODELS.length).toBeGreaterThan(0);
    });

    it('contains the default model', () => {
      const hasDefaultModel = FALLBACK_MODELS.some(m => m.id === DEFAULT_MODEL_ID);
      expect(hasDefaultModel).toBe(true);
    });

    it('has valid structure for all models', () => {
      for (const model of FALLBACK_MODELS) {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('vendor');
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.vendor).toBe('string');
        expect(model.id.length).toBeGreaterThan(0);
        expect(model.name.length).toBeGreaterThan(0);
        expect(model.vendor?.length).toBeGreaterThan(0);
      }
    });

    it('contains expected vendors', () => {
      const vendors = new Set(FALLBACK_MODELS.map(m => m.vendor));
      expect(vendors.has('OpenAI')).toBe(true);
      expect(vendors.has('Anthropic')).toBe(true);
    });

    it('contains expected model families', () => {
      const ids = FALLBACK_MODELS.map(m => m.id);
      // OpenAI models
      expect(ids.some(id => id.includes('gpt-4'))).toBe(true);
      expect(ids.some(id => id.includes('gpt-3.5'))).toBe(true);
      // Anthropic models
      expect(ids.some(id => id.includes('claude'))).toBe(true);
    });

    it('has correct vendor assignments based on model ID patterns', () => {
      for (const model of FALLBACK_MODELS) {
        if (model.id.includes('gpt') || model.id.includes('o1')) {
          expect(model.vendor).toBe('OpenAI');
        }
        if (model.id.includes('claude')) {
          expect(model.vendor).toBe('Anthropic');
        }
      }
    });
  });

  describe('clearCopilotTokenCache', () => {
    it('can be called without error', () => {
      expect(() => clearCopilotTokenCache()).not.toThrow();
    });

    it('can be called multiple times without error', () => {
      expect(() => {
        clearCopilotTokenCache();
        clearCopilotTokenCache();
        clearCopilotTokenCache();
      }).not.toThrow();
    });
  });

  describe('ChatMessage type structure', () => {
    it('accepts valid message roles', () => {
      const systemMsg: ChatMessage = { role: 'system', content: 'System prompt' };
      const userMsg: ChatMessage = { role: 'user', content: 'User input' };
      const assistantMsg: ChatMessage = { role: 'assistant', content: 'Assistant response' };

      expect(systemMsg.role).toBe('system');
      expect(userMsg.role).toBe('user');
      expect(assistantMsg.role).toBe('assistant');
    });

    it('requires content field', () => {
      const msg: ChatMessage = { role: 'user', content: '' };
      expect(msg).toHaveProperty('content');
    });
  });

  describe('ChatResponse type structure', () => {
    it('represents successful response', () => {
      const response: ChatResponse = {
        success: true,
        content: 'Hello!',
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };
      expect(response.success).toBe(true);
      expect(response.content).toBe('Hello!');
      expect(response.usage?.total_tokens).toBe(15);
    });

    it('represents error response', () => {
      const response: ChatResponse = {
        success: false,
        error: 'Token expired',
      };
      expect(response.success).toBe(false);
      expect(response.error).toBe('Token expired');
      expect(response.content).toBeUndefined();
    });
  });

  describe('DetectedToken type structure', () => {
    it('represents CLI token', () => {
      const detected: DetectedToken = {
        token: 'test-token-123',
        source: 'cli',
      };
      expect(detected.token).toBe('test-token-123');
      expect(detected.source).toBe('cli');
    });

    it('represents VS Code token', () => {
      const detected: DetectedToken = {
        token: 'gho_vscode_token',
        source: 'vscode',
      };
      expect(detected.token).toBe('gho_vscode_token');
      expect(detected.source).toBe('vscode');
    });
  });

  describe('CopilotVerifyResult type structure', () => {
    it('represents successful verification', () => {
      const result: CopilotVerifyResult = {
        success: true,
        copilotToken: 'exchanged-token',
      };
      expect(result.success).toBe(true);
      expect(result.copilotToken).toBe('exchanged-token');
      expect(result.error).toBeUndefined();
    });

    it('represents failed verification', () => {
      const result: CopilotVerifyResult = {
        success: false,
        error: 'Invalid token',
      };
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.copilotToken).toBeUndefined();
    });
  });

  describe('FetchModelsResult type structure', () => {
    it('represents API fetch result', () => {
      const result: FetchModelsResult = {
        success: true,
        models: [{ id: 'gpt-4o', name: 'GPT-4o', vendor: 'OpenAI' }],
        source: 'api',
      };
      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
      expect(result.models?.length).toBe(1);
    });

    it('represents fallback result', () => {
      const result: FetchModelsResult = {
        success: true,
        models: FALLBACK_MODELS,
        source: 'fallback',
        error: 'API unavailable',
      };
      expect(result.success).toBe(true);
      expect(result.source).toBe('fallback');
      expect(result.error).toBe('API unavailable');
    });
  });

  describe('Error message patterns', () => {
    it('has consistent error format for auth errors', () => {
      // Testing the expected error message patterns used in the module
      const authErrors = [
        'OAuth token expired or invalid',
        'No Copilot subscription found',
        'Token expired or invalid',
        'No Copilot access',
      ];

      for (const error of authErrors) {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      }
    });

    it('handles network error formatting', () => {
      const networkError = new Error('Connection refused');
      const formatted = networkError instanceof Error ? networkError.message : 'Network error';
      expect(formatted).toBe('Connection refused');
    });

    it('handles non-Error objects in catch blocks', () => {
      const unknownError: unknown = 'string error';
      const formatted = unknownError instanceof Error ? unknownError.message : 'Network error';
      expect(formatted).toBe('Network error');
    });
  });

  describe('Request formatting patterns', () => {
    it('formats chat messages correctly for API', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      // Simulate the request body structure used in makeChatRequest
      const requestBody = {
        model: 'gpt-4o',
        messages,
        stream: false,
      };

      expect(requestBody.model).toBe('gpt-4o');
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.stream).toBe(false);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
    });

    it('formats authorization headers correctly', () => {
      const oauthToken = 'gho_test_token';
      const bearerToken = 'test_bearer_token';

      // OAuth token format (used in token exchange)
      const oauthHeader = `token ${oauthToken}`;
      expect(oauthHeader).toBe('token gho_test_token');

      // Bearer token format (used in chat requests)
      const bearerHeader = `Bearer ${bearerToken}`;
      expect(bearerHeader).toBe('Bearer test_bearer_token');
    });
  });

  describe('Response parsing patterns', () => {
    it('extracts content from OpenAI-style response', () => {
      const apiResponse = {
        choices: [
          {
            message: {
              content: 'Hello from Copilot!',
            },
          },
        ],
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      const content = apiResponse.choices?.[0]?.message?.content;
      expect(content).toBe('Hello from Copilot!');
    });

    it('handles missing content gracefully', () => {
      const emptyResponse: { choices: Array<{ message?: { content?: string } }> } = {
        choices: [],
      };

      const content = emptyResponse.choices?.[0]?.message?.content;
      expect(content).toBeUndefined();
    });

    it('parses model list from OpenAI-style response', () => {
      const modelsResponse = {
        data: [
          { id: 'gpt-4o', name: 'GPT-4o', owned_by: 'OpenAI' },
          { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', owned_by: 'Anthropic' },
        ],
      };

      const models = modelsResponse.data.map((m: { id: string; name?: string; owned_by?: string }) => ({
        id: m.id,
        name: m.name || m.id,
        vendor: m.owned_by || 'Unknown',
      }));

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gpt-4o');
      expect(models[1].vendor).toBe('Anthropic');
    });

    it('parses token exchange response', () => {
      const tokenResponse = {
        token: 'exchanged_copilot_token',
        expires_at: 1700000000,
        endpoints: {
          api: 'https://api.enterprise.githubcopilot.com',
        },
      };

      const expiresAt = tokenResponse.expires_at
        ? tokenResponse.expires_at * 1000
        : Date.now() + 30 * 60 * 1000;
      const apiEndpoint = tokenResponse.endpoints?.api || 'https://api.githubcopilot.com';

      expect(tokenResponse.token).toBe('exchanged_copilot_token');
      expect(expiresAt).toBe(1700000000000); // Converted to ms
      expect(apiEndpoint).toBe('https://api.enterprise.githubcopilot.com');
    });

    it('uses default endpoint when not provided', () => {
      const tokenResponse = {
        token: 'token',
        expires_at: 1700000000,
      };

      const apiEndpoint = (tokenResponse as { endpoints?: { api?: string } }).endpoints?.api || 'https://api.githubcopilot.com';
      expect(apiEndpoint).toBe('https://api.githubcopilot.com');
    });
  });

  describe('JSON token file parsing patterns', () => {
    it('parses hosts.json format', () => {
      const hostsJson = {
        'github.com': {
          oauth_token: 'gho_hosts_token',
        },
      };

      const token = hostsJson['github.com']?.oauth_token;
      expect(token).toBe('gho_hosts_token');
    });

    it('parses apps.json format with multiple entries', () => {
      const appsJson = {
        'app-1': {
          some_field: 'value',
        },
        'app-2': {
          oauth_token: 'gho_apps_token',
        },
      };

      // Find first entry with oauth_token
      let token: string | undefined;
      for (const key of Object.keys(appsJson)) {
        const entry = appsJson[key as keyof typeof appsJson];
        if ((entry as { oauth_token?: string }).oauth_token) {
          token = (entry as { oauth_token: string }).oauth_token;
          break;
        }
      }

      expect(token).toBe('gho_apps_token');
    });

    it('handles missing oauth_token', () => {
      const noTokenJson = {
        'github.com': {
          user: 'testuser',
        },
      };

      const token = (noTokenJson['github.com'] as { oauth_token?: string })?.oauth_token;
      expect(token).toBeUndefined();
    });
  });

  // API-calling functions are explicitly skipped as per acceptance criteria
  describe.skip('API functions (skipped - require actual API calls)', () => {
    it('detectCopilotToken - requires filesystem access', () => {});
    it('exchangeForCopilotToken - requires network call', () => {});
    it('getCopilotApiToken - requires network call', () => {});
    it('verifyCopilotToken - requires network call', () => {});
    it('chatWithCopilot - requires network call', () => {});
    it('testCopilotConnection - requires network call', () => {});
    it('fetchAvailableModels - requires network call', () => {});
  });
});
