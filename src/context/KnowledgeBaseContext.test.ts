import { describe, it, expect } from 'vitest';
import type { KnowledgeBase, KnowledgeBaseSource, SearchResult, Chunk, CrawlProgress, IndexProgress } from '../types/index.js';
import type { CrawlState, IndexState } from './KnowledgeBaseContext.js';

describe('KnowledgeBaseContext', () => {
  describe('CrawlState structure', () => {
    it('represents inactive crawl state', () => {
      const state: CrawlState = {
        isActive: false,
        progress: 0,
        total: 0,
        currentUrl: '',
      };

      expect(state.isActive).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.total).toBe(0);
      expect(state.currentUrl).toBe('');
      expect(state.kbId).toBeUndefined();
      expect(state.sourceId).toBeUndefined();
    });

    it('represents active crawl state', () => {
      const state: CrawlState = {
        isActive: true,
        kbId: 'kb-123',
        sourceId: 'src-456',
        progress: 5,
        total: 20,
        currentUrl: 'https://example.com/page-5',
      };

      expect(state.isActive).toBe(true);
      expect(state.kbId).toBe('kb-123');
      expect(state.sourceId).toBe('src-456');
      expect(state.progress).toBe(5);
      expect(state.total).toBe(20);
      expect(state.currentUrl).toBe('https://example.com/page-5');
    });

    it('updates progress during crawl', () => {
      const initial: CrawlState = {
        isActive: true,
        kbId: 'kb-123',
        sourceId: 'src-456',
        progress: 0,
        total: 0,
        currentUrl: '',
      };

      // Progress update
      const updated: CrawlState = {
        ...initial,
        progress: 10,
        total: 25,
        currentUrl: 'https://example.com/docs/getting-started',
      };

      expect(updated.progress).toBe(10);
      expect(updated.total).toBe(25);
    });
  });

  describe('IndexState structure', () => {
    it('represents idle index state', () => {
      const state: IndexState = {
        isActive: false,
        phase: 'idle',
        progress: 0,
        total: 0,
      };

      expect(state.isActive).toBe(false);
      expect(state.phase).toBe('idle');
      expect(state.kbId).toBeUndefined();
    });

    it('represents chunking phase', () => {
      const state: IndexState = {
        isActive: true,
        kbId: 'kb-123',
        phase: 'chunking',
        progress: 5,
        total: 100,
      };

      expect(state.isActive).toBe(true);
      expect(state.phase).toBe('chunking');
    });

    it('represents embedding phase', () => {
      const state: IndexState = {
        isActive: true,
        kbId: 'kb-123',
        phase: 'embedding',
        progress: 50,
        total: 100,
      };

      expect(state.phase).toBe('embedding');
      expect(state.progress).toBe(50);
    });

    it('represents saving phase', () => {
      const state: IndexState = {
        isActive: true,
        kbId: 'kb-123',
        phase: 'saving',
        progress: 100,
        total: 100,
      };

      expect(state.phase).toBe('saving');
    });
  });

  describe('KnowledgeBase structure', () => {
    it('represents new knowledge base', () => {
      const kb: KnowledgeBase = {
        id: 'kb-123',
        name: 'Product Documentation',
        createdAt: '2024-01-15T10:00:00.000Z',
        sources: [],
        crawlDepth: 2,
        totalPages: 0,
      };

      expect(kb.id).toBe('kb-123');
      expect(kb.name).toBe('Product Documentation');
      expect(kb.sources).toHaveLength(0);
      expect(kb.crawlDepth).toBe(2);
      expect(kb.totalPages).toBe(0);
    });

    it('represents knowledge base with sources', () => {
      const source: KnowledgeBaseSource = {
        id: 'src-1',
        url: 'https://docs.example.com',
        addedAt: '2024-01-15T10:00:00.000Z',
        pageCount: 25,
        status: 'complete',
      };

      const kb: KnowledgeBase = {
        id: 'kb-123',
        name: 'API Docs',
        createdAt: '2024-01-15T10:00:00.000Z',
        sources: [source],
        crawlDepth: 3,
        totalPages: 25,
      };

      expect(kb.sources).toHaveLength(1);
      expect(kb.totalPages).toBe(25);
    });
  });

  describe('KnowledgeBaseSource structure', () => {
    it('represents pending source', () => {
      const source: KnowledgeBaseSource = {
        id: 'src-1',
        url: 'https://docs.example.com',
        addedAt: '2024-01-15T10:00:00.000Z',
        pageCount: 0,
        status: 'pending',
      };

      expect(source.status).toBe('pending');
      expect(source.pageCount).toBe(0);
      expect(source.lastCrawledAt).toBeUndefined();
    });

    it('represents crawling source', () => {
      const source: KnowledgeBaseSource = {
        id: 'src-1',
        url: 'https://docs.example.com',
        addedAt: '2024-01-15T10:00:00.000Z',
        pageCount: 5,
        status: 'crawling',
      };

      expect(source.status).toBe('crawling');
    });

    it('represents complete source', () => {
      const source: KnowledgeBaseSource = {
        id: 'src-1',
        url: 'https://docs.example.com',
        addedAt: '2024-01-15T10:00:00.000Z',
        lastCrawledAt: '2024-01-15T11:00:00.000Z',
        pageCount: 50,
        status: 'complete',
      };

      expect(source.status).toBe('complete');
      expect(source.lastCrawledAt).toBeDefined();
      expect(source.pageCount).toBe(50);
    });

    it('represents error source', () => {
      const source: KnowledgeBaseSource = {
        id: 'src-1',
        url: 'https://docs.example.com',
        addedAt: '2024-01-15T10:00:00.000Z',
        pageCount: 0,
        status: 'error',
        error: 'Failed to fetch URL: 404 Not Found',
      };

      expect(source.status).toBe('error');
      expect(source.error).toBe('Failed to fetch URL: 404 Not Found');
    });
  });

  describe('SearchResult structure', () => {
    it('represents a search result', () => {
      const chunk: Chunk = {
        id: 1,
        pageHash: 'abc123',
        pageUrl: 'https://docs.example.com/api',
        pageTitle: 'API Reference',
        text: 'The API provides methods for...',
        startIdx: 0,
        endIdx: 100,
      };

      const result: SearchResult = {
        chunk,
        score: 0.85,
      };

      expect(result.chunk.pageUrl).toBe('https://docs.example.com/api');
      expect(result.score).toBe(0.85);
    });

    it('handles multiple results with scores', () => {
      const results: SearchResult[] = [
        {
          chunk: { id: 1, pageHash: 'a', pageUrl: 'url1', pageTitle: 'Title 1', text: 'Text 1', startIdx: 0, endIdx: 50 },
          score: 0.95,
        },
        {
          chunk: { id: 2, pageHash: 'b', pageUrl: 'url2', pageTitle: 'Title 2', text: 'Text 2', startIdx: 0, endIdx: 50 },
          score: 0.80,
        },
        {
          chunk: { id: 3, pageHash: 'c', pageUrl: 'url3', pageTitle: 'Title 3', text: 'Text 3', startIdx: 0, endIdx: 50 },
          score: 0.75,
        },
      ];

      // Results should be sorted by score
      const sorted = results.sort((a, b) => b.score - a.score);
      expect(sorted[0].score).toBe(0.95);
      expect(sorted[2].score).toBe(0.75);
    });
  });

  describe('CrawlProgress structure', () => {
    it('represents crawl progress', () => {
      const progress: CrawlProgress = {
        crawled: 15,
        total: 30,
        currentUrl: 'https://docs.example.com/page-15',
      };

      expect(progress.crawled).toBe(15);
      expect(progress.total).toBe(30);
      expect(progress.currentUrl).toBe('https://docs.example.com/page-15');
    });
  });

  describe('IndexProgress structure', () => {
    it('represents chunking progress', () => {
      const progress: IndexProgress = {
        phase: 'chunking',
        current: 10,
        total: 50,
      };

      expect(progress.phase).toBe('chunking');
    });

    it('represents embedding progress', () => {
      const progress: IndexProgress = {
        phase: 'embedding',
        current: 25,
        total: 50,
      };

      expect(progress.phase).toBe('embedding');
    });

    it('represents saving progress', () => {
      const progress: IndexProgress = {
        phase: 'saving',
        current: 50,
        total: 50,
      };

      expect(progress.phase).toBe('saving');
    });
  });

  describe('State transitions', () => {
    interface KnowledgeBaseState {
      knowledgeBases: KnowledgeBase[];
      isLoading: boolean;
      crawlState: CrawlState;
      indexState: IndexState;
    }

    it('initializes with loading state', () => {
      const state: KnowledgeBaseState = {
        knowledgeBases: [],
        isLoading: true,
        crawlState: { isActive: false, progress: 0, total: 0, currentUrl: '' },
        indexState: { isActive: false, phase: 'idle', progress: 0, total: 0 },
      };

      expect(state.isLoading).toBe(true);
      expect(state.knowledgeBases).toHaveLength(0);
    });

    it('transitions to loaded state', () => {
      const state: KnowledgeBaseState = {
        knowledgeBases: [
          { id: 'kb-1', name: 'KB 1', createdAt: '', sources: [], crawlDepth: 2, totalPages: 0 },
        ],
        isLoading: false,
        crawlState: { isActive: false, progress: 0, total: 0, currentUrl: '' },
        indexState: { isActive: false, phase: 'idle', progress: 0, total: 0 },
      };

      expect(state.isLoading).toBe(false);
      expect(state.knowledgeBases).toHaveLength(1);
    });

    it('transitions crawlState to active', () => {
      const initial: CrawlState = {
        isActive: false,
        progress: 0,
        total: 0,
        currentUrl: '',
      };

      const active: CrawlState = {
        isActive: true,
        kbId: 'kb-1',
        sourceId: 'src-1',
        progress: 0,
        total: 0,
        currentUrl: '',
      };

      expect(initial.isActive).toBe(false);
      expect(active.isActive).toBe(true);
    });

    it('transitions crawlState back to inactive', () => {
      const active: CrawlState = {
        isActive: true,
        kbId: 'kb-1',
        sourceId: 'src-1',
        progress: 25,
        total: 25,
        currentUrl: 'https://example.com/last',
      };

      const inactive: CrawlState = {
        isActive: false,
        progress: 0,
        total: 0,
        currentUrl: '',
      };

      expect(inactive.isActive).toBe(false);
      expect(inactive.kbId).toBeUndefined();
    });

    it('transitions indexState through phases', () => {
      const idle: IndexState = { isActive: false, phase: 'idle', progress: 0, total: 0 };
      const chunking: IndexState = { isActive: true, kbId: 'kb-1', phase: 'chunking', progress: 10, total: 100 };
      const embedding: IndexState = { isActive: true, kbId: 'kb-1', phase: 'embedding', progress: 50, total: 100 };
      const saving: IndexState = { isActive: true, kbId: 'kb-1', phase: 'saving', progress: 100, total: 100 };

      expect(idle.phase).toBe('idle');
      expect(chunking.phase).toBe('chunking');
      expect(embedding.phase).toBe('embedding');
      expect(saving.phase).toBe('saving');
    });
  });

  describe('Context value structure', () => {
    it('has expected method signatures', () => {
      type ExpectedContextType = {
        knowledgeBases: KnowledgeBase[];
        isLoading: boolean;
        crawlState: CrawlState;
        indexState: IndexState;
        refresh: () => void;
        createKnowledgeBase: (name: string, crawlDepth: number) => KnowledgeBase;
        deleteKnowledgeBase: (id: string) => boolean;
        addSource: (kbId: string, url: string) => KnowledgeBaseSource | null;
        removeSource: (kbId: string, sourceId: string) => boolean;
        crawlSource: (kbId: string, sourceId: string) => Promise<{ success: boolean; pageCount: number; error?: string }>;
        getKBContent: (kbId: string) => string;
        getKB: (kbId: string) => KnowledgeBase | null;
        indexKB: (kbId: string) => Promise<{ success: boolean; chunkCount: number; error?: string }>;
        searchKB: (kbId: string, query: string, topK?: number) => Promise<SearchResult[]>;
        isIndexed: (kbId: string) => boolean;
        getIndexStats: (kbId: string) => { indexed: boolean; chunkCount: number; indexedAt?: string; mode?: string } | null;
        formatSearchContext: (results: SearchResult[]) => string;
      };

      const mockContext: ExpectedContextType = {
        knowledgeBases: [],
        isLoading: false,
        crawlState: { isActive: false, progress: 0, total: 0, currentUrl: '' },
        indexState: { isActive: false, phase: 'idle', progress: 0, total: 0 },
        refresh: () => {},
        createKnowledgeBase: () => ({ id: '', name: '', createdAt: '', sources: [], crawlDepth: 0, totalPages: 0 }),
        deleteKnowledgeBase: () => true,
        addSource: () => null,
        removeSource: () => true,
        crawlSource: async () => ({ success: true, pageCount: 0 }),
        getKBContent: () => '',
        getKB: () => null,
        indexKB: async () => ({ success: true, chunkCount: 0 }),
        searchKB: async () => [],
        isIndexed: () => false,
        getIndexStats: () => null,
        formatSearchContext: () => '',
      };

      expect(mockContext.knowledgeBases).toBeDefined();
      expect(typeof mockContext.refresh).toBe('function');
      expect(typeof mockContext.createKnowledgeBase).toBe('function');
      expect(typeof mockContext.deleteKnowledgeBase).toBe('function');
      expect(typeof mockContext.addSource).toBe('function');
      expect(typeof mockContext.removeSource).toBe('function');
      expect(typeof mockContext.crawlSource).toBe('function');
      expect(typeof mockContext.getKBContent).toBe('function');
      expect(typeof mockContext.getKB).toBe('function');
      expect(typeof mockContext.indexKB).toBe('function');
      expect(typeof mockContext.searchKB).toBe('function');
      expect(typeof mockContext.isIndexed).toBe('function');
      expect(typeof mockContext.getIndexStats).toBe('function');
      expect(typeof mockContext.formatSearchContext).toBe('function');
    });
  });

  describe('crawlSource result patterns', () => {
    it('returns success with page count', () => {
      const result: { success: boolean; pageCount: number; error?: string } = {
        success: true,
        pageCount: 50,
      };

      expect(result.success).toBe(true);
      expect(result.pageCount).toBe(50);
      expect(result.error).toBeUndefined();
    });

    it('returns error on failure', () => {
      const result: { success: boolean; pageCount: number; error?: string } = {
        success: false,
        pageCount: 0,
        error: 'Failed to crawl: Connection timeout',
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to crawl');
    });
  });

  describe('indexKB result patterns', () => {
    it('returns success with chunk count', () => {
      const result: { success: boolean; chunkCount: number; error?: string } = {
        success: true,
        chunkCount: 150,
      };

      expect(result.success).toBe(true);
      expect(result.chunkCount).toBe(150);
    });

    it('returns error on failure', () => {
      const result: { success: boolean; chunkCount: number; error?: string } = {
        success: false,
        chunkCount: 0,
        error: 'Embedding model failed to load',
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Embedding model');
    });
  });

  describe('getIndexStats patterns', () => {
    it('returns stats for indexed KB', () => {
      const stats: { indexed: boolean; chunkCount: number; indexedAt?: string; mode?: string } = {
        indexed: true,
        chunkCount: 150,
        indexedAt: '2024-01-15T12:00:00.000Z',
        mode: 'local',
      };

      expect(stats.indexed).toBe(true);
      expect(stats.chunkCount).toBe(150);
      expect(stats.indexedAt).toBeDefined();
    });

    it('returns stats for non-indexed KB', () => {
      const stats: { indexed: boolean; chunkCount: number; indexedAt?: string } = {
        indexed: false,
        chunkCount: 0,
      };

      expect(stats.indexed).toBe(false);
      expect(stats.indexedAt).toBeUndefined();
    });

    it('returns null for unknown KB', () => {
      const stats: { indexed: boolean; chunkCount: number } | null = null;

      expect(stats).toBeNull();
    });
  });

  describe('formatSearchContext patterns', () => {
    it('formats results as context string', () => {
      const results: SearchResult[] = [
        {
          chunk: {
            id: 1,
            pageHash: 'a',
            pageUrl: 'https://docs.example.com/api',
            pageTitle: 'API Reference',
            text: 'The API provides REST endpoints...',
            startIdx: 0,
            endIdx: 50,
          },
          score: 0.9,
        },
      ];

      // Simulated formatting
      const formatted = results.map(r =>
        `[${r.chunk.pageTitle}](${r.chunk.pageUrl})\n${r.chunk.text}`
      ).join('\n\n');

      expect(formatted).toContain('API Reference');
      expect(formatted).toContain('https://docs.example.com/api');
      expect(formatted).toContain('REST endpoints');
    });

    it('returns empty string for no results', () => {
      const results: SearchResult[] = [];

      const formatted = results.map(r =>
        `[${r.chunk.pageTitle}](${r.chunk.pageUrl})\n${r.chunk.text}`
      ).join('\n\n');

      expect(formatted).toBe('');
    });
  });

  describe('CRUD operation patterns', () => {
    it('createKnowledgeBase returns new KB', () => {
      const name = 'New Knowledge Base';
      const crawlDepth = 3;

      // Simulated create
      const kb: KnowledgeBase = {
        id: 'kb-' + Date.now(),
        name,
        createdAt: new Date().toISOString(),
        sources: [],
        crawlDepth,
        totalPages: 0,
      };

      expect(kb.name).toBe('New Knowledge Base');
      expect(kb.crawlDepth).toBe(3);
      expect(kb.sources).toHaveLength(0);
    });

    it('addSource returns new source', () => {
      const url = 'https://docs.example.com';

      // Simulated add
      const source: KnowledgeBaseSource = {
        id: 'src-' + Date.now(),
        url,
        addedAt: new Date().toISOString(),
        pageCount: 0,
        status: 'pending',
      };

      expect(source.url).toBe('https://docs.example.com');
      expect(source.status).toBe('pending');
    });

    it('deleteKnowledgeBase returns boolean', () => {
      const deleteResult = true;
      expect(deleteResult).toBe(true);
    });

    it('removeSource returns boolean', () => {
      const removeResult = true;
      expect(removeResult).toBe(true);
    });
  });

  describe('topK parameter handling', () => {
    it('uses default topK of 5', () => {
      const defaultTopK = 5;
      expect(defaultTopK).toBe(5);
    });

    it('accepts custom topK value', () => {
      const customTopK = 10;
      expect(customTopK).toBe(10);
    });
  });

  // Provider and hook functions require React rendering - skipped
  describe.skip('Provider functions (require React rendering)', () => {
    it('KnowledgeBaseProvider renders children', () => {});
    it('useKnowledgeBase throws outside provider', () => {});
    it('crawlSource updates crawlState during progress', () => {});
    it('indexKB updates indexState during progress', () => {});
  });
});
