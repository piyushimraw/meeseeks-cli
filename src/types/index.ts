export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes';

export interface MenuItem {
  label: string;
  value: Screen;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export type TokenSource = 'cli' | 'vscode' | 'unknown';

export interface CopilotConfig {
  tokenSource: TokenSource;
  lastVerified?: string;
}
