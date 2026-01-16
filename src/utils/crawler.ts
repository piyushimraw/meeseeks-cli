import {convert} from 'html-to-text';
import type {CrawlOptions, PageContent, CrawlProgress} from '../types/index.js';

const DEFAULT_OPTIONS: CrawlOptions = {
  maxDepth: 2,
  maxPages: 50,
  timeout: 10000,
};

const RATE_LIMIT_DELAY = 500;

export async function fetchPage(url: string, timeout: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Meeseeks-CLI/1.0 (Knowledge Base Crawler)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractContent(html: string, baseUrl: string): PageContent {
  // Extract title from HTML
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract text content using html-to-text
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      {selector: 'a', options: {ignoreHref: true}},
      {selector: 'img', format: 'skip'},
      {selector: 'script', format: 'skip'},
      {selector: 'style', format: 'skip'},
      {selector: 'nav', format: 'skip'},
      {selector: 'footer', format: 'skip'},
      {selector: 'header', format: 'skip'},
    ],
  });

  // Extract links
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const normalizedUrl = normalizeUrl(href, baseUrl);
    if (normalizedUrl && isSameDomain(normalizedUrl, baseUrl)) {
      links.push(normalizedUrl);
    }
  }

  return {
    url: baseUrl,
    title,
    text: text.trim(),
    links: [...new Set(links)],
  };
}

export function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    // Skip javascript:, mailto:, tel:, etc.
    if (url.startsWith('javascript:') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#')) {
      return null;
    }

    const resolved = new URL(url, baseUrl);

    // Remove hash and query params for deduplication
    resolved.hash = '';

    // Only allow http and https
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }

    return resolved.href;
  } catch {
    return null;
  }
}

export function isSameDomain(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.hostname === baseObj.hostname;
  } catch {
    return false;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

interface CrawlResult {
  pages: PageContent[];
  errors: Array<{url: string; error: string}>;
}

export async function crawlWebsite(
  baseUrl: string,
  options: Partial<CrawlOptions> = {},
  onProgress?: (progress: CrawlProgress) => void
): Promise<CrawlResult> {
  const opts = {...DEFAULT_OPTIONS, ...options};

  const visited = new Set<string>();
  const queue: Array<{url: string; depth: number}> = [{url: baseUrl, depth: 0}];
  const pages: PageContent[] = [];
  const errors: Array<{url: string; error: string}> = [];

  while (queue.length > 0 && pages.length < opts.maxPages) {
    const item = queue.shift();
    if (!item) break;

    const {url, depth} = item;

    // Skip if already visited
    if (visited.has(url)) continue;
    visited.add(url);

    // Report progress
    if (onProgress) {
      onProgress({
        crawled: pages.length,
        total: Math.min(pages.length + queue.length + 1, opts.maxPages),
        currentUrl: url,
      });
    }

    try {
      // Fetch the page
      const html = await fetchPage(url, opts.timeout);

      // Extract content
      const content = extractContent(html, url);
      pages.push(content);

      // Add links to queue if within depth limit
      if (depth < opts.maxDepth) {
        for (const link of content.links) {
          if (!visited.has(link) && !queue.some(q => q.url === link)) {
            queue.push({url: link, depth: depth + 1});
          }
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch (error) {
      errors.push({
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Final progress report
  if (onProgress) {
    onProgress({
      crawled: pages.length,
      total: pages.length,
      currentUrl: '',
    });
  }

  return {pages, errors};
}
