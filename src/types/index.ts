export type Screen = 'main' | 'copilot-connect' | 'qa-plan' | 'git-changes' | 'knowledge-base' | 'model-select' | 'test-watcher' | 'settings' | 'sprint' | 'workflow' | 'plan-generator' | 'meta-init';

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

// Test Watcher Types
export interface WatcherConfig {
  globPattern: string;
  outputPattern: 'colocated' | 'separate';
  outputDir?: string;  // Only used when outputPattern is 'separate'
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: string;
}

export interface TestRule {
  source: 'meeseeks' | 'agents' | 'claude';
  content: string;
  filePath: string;
}

export interface GeneratedTest {
  sourceFile: string;
  testFile: string;
  content: string;
  generatedAt: string;
}

export interface WatcherStatus {
  isWatching: boolean;
  watchedFiles: number;
  lastEvent?: FileChangeEvent;
  lastGenerated?: GeneratedTest;
}

// Context Condensing Types
export interface ContextAnalysis {
  systemTokens: number;
  userTokens: number;
  totalTokens: number;
  availableTokens: number;
  exceedsLimit: boolean;
  overflowTokens: number;
}

export interface CondenseResult {
  condensed: boolean;
  strategy: 'none' | 'reduce-kb' | 'truncate-diff' | 'both';
  originalTokens: number;
  finalTokens: number;
  systemPrompt: string;
  userPrompt: string;
  warnings: string[];
}

export interface CondenseOptions {
  modelId: string;
  systemPrompt: string;
  userPrompt: string;
  gitDiff: string;
  kbContent: string;
  searchResultCount: number;
}

// Credential Management Types
export type ServiceId = 'jira' | 'squadcast' | 'solarwinds' | 'grafana';

export interface ServiceCredential {
  serviceId: ServiceId;
  fields: Record<string, string>;  // e.g., { url: '...', token: '...' }
  isConfigured: boolean;
  lastVerified?: string;
}

export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  description: string;
  fields: ServiceFieldDefinition[];
  testConnection: (creds: Record<string, string>) => Promise<{success: boolean; error?: string}>;
}

export interface ServiceFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  validation?: (value: string) => string | null;  // Returns error message or null
}

// Error Types
export interface ActionableError {
  message: string;
  suggestion?: string;
  retryable: boolean;
  details?: string;
}

// JIRA Types
export interface JiraTicket {
  id: string;
  key: string;           // e.g., 'PROJ-123'
  summary: string;
  status: string;        // e.g., 'In Progress', 'To Do'
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | string;
  storyPoints?: number;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: 'scrum' | 'kanban';
}

// Plan Generation Types
export type PlanType = 'impl' | 'verify';

export interface PlanMetadata {
  ticketKey: string;
  ticketSummary: string;
  planType: PlanType;
  generatedAt: string;
  model: string;
  kbUsed?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options: string[];  // Pre-generated choices from AI
  allowOther: boolean; // Always true per decisions
  answer?: string;
}

export interface ExistingPlans {
  impl: boolean;
  verify: boolean;
  implPath?: string;
  verifyPath?: string;
}

// Meta Prompting Types
export type MetaPromptExtension = 'roocode' | 'kilocode';
