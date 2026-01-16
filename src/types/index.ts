export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base';

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

// Knowledge Base Types
export interface KnowledgeBaseSource {
  id: string;
  url: string;
  addedAt: string;
  lastCrawledAt?: string;
  pageCount: number;
  status: 'pending' | 'crawling' | 'complete' | 'error';
  error?: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: string;
  sources: KnowledgeBaseSource[];
  crawlDepth: number;
  totalPages: number;
}

export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  timeout: number;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  links: string[];
}

export interface CrawlProgress {
  crawled: number;
  total: number;
  currentUrl: string;
}
