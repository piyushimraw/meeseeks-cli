export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base' | 'model-select';

export interface MenuItem {
  label: string;
  value: Screen;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export type TokenSource = 'cli' | 'vscode' | 'unknown';

// Copilot Model Types
export interface CopilotModel {
  id: string;        // e.g., 'gpt-4o'
  name: string;      // e.g., 'GPT-4o'
  vendor?: string;   // e.g., 'OpenAI', 'Anthropic'
}

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

// RAG Types
export interface Chunk {
  id: number;
  pageHash: string;
  pageUrl: string;
  pageTitle: string;
  text: string;
  startIdx: number;
  endIdx: number;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

export interface ChunkIndex {
  model: string;
  dimensions: number;
  chunks: Chunk[];
}

export interface IndexProgress {
  phase: 'chunking' | 'embedding' | 'saving';
  current: number;
  total: number;
}
