export type Screen = 'main' | 'copilot-connect' | 'qa-plan';

export interface MenuItem {
  label: string;
  value: Screen;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export type TokenSource = 'cli' | 'vscode' | 'jetbrains' | 'unknown';

export interface CopilotConfig {
  tokenSource: TokenSource;
  lastVerified?: string;
}
