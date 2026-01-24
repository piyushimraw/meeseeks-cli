import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { ErrorMessage, formatApiError, type ActionableError } from './ErrorMessage.js';

describe('ErrorMessage', () => {
  describe('rendering', () => {
    it('displays the error message', () => {
      const error: ActionableError = {
        message: 'Connection failed',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      expect(lastFrame()).toContain('Connection failed');
    });

    it('displays suggestion when provided', () => {
      const error: ActionableError = {
        message: 'Network error',
        suggestion: 'Check your internet connection',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      expect(lastFrame()).toContain('Network error');
      expect(lastFrame()).toContain('Check your internet connection');
    });

    it('shows retry hint for retryable errors by default', () => {
      const error: ActionableError = {
        message: 'Timeout occurred',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      expect(lastFrame()).toContain("Press 'r' to retry");
      expect(lastFrame()).toContain('Esc to go back');
    });

    it('hides retry hint when showRetryHint is false', () => {
      const error: ActionableError = {
        message: 'Failed',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} showRetryHint={false} />);

      expect(lastFrame()).not.toContain("Press 'r' to retry");
      expect(lastFrame()).not.toContain('Esc to go back');
    });

    it('shows only Esc hint for non-retryable errors', () => {
      const error: ActionableError = {
        message: 'Authentication failed',
        retryable: false,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      expect(lastFrame()).not.toContain("Press 'r' to retry");
      expect(lastFrame()).toContain('Esc to go back');
    });

    it('shows details when showDetails is true', () => {
      const error: ActionableError = {
        message: 'Error occurred',
        details: 'Stack trace info here',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} showDetails={true} />);

      expect(lastFrame()).toContain('Details:');
      expect(lastFrame()).toContain('Stack trace info here');
    });

    it('hides details by default', () => {
      const error: ActionableError = {
        message: 'Error occurred',
        details: 'Stack trace info here',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      expect(lastFrame()).not.toContain('Stack trace info here');
    });
  });

  describe('user behavior', () => {
    it('provides actionable feedback for user to resolve issues', () => {
      const error: ActionableError = {
        message: 'Unable to connect to the service',
        suggestion: 'Check your internet connection and try again',
        retryable: true,
      };
      const { lastFrame } = render(<ErrorMessage error={error} />);

      const frame = lastFrame();
      // User sees the problem
      expect(frame).toContain('Unable to connect to the service');
      // User sees how to fix it
      expect(frame).toContain('Check your internet connection');
      // User sees available actions
      expect(frame).toContain("'r' to retry");
    });
  });
});

describe('formatApiError', () => {
  describe('network errors', () => {
    it('formats ENOTFOUND as network error', () => {
      const result = formatApiError(new Error('getaddrinfo ENOTFOUND api.example.com'));

      expect(result.message).toBe('Unable to connect to the service');
      expect(result.suggestion).toContain('internet connection');
      expect(result.retryable).toBe(true);
    });

    it('formats ECONNREFUSED as network error', () => {
      const result = formatApiError(new Error('connect ECONNREFUSED 127.0.0.1:8080'));

      expect(result.message).toBe('Unable to connect to the service');
      expect(result.retryable).toBe(true);
    });

    it('formats generic network error', () => {
      const result = formatApiError(new Error('network error occurred'));

      expect(result.message).toBe('Unable to connect to the service');
      expect(result.retryable).toBe(true);
    });
  });

  describe('authentication errors', () => {
    it('formats 401 as auth error', () => {
      const result = formatApiError(new Error('Request failed with status 401'));

      expect(result.message).toBe('Authentication failed');
      expect(result.suggestion).toContain('credentials');
      expect(result.retryable).toBe(false);
    });

    it('formats unauthorized as auth error', () => {
      const result = formatApiError(new Error('Unauthorized access'));

      expect(result.message).toBe('Authentication failed');
      expect(result.retryable).toBe(false);
    });

    it('formats invalid token as auth error', () => {
      const result = formatApiError(new Error('invalid token provided'));

      expect(result.message).toBe('Authentication failed');
      expect(result.retryable).toBe(false);
    });
  });

  describe('forbidden errors', () => {
    it('formats 403 as access denied', () => {
      const result = formatApiError(new Error('Request failed with status 403'));

      expect(result.message).toBe('Access denied');
      expect(result.suggestion).toContain('permission');
      expect(result.retryable).toBe(false);
    });

    it('formats forbidden as access denied', () => {
      const result = formatApiError(new Error('Forbidden resource'));

      expect(result.message).toBe('Access denied');
      expect(result.retryable).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('formats 429 as rate limit error', () => {
      const result = formatApiError(new Error('Request failed with status 429'));

      expect(result.message).toBe('Too many requests');
      expect(result.suggestion).toContain('wait');
      expect(result.retryable).toBe(true);
    });

    it('formats rate limit message', () => {
      const result = formatApiError(new Error('rate limit exceeded'));

      expect(result.message).toBe('Too many requests');
      expect(result.retryable).toBe(true);
    });
  });

  describe('server errors', () => {
    it('formats 500 as service unavailable', () => {
      const result = formatApiError(new Error('Request failed with status 500'));

      expect(result.message).toBe('Service temporarily unavailable');
      expect(result.retryable).toBe(true);
    });

    it('formats 502 as service unavailable', () => {
      const result = formatApiError(new Error('Bad gateway 502'));

      expect(result.message).toBe('Service temporarily unavailable');
      expect(result.retryable).toBe(true);
    });

    it('formats 503 as service unavailable', () => {
      const result = formatApiError(new Error('Service unavailable 503'));

      expect(result.message).toBe('Service temporarily unavailable');
      expect(result.retryable).toBe(true);
    });
  });

  describe('timeout errors', () => {
    it('formats timeout as request timed out', () => {
      const result = formatApiError(new Error('Request timeout'));

      expect(result.message).toBe('Request timed out');
      expect(result.suggestion).toContain('took too long');
      expect(result.retryable).toBe(true);
    });

    it('formats ETIMEDOUT as request timed out', () => {
      const result = formatApiError(new Error('connect ETIMEDOUT'));

      expect(result.message).toBe('Request timed out');
      expect(result.retryable).toBe(true);
    });
  });

  describe('unknown errors', () => {
    it('returns fallback for unknown Error', () => {
      const result = formatApiError(new Error('Something weird happened'));

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.suggestion).toContain('try again');
      expect(result.retryable).toBe(true);
      expect(result.details).toBe('Something weird happened');
    });

    it('handles non-Error objects', () => {
      const result = formatApiError('string error');

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.retryable).toBe(true);
      expect(result.details).toBe('string error');
    });

    it('handles null', () => {
      const result = formatApiError(null);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.retryable).toBe(true);
    });
  });
});
