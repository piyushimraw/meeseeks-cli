import { AgileClient, Version3Client } from 'jira.js';
import type { JiraTicket, JiraSprint, JiraBoard } from '../types/index.js';

interface JiraConfig {
  host: string;
  email: string;
  apiToken: string;
}

export class JiraService {
  private agileClient: AgileClient;
  private v3Client: Version3Client;

  constructor(config: JiraConfig) {
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
   */
  async getMyIssues(): Promise<JiraTicket[]> {
    try {
      const response = await this.v3Client.issueSearch.searchForIssuesUsingJql({
        jql: 'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC',
        fields: ['summary', 'status', 'priority'],
        maxResults: 50,
      });

      return (response.issues || []).map(issue => ({
        id: issue.id!,
        key: issue.key!,
        summary: (issue.fields as Record<string, unknown>)?.summary as string || 'No summary',
        status: ((issue.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name as string || 'Unknown',
        priority: ((issue.fields as Record<string, unknown>)?.priority as Record<string, unknown>)?.name as string || 'Medium',
        storyPoints: undefined,
      }));
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      return [];
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
