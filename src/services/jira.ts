import { AgileClient, Version2Client, Version3Client } from 'jira.js';
import axios from 'axios';
import type { JiraTicket, JiraSprint, JiraBoard } from '../types/index.js';

interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

export class JiraService {
  private agileClient: AgileClient;
  private v2Client: Version2Client;
  private v3Client: Version3Client;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
    const clientConfig = {
      host: config.host,
      authentication: {
        basic: {
          email: config.email,
          apiToken: config.apiToken,
        },
      },
    };
    this.agileClient = new AgileClient(clientConfig);
    this.v2Client = new Version2Client(clientConfig);
    this.v3Client = new Version3Client(clientConfig);
  }

  /**
   * Test connection by fetching current user
   */
  async testConnection(): Promise<{ success: boolean; error?: string; displayName?: string }> {
    try {
      const user = await this.v3Client.myself.getCurrentUser();
      return { success: true, displayName: user.displayName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get all boards the user has access to (scrum and kanban)
   */
  async getBoards(): Promise<JiraBoard[]> {
    try {
      const response = await this.agileClient.board.getAllBoards({});
      return (response.values || []).map(board => ({
        id: board.id!,
        name: board.name || 'Unnamed Board',
        type: (board.type as 'scrum' | 'kanban') || 'scrum',
      }));
    } catch (error) {
      console.error('Failed to fetch boards:', error);
      return [];
    }
  }

  /**
   * Get active sprint for a board
   */
  async getActiveSprint(boardId: number): Promise<JiraSprint | null> {
    try {
      const response = await this.agileClient.board.getAllSprints({
        boardId,
        state: 'active',
      });
      const sprint = response.values?.[0];
      if (!sprint) return null;

      return {
        id: sprint.id!,
        name: sprint.name || 'Unnamed Sprint',
        state: 'active',
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      };
    } catch (error) {
      console.error('Failed to fetch active sprint:', error);
      return null;
    }
  }

  /**
   * Get all tickets assigned to current user (across all projects/sprints)
   * Uses the new /rest/api/3/search/jql endpoint (old /search was deprecated Oct 2025)
   * See: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-get
   */
  async getMyIssues(): Promise<JiraTicket[]> {
    try {
      // Build the base URL properly
      let host = this.config.host;
      if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = `https://${host}`;
      }
      if (host.endsWith('/')) {
        host = host.slice(0, -1);
      }

      // Use the new /search/jql endpoint
      const jql = 'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC';
      const fields = 'summary,status,priority';

      const response = await axios.get(`${host}/rest/api/3/search/jql`, {
        params: {
          jql,
          fields,
          maxResults: 50,
        },
        auth: {
          username: this.config.email,
          password: this.config.apiToken,
        },
        headers: {
          'Accept': 'application/json',
        },
      });

      const issues = response.data.issues || [];
      return issues.map((issue: Record<string, unknown>) => ({
        id: issue.id as string,
        key: issue.key as string,
        summary: ((issue.fields as Record<string, unknown>)?.summary as string) || 'No summary',
        status: (((issue.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name as string) || 'Unknown',
        priority: (((issue.fields as Record<string, unknown>)?.priority as Record<string, unknown>)?.name as string) || 'Medium',
        storyPoints: undefined,
      }));
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create JiraService instance
 * Not a singleton because credentials may change
 */
export const createJiraService = (config: JiraConfig): JiraService => {
  return new JiraService(config);
};
