import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type {KnowledgeBase, KnowledgeBaseSource, PageContent, CrawlProgress, IndexProgress, SearchResult} from '../types/index.js';
import {crawlWebsite, isValidUrl} from './crawler.js';
import {
  indexKnowledgeBase as indexKB,
  searchKnowledgeBase as searchKB,
  isIndexed as checkIndexed,
  getIndexStats,
  clearIndex,
  formatSearchResultsAsContext,
} from './rag.js';

const KB_DIR = path.join(os.homedir(), '.meeseeks', 'knowledge');

// Maximum content size for LLM context (100KB)
const MAX_CONTENT_SIZE = 100 * 1024;

function ensureKBDir(): void {
  if (!fs.existsSync(KB_DIR)) {
    fs.mkdirSync(KB_DIR, {recursive: true});
  }
}

function getKBPath(kbId: string): string {
  return path.join(KB_DIR, kbId);
}

function getManifestPath(kbId: string): string {
  return path.join(getKBPath(kbId), 'manifest.json');
}

function getPagesDir(kbId: string): string {
  return path.join(getKBPath(kbId), 'pages');
}

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

export function listKnowledgeBases(): KnowledgeBase[] {
  ensureKBDir();

  const kbs: KnowledgeBase[] = [];

  try {
    const dirs = fs.readdirSync(KB_DIR);

    for (const dir of dirs) {
      const manifestPath = path.join(KB_DIR, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const data = fs.readFileSync(manifestPath, 'utf-8');
          const kb = JSON.parse(data) as KnowledgeBase;
          kbs.push(kb);
        } catch {
          // Skip invalid manifests
        }
      }
    }
  } catch {
    // Return empty list on error
  }

  return kbs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getKnowledgeBase(kbId: string): KnowledgeBase | null {
  const manifestPath = getManifestPath(kbId);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(data) as KnowledgeBase;
  } catch {
    return null;
  }
}

export function createKnowledgeBase(name: string, crawlDepth: number): KnowledgeBase {
  ensureKBDir();

  const id = generateId();
  const kbPath = getKBPath(id);
  const pagesPath = getPagesDir(id);

  fs.mkdirSync(kbPath, {recursive: true});
  fs.mkdirSync(pagesPath, {recursive: true});

  const kb: KnowledgeBase = {
    id,
    name,
    createdAt: new Date().toISOString(),
    sources: [],
    crawlDepth: Math.min(Math.max(crawlDepth, 1), 3),
    totalPages: 0,
  };

  saveKnowledgeBase(kb);

  return kb;
}

function saveKnowledgeBase(kb: KnowledgeBase): void {
  const manifestPath = getManifestPath(kb.id);
  fs.writeFileSync(manifestPath, JSON.stringify(kb, null, 2), 'utf-8');
}

export function deleteKnowledgeBase(kbId: string): boolean {
  const kbPath = getKBPath(kbId);

  if (!fs.existsSync(kbPath)) {
    return false;
  }

  try {
    fs.rmSync(kbPath, {recursive: true, force: true});
    return true;
  } catch {
    return false;
  }
}

export function addSource(kbId: string, url: string): KnowledgeBaseSource | null {
  if (!isValidUrl(url)) {
    return null;
  }

  const kb = getKnowledgeBase(kbId);
  if (!kb) {
    return null;
  }

  // Check if URL already exists
  if (kb.sources.some(s => s.url === url)) {
    return null;
  }

  const source: KnowledgeBaseSource = {
    id: generateId(),
    url,
    addedAt: new Date().toISOString(),
    pageCount: 0,
    status: 'pending',
  };

  kb.sources.push(source);
  saveKnowledgeBase(kb);

  return source;
}

export function removeSource(kbId: string, sourceId: string): boolean {
  const kb = getKnowledgeBase(kbId);
  if (!kb) {
    return false;
  }

  const sourceIndex = kb.sources.findIndex(s => s.id === sourceId);
  if (sourceIndex === -1) {
    return false;
  }

  // Remove source pages
  const pagesDir = getPagesDir(kbId);
  const source = kb.sources[sourceIndex];

  // Remove pages associated with this source
  try {
    const pageFiles = fs.readdirSync(pagesDir);
    for (const file of pageFiles) {
      const pagePath = path.join(pagesDir, file);
      try {
        const data = fs.readFileSync(pagePath, 'utf-8');
        const page = JSON.parse(data) as PageContent & {sourceId: string};
        if (page.sourceId === sourceId) {
          fs.unlinkSync(pagePath);
        }
      } catch {
        // Skip invalid page files
      }
    }
  } catch {
    // Continue even if page cleanup fails
  }

  // Remove source from manifest
  kb.sources.splice(sourceIndex, 1);
  kb.totalPages = kb.sources.reduce((sum, s) => sum + s.pageCount, 0);
  saveKnowledgeBase(kb);

  return true;
}

function savePage(kbId: string, sourceId: string, page: PageContent): void {
  const pagesDir = getPagesDir(kbId);
  const hash = hashUrl(page.url);
  const pagePath = path.join(pagesDir, `${hash}.json`);

  const pageData = {
    ...page,
    sourceId,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(pagePath, JSON.stringify(pageData, null, 2), 'utf-8');
}

export async function crawlSource(
  kbId: string,
  sourceId: string,
  onProgress?: (progress: CrawlProgress) => void
): Promise<{success: boolean; pageCount: number; error?: string}> {
  const kb = getKnowledgeBase(kbId);
  if (!kb) {
    return {success: false, pageCount: 0, error: 'Knowledge base not found'};
  }

  const source = kb.sources.find(s => s.id === sourceId);
  if (!source) {
    return {success: false, pageCount: 0, error: 'Source not found'};
  }

  // Update source status
  source.status = 'crawling';
  saveKnowledgeBase(kb);

  try {
    const result = await crawlWebsite(
      source.url,
      {maxDepth: kb.crawlDepth, maxPages: 50, timeout: 10000},
      onProgress
    );

    // Save crawled pages
    for (const page of result.pages) {
      savePage(kbId, sourceId, page);
    }

    // Update source and KB
    source.status = 'complete';
    source.lastCrawledAt = new Date().toISOString();
    source.pageCount = result.pages.length;

    if (result.errors.length > 0) {
      source.error = `${result.errors.length} page(s) failed to crawl`;
    }

    kb.totalPages = kb.sources.reduce((sum, s) => sum + s.pageCount, 0);
    saveKnowledgeBase(kb);

    return {success: true, pageCount: result.pages.length};
  } catch (error) {
    source.status = 'error';
    source.error = error instanceof Error ? error.message : 'Crawl failed';
    saveKnowledgeBase(kb);

    return {
      success: false,
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Crawl failed',
    };
  }
}

export function loadKnowledgeBaseContent(kbId: string): string {
  const kb = getKnowledgeBase(kbId);
  if (!kb) {
    return '';
  }

  const pagesDir = getPagesDir(kbId);

  if (!fs.existsSync(pagesDir)) {
    return '';
  }

  const contentParts: string[] = [];
  let totalSize = 0;

  try {
    const pageFiles = fs.readdirSync(pagesDir);

    for (const file of pageFiles) {
      if (totalSize >= MAX_CONTENT_SIZE) {
        contentParts.push('\n\n[Content truncated due to size limit]');
        break;
      }

      const pagePath = path.join(pagesDir, file);

      try {
        const data = fs.readFileSync(pagePath, 'utf-8');
        const page = JSON.parse(data) as PageContent;

        const pageContent = `## ${page.title || page.url}\nSource: ${page.url}\n\n${page.text}\n`;

        if (totalSize + pageContent.length <= MAX_CONTENT_SIZE) {
          contentParts.push(pageContent);
          totalSize += pageContent.length;
        } else {
          // Add partial content
          const remaining = MAX_CONTENT_SIZE - totalSize;
          contentParts.push(pageContent.slice(0, remaining));
          contentParts.push('\n\n[Content truncated due to size limit]');
          break;
        }
      } catch {
        // Skip invalid page files
      }
    }
  } catch {
    // Return empty string on error
  }

  return contentParts.join('\n---\n');
}

// RAG-related exports
export async function indexKnowledgeBase(
  kbId: string,
  onProgress?: (progress: IndexProgress) => void
): Promise<{success: boolean; chunkCount: number; error?: string}> {
  return indexKB(kbId, onProgress);
}

export async function searchKnowledgeBase(
  kbId: string,
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  return searchKB(kbId, query, topK);
}

export function isKnowledgeBaseIndexed(kbId: string): boolean {
  return checkIndexed(kbId);
}

export function getKnowledgeBaseIndexStats(kbId: string): {indexed: boolean; chunkCount: number; indexedAt?: string; mode?: string} | null {
  return getIndexStats(kbId);
}

export function clearKnowledgeBaseIndex(kbId: string): void {
  return clearIndex(kbId);
}

export function formatKBSearchResultsAsContext(results: SearchResult[]): string {
  return formatSearchResultsAsContext(results);
}
