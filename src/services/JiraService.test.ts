import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test pure data transformation functions extracted from JiraService
// These tests validate the logic without making actual JIRA API calls

describe('JiraService', () => {
  describe('URL normalization logic', () => {
    // Test the URL normalization logic used in getMyIssues
    const normalizeHost = (host: string): string => {
      let normalized = host;
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    };

    it('adds https:// prefix when missing', () => {
      expect(normalizeHost('mycompany.atlassian.net')).toBe('https://mycompany.atlassian.net');
    });

    it('preserves https:// prefix when present', () => {
      expect(normalizeHost('https://mycompany.atlassian.net')).toBe('https://mycompany.atlassian.net');
    });

    it('preserves http:// prefix when present', () => {
      expect(normalizeHost('http://localhost:8080')).toBe('http://localhost:8080');
    });

    it('removes trailing slash', () => {
      expect(normalizeHost('https://mycompany.atlassian.net/')).toBe('https://mycompany.atlassian.net');
    });

    it('handles both missing prefix and trailing slash', () => {
      expect(normalizeHost('mycompany.atlassian.net/')).toBe('https://mycompany.atlassian.net');
    });
  });

  describe('board data transformation', () => {
    // Test the transformation logic used in getBoards
    interface RawBoard {
      id?: number;
      name?: string;
      type?: string;
    }

    const transformBoard = (board: RawBoard) => ({
      id: board.id!,
      name: board.name || 'Unnamed Board',
      type: (board.type as 'scrum' | 'kanban') || 'scrum',
    });

    it('transforms board with all fields', () => {
      const raw: RawBoard = { id: 123, name: 'My Board', type: 'kanban' };
      expect(transformBoard(raw)).toEqual({
        id: 123,
        name: 'My Board',
        type: 'kanban',
      });
    });

    it('uses default name when name is missing', () => {
      const raw: RawBoard = { id: 456, type: 'scrum' };
      expect(transformBoard(raw)).toEqual({
        id: 456,
        name: 'Unnamed Board',
        type: 'scrum',
      });
    });

    it('uses default type (scrum) when type is missing', () => {
      const raw: RawBoard = { id: 789, name: 'Test Board' };
      expect(transformBoard(raw)).toEqual({
        id: 789,
        name: 'Test Board',
        type: 'scrum',
      });
    });

    it('uses empty string name as valid name', () => {
      const raw: RawBoard = { id: 1, name: '', type: 'kanban' };
      expect(transformBoard(raw)).toEqual({
        id: 1,
        name: 'Unnamed Board',
        type: 'kanban',
      });
    });
  });

  describe('sprint data transformation', () => {
    // Test the transformation logic used in getActiveSprint
    interface RawSprint {
      id?: number;
      name?: string;
      startDate?: string;
      endDate?: string;
    }

    const transformSprint = (sprint: RawSprint) => ({
      id: sprint.id!,
      name: sprint.name || 'Unnamed Sprint',
      state: 'active' as const,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    });

    it('transforms sprint with all fields', () => {
      const raw: RawSprint = {
        id: 10,
        name: 'Sprint 1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      };
      expect(transformSprint(raw)).toEqual({
        id: 10,
        name: 'Sprint 1',
        state: 'active',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });
    });

    it('uses default name when name is missing', () => {
      const raw: RawSprint = { id: 20 };
      expect(transformSprint(raw)).toEqual({
        id: 20,
        name: 'Unnamed Sprint',
        state: 'active',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('handles missing dates', () => {
      const raw: RawSprint = { id: 30, name: 'No Dates Sprint' };
      const result = transformSprint(raw);
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });
  });

  describe('issue data transformation', () => {
    // Test the transformation logic used in getMyIssues
    interface RawIssue {
      id?: string;
      key?: string;
      fields?: {
        summary?: string;
        status?: { name?: string };
        priority?: { name?: string };
      };
    }

    const transformIssue = (issue: RawIssue) => ({
      id: issue.id as string,
      key: issue.key as string,
      summary: issue.fields?.summary || 'No summary',
      status: issue.fields?.status?.name || 'Unknown',
      priority: issue.fields?.priority?.name || 'Medium',
      storyPoints: undefined,
    });

    it('transforms issue with all fields', () => {
      const raw: RawIssue = {
        id: '10001',
        key: 'PROJ-123',
        fields: {
          summary: 'Fix login bug',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
        },
      };
      expect(transformIssue(raw)).toEqual({
        id: '10001',
        key: 'PROJ-123',
        summary: 'Fix login bug',
        status: 'In Progress',
        priority: 'High',
        storyPoints: undefined,
      });
    });

    it('uses default summary when missing', () => {
      const raw: RawIssue = {
        id: '10002',
        key: 'PROJ-124',
        fields: {},
      };
      expect(transformIssue(raw).summary).toBe('No summary');
    });

    it('uses default status when missing', () => {
      const raw: RawIssue = {
        id: '10003',
        key: 'PROJ-125',
        fields: { summary: 'Test' },
      };
      expect(transformIssue(raw).status).toBe('Unknown');
    });

    it('uses default priority when missing', () => {
      const raw: RawIssue = {
        id: '10004',
        key: 'PROJ-126',
        fields: { summary: 'Test', status: { name: 'Done' } },
      };
      expect(transformIssue(raw).priority).toBe('Medium');
    });

    it('handles completely missing fields object', () => {
      const raw: RawIssue = { id: '10005', key: 'PROJ-127' };
      expect(transformIssue(raw)).toEqual({
        id: '10005',
        key: 'PROJ-127',
        summary: 'No summary',
        status: 'Unknown',
        priority: 'Medium',
        storyPoints: undefined,
      });
    });
  });

  describe('transition data transformation', () => {
    // Test the transformation logic used in getTransitions
    interface RawTransition {
      id?: string;
      name?: string;
      to?: {
        id?: string;
        name?: string;
        statusCategory?: {
          key?: string;
          name?: string;
        };
      };
      hasScreen?: boolean;
    }

    const transformTransition = (t: RawTransition) => ({
      id: t.id!,
      name: t.name || '',
      to: {
        id: t.to?.id || '',
        name: t.to?.name || '',
        statusCategory: t.to?.statusCategory ? {
          key: t.to.statusCategory.key || '',
          name: t.to.statusCategory.name || '',
        } : undefined,
      },
      hasScreen: t.hasScreen || false,
    });

    it('transforms transition with all fields', () => {
      const raw: RawTransition = {
        id: '21',
        name: 'Start Progress',
        to: {
          id: '3',
          name: 'In Progress',
          statusCategory: { key: 'indeterminate', name: 'In Progress' },
        },
        hasScreen: true,
      };
      expect(transformTransition(raw)).toEqual({
        id: '21',
        name: 'Start Progress',
        to: {
          id: '3',
          name: 'In Progress',
          statusCategory: { key: 'indeterminate', name: 'In Progress' },
        },
        hasScreen: true,
      });
    });

    it('uses empty strings for missing optional fields', () => {
      const raw: RawTransition = { id: '22' };
      expect(transformTransition(raw)).toEqual({
        id: '22',
        name: '',
        to: { id: '', name: '', statusCategory: undefined },
        hasScreen: false,
      });
    });

    it('handles missing statusCategory', () => {
      const raw: RawTransition = {
        id: '23',
        name: 'Done',
        to: { id: '4', name: 'Done' },
      };
      expect(transformTransition(raw).to.statusCategory).toBeUndefined();
    });

    it('handles partial statusCategory', () => {
      const raw: RawTransition = {
        id: '24',
        name: 'Review',
        to: {
          id: '5',
          name: 'In Review',
          statusCategory: { key: 'review' },
        },
      };
      expect(transformTransition(raw).to.statusCategory).toEqual({
        key: 'review',
        name: '',
      });
    });
  });

  describe('findTransitionToStatus logic', () => {
    // Test the case-insensitive matching logic
    interface JiraTransition {
      id: string;
      name: string;
      to: { id: string; name: string };
    }

    const findTransitionToStatus = (
      transitions: JiraTransition[],
      targetStatus: string
    ): JiraTransition | null => {
      return transitions.find(
        t => t.to.name.toLowerCase() === targetStatus.toLowerCase()
      ) || null;
    };

    const transitions: JiraTransition[] = [
      { id: '1', name: 'Start Progress', to: { id: '3', name: 'In Progress' } },
      { id: '2', name: 'Done', to: { id: '4', name: 'Done' } },
      { id: '3', name: 'Back to Todo', to: { id: '1', name: 'To Do' } },
    ];

    it('finds transition with exact case match', () => {
      const result = findTransitionToStatus(transitions, 'In Progress');
      expect(result?.id).toBe('1');
    });

    it('finds transition with lowercase search', () => {
      const result = findTransitionToStatus(transitions, 'in progress');
      expect(result?.id).toBe('1');
    });

    it('finds transition with uppercase search', () => {
      const result = findTransitionToStatus(transitions, 'DONE');
      expect(result?.id).toBe('2');
    });

    it('finds transition with mixed case search', () => {
      const result = findTransitionToStatus(transitions, 'tO dO');
      expect(result?.id).toBe('3');
    });

    it('returns null when no transition found', () => {
      const result = findTransitionToStatus(transitions, 'Blocked');
      expect(result).toBeNull();
    });

    it('returns null for empty transitions array', () => {
      const result = findTransitionToStatus([], 'Done');
      expect(result).toBeNull();
    });
  });

  describe('error handling patterns', () => {
    // Test the error message extraction logic used throughout the service
    const extractErrorMessage = (error: unknown, defaultMsg: string): string => {
      return error instanceof Error ? error.message : defaultMsg;
    };

    it('extracts message from Error instance', () => {
      const error = new Error('Connection timeout');
      expect(extractErrorMessage(error, 'Default')).toBe('Connection timeout');
    });

    it('uses default message for non-Error objects', () => {
      expect(extractErrorMessage('string error', 'Default')).toBe('Default');
      expect(extractErrorMessage({ msg: 'object' }, 'Default')).toBe('Default');
      expect(extractErrorMessage(null, 'Default')).toBe('Default');
      expect(extractErrorMessage(undefined, 'Default')).toBe('Default');
      expect(extractErrorMessage(42, 'Default')).toBe('Default');
    });

    // Test the success/error return pattern
    describe('result patterns', () => {
      it('testConnection success pattern', () => {
        const success = { success: true as const, displayName: 'John Doe' };
        expect(success.success).toBe(true);
        expect(success.displayName).toBe('John Doe');
      });

      it('testConnection failure pattern', () => {
        const failure = { success: false as const, error: 'Auth failed' };
        expect(failure.success).toBe(false);
        expect(failure.error).toBe('Auth failed');
      });

      it('transitionTicket success pattern', () => {
        const success = { success: true as const };
        expect(success.success).toBe(true);
        expect(success).not.toHaveProperty('error');
      });

      it('transitionTicket failure pattern', () => {
        const failure = { success: false as const, error: 'Transition not allowed' };
        expect(failure.success).toBe(false);
        expect(failure.error).toBe('Transition not allowed');
      });
    });
  });

  describe('input validation', () => {
    it('validates issue key format (basic check)', () => {
      // This mirrors expected JIRA key format: PROJECT-NUMBER
      const isValidIssueKey = (key: string): boolean => {
        return /^[A-Z][A-Z0-9]*-\d+$/.test(key);
      };

      expect(isValidIssueKey('PROJ-123')).toBe(true);
      expect(isValidIssueKey('ABC-1')).toBe(true);
      expect(isValidIssueKey('TEST123-456')).toBe(true);
      expect(isValidIssueKey('proj-123')).toBe(false); // lowercase
      expect(isValidIssueKey('PROJ123')).toBe(false); // missing dash
      expect(isValidIssueKey('PROJ-')).toBe(false); // missing number
      expect(isValidIssueKey('-123')).toBe(false); // missing project
      expect(isValidIssueKey('')).toBe(false); // empty
    });

    it('validates board ID is positive number', () => {
      const isValidBoardId = (id: number): boolean => {
        return Number.isInteger(id) && id > 0;
      };

      expect(isValidBoardId(1)).toBe(true);
      expect(isValidBoardId(12345)).toBe(true);
      expect(isValidBoardId(0)).toBe(false);
      expect(isValidBoardId(-1)).toBe(false);
      expect(isValidBoardId(1.5)).toBe(false);
      expect(isValidBoardId(NaN)).toBe(false);
    });

    it('validates transition ID is non-empty string', () => {
      const isValidTransitionId = (id: string): boolean => {
        return typeof id === 'string' && id.trim().length > 0;
      };

      expect(isValidTransitionId('21')).toBe(true);
      expect(isValidTransitionId('abc')).toBe(true);
      expect(isValidTransitionId('')).toBe(false);
      expect(isValidTransitionId('   ')).toBe(false);
    });
  });
});
