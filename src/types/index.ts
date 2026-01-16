export type Screen = 'main' | 'github-connect' | 'qa-plan';

export interface MenuItem {
  label: string;
  value: Screen;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export interface GitHubUser {
  login: string;
  id: number;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export interface CopilotVerificationResult {
  hasAccess: boolean;
  error?: string;
}

export interface GitHubVerificationResult {
  success: boolean;
  user?: GitHubUser;
  copilot?: CopilotVerificationResult;
  error?: string;
}
