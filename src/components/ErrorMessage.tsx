import React from 'react';
import { Box, Text } from 'ink';
import type { ActionableError } from '../types/index.js';

const palette = {
  red: '#FF4444',
  yellow: '#FFD700',
  dim: '#666666',
};

interface ErrorMessageProps {
  error: ActionableError;
  showRetryHint?: boolean;
  showDetails?: boolean;
}

/**
 * Format API/network errors into actionable messages
 */
export const formatApiError = (error: unknown): ActionableError => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Network errors
    if (msg.includes('enotfound') || msg.includes('network') || msg.includes('econnrefused')) {
      return {
        message: 'Unable to connect to the service',
        suggestion: 'Check your internet connection and try again',
        retryable: true,
      };
    }

    // Auth errors
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid token')) {
      return {
        message: 'Authentication failed',
        suggestion: 'Your credentials may be invalid or expired. Please re-enter them.',
        retryable: false,
      };
    }

    // Forbidden
    if (msg.includes('403') || msg.includes('forbidden')) {
      return {
        message: 'Access denied',
        suggestion: 'Your account may not have permission for this action.',
        retryable: false,
      };
    }

    // Rate limiting
    if (msg.includes('429') || msg.includes('rate limit')) {
      return {
        message: 'Too many requests',
        suggestion: 'Please wait a moment before trying again',
        retryable: true,
      };
    }

    // Server errors
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return {
        message: 'Service temporarily unavailable',
        suggestion: 'The service may be experiencing issues. Try again in a few minutes.',
        retryable: true,
      };
    }

    // Timeout
    if (msg.includes('timeout') || msg.includes('etimedout')) {
      return {
        message: 'Request timed out',
        suggestion: 'The service took too long to respond. Try again.',
        retryable: true,
      };
    }
  }

  // Fallback for unknown errors
  return {
    message: 'An unexpected error occurred',
    suggestion: 'Please try again. If the problem persists, check your configuration.',
    retryable: true,
    details: error instanceof Error ? error.message : String(error),
  };
};

/**
 * Reusable error display component
 * Shows user-friendly message with actionable suggestion
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  showRetryHint = true,
  showDetails = false,
}) => {
  return (
    <Box flexDirection="column">
      <Text color={palette.red} bold>{error.message}</Text>

      {error.suggestion && (
        <Box marginTop={1}>
          <Text color={palette.dim}>{error.suggestion}</Text>
        </Box>
      )}

      {showDetails && error.details && (
        <Box marginTop={1}>
          <Text color={palette.dim} dimColor>Details: {error.details}</Text>
        </Box>
      )}

      {showRetryHint && (
        <Box marginTop={1}>
          {error.retryable && <Text color={palette.yellow}>Press 'r' to retry</Text>}
          {error.retryable && <Text color={palette.dim}> | </Text>}
          <Text color={palette.dim}>Esc to go back</Text>
        </Box>
      )}
    </Box>
  );
};

export type { ActionableError };
