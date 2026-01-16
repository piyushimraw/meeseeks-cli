import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {PageContent, Chunk, ChunkIndex, SearchResult, IndexProgress} from '../types/index.js';

const KB_DIR = path.join(os.homedir(), '.meeseeks', 'knowledge');
const MODEL_NAME_TRANSFORMER = 'Xenova/all-MiniLM-L6-v2';
const MODEL_NAME_TFIDF = 'tfidf-simple';
const EMBEDDING_DIMENSIONS_TRANSFORMER = 384;
const MAX_CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

// Embedding mode
type EmbedderMode = 'transformer' | 'tfidf';
let currentMode: EmbedderMode = 'tfidf'; // Default to TF-IDF for compatibility

// Transformer embedder (optional)
let transformerEmbedder: any = null;
let pipelineModule: any = null;
let transformerInitFailed = false;

// TF-IDF state
interface TfIdfState {
  vocabulary: Map<string, number>;  // word -> index
  idf: Float32Array;                // IDF values for each word
  dimensions: number;
}
let tfidfState: TfIdfState | null = null;

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now', 'i', 'you',
  'your', 'we', 'our', 'their', 'them', 'his', 'her', 'she', 'him', 'my', 'me',
]);

function getIndexDir(kbId: string): string {
  return path.join(KB_DIR, kbId, 'index');
}

function getChunksPath(kbId: string): string {
  return path.join(getIndexDir(kbId), 'chunks.json');
}

function getEmbeddingsPath(kbId: string): string {
  return path.join(getIndexDir(kbId), 'embeddings.bin');
}

function getPagesDir(kbId: string): string {
  return path.join(KB_DIR, kbId, 'pages');
}

function getManifestPath(kbId: string): string {
  return path.join(KB_DIR, kbId, 'manifest.json');
}

// ============================================================================
// TF-IDF Implementation (works everywhere)
// ============================================================================

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Build TF-IDF vocabulary and IDF values from documents
 */
function buildTfIdfVocabulary(documents: string[], maxVocabSize: number = 5000): TfIdfState {
  const wordDocCount = new Map<string, number>();  // word -> number of docs containing it
  const allWords = new Set<string>();

  // Count document frequency for each word
  for (const doc of documents) {
    const words = new Set(tokenize(doc));
    for (const word of words) {
      allWords.add(word);
      wordDocCount.set(word, (wordDocCount.get(word) || 0) + 1);
    }
  }

  // Sort words by document frequency and take top N
  const sortedWords = Array.from(allWords)
    .map(word => ({word, count: wordDocCount.get(word) || 0}))
    .filter(({count}) => count > 1)  // Word must appear in at least 2 docs
    .sort((a, b) => b.count - a.count)
    .slice(0, maxVocabSize)
    .map(({word}) => word);

  // Build vocabulary map
  const vocabulary = new Map<string, number>();
  sortedWords.forEach((word, index) => vocabulary.set(word, index));

  // Calculate IDF values: log(N / df)
  const N = documents.length;
  const idf = new Float32Array(sortedWords.length);
  for (let i = 0; i < sortedWords.length; i++) {
    const df = wordDocCount.get(sortedWords[i]) || 1;
    idf[i] = Math.log((N + 1) / (df + 1)) + 1;  // Smoothed IDF
  }

  return {vocabulary, idf, dimensions: sortedWords.length};
}

/**
 * Compute TF-IDF vector for a single document
 */
function computeTfIdfVector(text: string, state: TfIdfState): Float32Array {
  const vector = new Float32Array(state.dimensions);
  const words = tokenize(text);

  if (words.length === 0) return vector;

  // Count term frequencies
  const tf = new Map<string, number>();
  for (const word of words) {
    if (state.vocabulary.has(word)) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }
  }

  // Compute TF-IDF
  for (const [word, count] of tf) {
    const idx = state.vocabulary.get(word)!;
    // Normalized TF * IDF
    vector[idx] = (count / words.length) * state.idf[idx];
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Save TF-IDF vocabulary to disk
 */
function saveTfIdfVocabulary(kbId: string, state: TfIdfState): void {
  const indexDir = getIndexDir(kbId);
  const vocabPath = path.join(indexDir, 'vocabulary.json');

  const vocabData = {
    words: Array.from(state.vocabulary.entries()),
    idf: Array.from(state.idf),
    dimensions: state.dimensions,
  };

  fs.writeFileSync(vocabPath, JSON.stringify(vocabData), 'utf-8');
}

/**
 * Load TF-IDF vocabulary from disk
 */
function loadTfIdfVocabulary(kbId: string): TfIdfState | null {
  const indexDir = getIndexDir(kbId);
  const vocabPath = path.join(indexDir, 'vocabulary.json');

  if (!fs.existsSync(vocabPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
    return {
      vocabulary: new Map(data.words),
      idf: new Float32Array(data.idf),
      dimensions: data.dimensions,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Transformer Implementation (optional, better quality)
// ============================================================================

/**
 * Try to initialize transformer embedder
 */
async function initTransformerEmbedder(): Promise<boolean> {
  if (transformerEmbedder) return true;
  if (transformerInitFailed) return false;

  try {
    if (!pipelineModule) {
      const transformers = await import('@xenova/transformers');
      pipelineModule = transformers.pipeline;
    }

    transformerEmbedder = await pipelineModule('feature-extraction', MODEL_NAME_TRANSFORMER, {
      quantized: true,
    });
    return true;
  } catch {
    transformerInitFailed = true;
    return false;
  }
}

/**
 * Generate embeddings using transformer model
 */
async function embedWithTransformer(texts: string[]): Promise<Float32Array[]> {
  const embeddings: Float32Array[] = [];

  for (const text of texts) {
    const output = await transformerEmbedder(text, {pooling: 'mean', normalize: true});
    embeddings.push(new Float32Array(output.data));
  }

  return embeddings;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get current embedding mode
 */
export function getEmbeddingMode(): EmbedderMode {
  return currentMode;
}

/**
 * Check if embedder is available
 */
export function isEmbedderAvailable(): {available: boolean; mode: EmbedderMode} {
  return {available: true, mode: currentMode};
}

/**
 * Initialize the embedding system
 * Tries transformer first, falls back to TF-IDF
 */
export async function initEmbedder(texts?: string[]): Promise<void> {
  // Try transformer first (better quality)
  const transformerAvailable = await initTransformerEmbedder();

  if (transformerAvailable) {
    currentMode = 'transformer';
    return;
  }

  // Fall back to TF-IDF
  currentMode = 'tfidf';

  // If texts provided, build vocabulary
  if (texts && texts.length > 0) {
    tfidfState = buildTfIdfVocabulary(texts);
  }
}

/**
 * Generate embeddings for an array of texts
 */
export async function embed(texts: string[]): Promise<Float32Array[]> {
  if (currentMode === 'transformer' && transformerEmbedder) {
    return embedWithTransformer(texts);
  }

  // TF-IDF mode
  if (!tfidfState) {
    throw new Error('TF-IDF vocabulary not initialized. Call initEmbedder with texts first.');
  }

  return texts.map(text => computeTfIdfVector(text, tfidfState!));
}

/**
 * Generate embedding for a single query (for search)
 * Uses the loaded vocabulary for TF-IDF mode
 */
export async function embedQuery(text: string, kbId: string): Promise<Float32Array> {
  if (currentMode === 'transformer' && transformerEmbedder) {
    const embeddings = await embedWithTransformer([text]);
    return embeddings[0];
  }

  // TF-IDF mode - load vocabulary from KB
  const state = loadTfIdfVocabulary(kbId);
  if (!state) {
    throw new Error('TF-IDF vocabulary not found for this knowledge base');
  }

  return computeTfIdfVector(text, state);
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, maxChunkSize: number = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];

  // First, split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    // If paragraph fits in current chunk
    if (currentChunk.length + trimmedPara.length + 1 <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
    } else {
      // Save current chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If paragraph is larger than maxChunkSize, split it further
      if (trimmedPara.length > maxChunkSize) {
        const subChunks = splitLongText(trimmedPara, maxChunkSize);
        // Add all but the last sub-chunk
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]);
        }
        // Keep the last sub-chunk as the start of the next chunk
        currentChunk = subChunks[subChunks.length - 1];
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split long text by sentences, then by fixed size if needed
 */
function splitLongText(text: string, maxSize: number): string[] {
  // Try splitting by sentences first
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (currentChunk.length + trimmedSentence.length + 1 <= maxSize) {
      currentChunk = currentChunk ? currentChunk + ' ' + trimmedSentence : trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If sentence is still too long, split by fixed size with overlap
      if (trimmedSentence.length > maxSize) {
        const fixedChunks = splitByFixedSize(trimmedSentence, maxSize, CHUNK_OVERLAP);
        for (let i = 0; i < fixedChunks.length - 1; i++) {
          chunks.push(fixedChunks[i]);
        }
        currentChunk = fixedChunks[fixedChunks.length - 1];
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split text by fixed size with overlap
 */
function splitByFixedSize(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;

    // Prevent infinite loop
    if (start >= text.length - overlap) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk a page into multiple chunks with metadata
 */
export function chunkPage(page: PageContent & {sourceId: string}, pageHash: string): Chunk[] {
  const textChunks = chunkText(page.text);
  const chunks: Chunk[] = [];

  let currentIdx = 0;

  for (let i = 0; i < textChunks.length; i++) {
    const text = textChunks[i];
    const startIdx = page.text.indexOf(text, currentIdx);
    const endIdx = startIdx + text.length;

    chunks.push({
      id: 0, // Will be set during indexing
      pageHash,
      pageUrl: page.url,
      pageTitle: page.title || page.url,
      text,
      startIdx: startIdx >= 0 ? startIdx : currentIdx,
      endIdx: startIdx >= 0 ? endIdx : currentIdx + text.length,
    });

    currentIdx = startIdx >= 0 ? endIdx : currentIdx + text.length;
  }

  return chunks;
}

/**
 * Load all pages from a knowledge base
 */
function loadPages(kbId: string): (PageContent & {sourceId: string; hash: string})[] {
  const pagesDir = getPagesDir(kbId);
  const pages: (PageContent & {sourceId: string; hash: string})[] = [];

  if (!fs.existsSync(pagesDir)) {
    return pages;
  }

  const files = fs.readdirSync(pagesDir);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const data = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
      const page = JSON.parse(data) as PageContent & {sourceId: string};
      const hash = file.replace('.json', '');
      pages.push({...page, hash});
    } catch {
      // Skip invalid files
    }
  }

  return pages;
}

/**
 * Index a knowledge base - create chunks and embeddings
 */
export async function indexKnowledgeBase(
  kbId: string,
  onProgress?: (progress: IndexProgress) => void
): Promise<{success: boolean; chunkCount: number; error?: string; mode?: string}> {
  try {
    // Load all pages
    const pages = loadPages(kbId);

    if (pages.length === 0) {
      return {success: false, chunkCount: 0, error: 'No pages to index'};
    }

    // Phase 1: Chunking
    onProgress?.({phase: 'chunking', current: 0, total: pages.length});

    const allChunks: Chunk[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageChunks = chunkPage(page, page.hash);

      // Assign global IDs
      for (const chunk of pageChunks) {
        chunk.id = allChunks.length;
        allChunks.push(chunk);
      }

      onProgress?.({phase: 'chunking', current: i + 1, total: pages.length});
    }

    if (allChunks.length === 0) {
      return {success: false, chunkCount: 0, error: 'No chunks created'};
    }

    // Phase 2: Embedding
    onProgress?.({phase: 'embedding', current: 0, total: allChunks.length});

    // Get all chunk texts for vocabulary building (TF-IDF) or embedding
    const allTexts = allChunks.map(c => c.text);

    // Initialize embedder - will try transformer, fall back to TF-IDF
    await initEmbedder(allTexts);

    // Embed in batches for progress updates
    const batchSize = currentMode === 'transformer' ? 10 : 100; // TF-IDF is faster
    const allEmbeddings: Float32Array[] = [];

    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.text);
      const embeddings = await embed(texts);
      allEmbeddings.push(...embeddings);

      onProgress?.({phase: 'embedding', current: Math.min(i + batchSize, allChunks.length), total: allChunks.length});
    }

    // Phase 3: Saving
    onProgress?.({phase: 'saving', current: 0, total: 1});

    // Get dimensions based on mode
    const dimensions = currentMode === 'transformer'
      ? EMBEDDING_DIMENSIONS_TRANSFORMER
      : (tfidfState?.dimensions || allEmbeddings[0]?.length || 0);

    saveIndex(kbId, allChunks, allEmbeddings, currentMode, dimensions);

    // Save TF-IDF vocabulary if using that mode
    if (currentMode === 'tfidf' && tfidfState) {
      saveTfIdfVocabulary(kbId, tfidfState);
    }

    // Update manifest
    updateManifestIndexed(kbId, allChunks.length, currentMode);

    onProgress?.({phase: 'saving', current: 1, total: 1});

    return {success: true, chunkCount: allChunks.length, mode: currentMode};
  } catch (error) {
    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Indexing failed',
    };
  }
}

/**
 * Save index to filesystem
 */
export function saveIndex(
  kbId: string,
  chunks: Chunk[],
  embeddings: Float32Array[],
  mode: EmbedderMode = 'tfidf',
  dimensions: number = 0
): void {
  const indexDir = getIndexDir(kbId);

  // Ensure index directory exists
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, {recursive: true});
  }

  // Determine model name
  const modelName = mode === 'transformer' ? MODEL_NAME_TRANSFORMER : MODEL_NAME_TFIDF;
  const embDimensions = dimensions || (embeddings[0]?.length || 0);

  // Save chunks metadata
  const chunkIndex: ChunkIndex = {
    model: modelName,
    dimensions: embDimensions,
    chunks,
  };

  fs.writeFileSync(getChunksPath(kbId), JSON.stringify(chunkIndex, null, 2), 'utf-8');

  // Save embeddings as binary
  const totalFloats = embeddings.length * embDimensions;
  const buffer = Buffer.alloc(totalFloats * 4);

  let offset = 0;
  for (const embedding of embeddings) {
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], offset);
      offset += 4;
    }
  }

  fs.writeFileSync(getEmbeddingsPath(kbId), buffer);
}

/**
 * Load index from filesystem
 */
export function loadIndex(kbId: string): {chunks: Chunk[]; embeddings: Float32Array[]; model: string; dimensions: number} | null {
  const chunksPath = getChunksPath(kbId);
  const embeddingsPath = getEmbeddingsPath(kbId);

  if (!fs.existsSync(chunksPath) || !fs.existsSync(embeddingsPath)) {
    return null;
  }

  try {
    // Load chunks
    const chunkData = fs.readFileSync(chunksPath, 'utf-8');
    const chunkIndex = JSON.parse(chunkData) as ChunkIndex;

    // Load embeddings
    const buffer = fs.readFileSync(embeddingsPath);
    const embeddings: Float32Array[] = [];

    const dimensions = chunkIndex.dimensions;
    const numChunks = chunkIndex.chunks.length;

    for (let i = 0; i < numChunks; i++) {
      const embedding = new Float32Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        embedding[j] = buffer.readFloatLE((i * dimensions + j) * 4);
      }
      embeddings.push(embedding);
    }

    return {
      chunks: chunkIndex.chunks,
      embeddings,
      model: chunkIndex.model,
      dimensions: chunkIndex.dimensions,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Search knowledge base with semantic search
 */
export async function searchKnowledgeBase(
  kbId: string,
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const index = loadIndex(kbId);

  if (!index) {
    return [];
  }

  // Determine which embedding method to use based on index model
  const isTfIdf = index.model === MODEL_NAME_TFIDF;
  let queryEmbedding: Float32Array;

  if (isTfIdf) {
    // Load TF-IDF vocabulary and compute query embedding
    const vocabState = loadTfIdfVocabulary(kbId);
    if (!vocabState) {
      return [];
    }
    queryEmbedding = computeTfIdfVector(query, vocabState);
  } else {
    // Use transformer model
    const transformerAvailable = await initTransformerEmbedder();
    if (!transformerAvailable) {
      // Can't search transformer-indexed KB without transformer
      return [];
    }
    const embeddings = await embedWithTransformer([query]);
    queryEmbedding = embeddings[0];
  }

  // Calculate similarities
  const results: SearchResult[] = [];

  for (let i = 0; i < index.chunks.length; i++) {
    const score = cosineSimilarity(queryEmbedding, index.embeddings[i]);
    results.push({
      chunk: index.chunks[i],
      score,
    });
  }

  // Sort by score descending and take top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * Check if a knowledge base is indexed
 */
export function isIndexed(kbId: string): boolean {
  return fs.existsSync(getChunksPath(kbId)) && fs.existsSync(getEmbeddingsPath(kbId));
}

/**
 * Get index stats
 */
export function getIndexStats(kbId: string): {indexed: boolean; chunkCount: number; indexedAt?: string; mode?: string} | null {
  const manifestPath = getManifestPath(kbId);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(data);

    return {
      indexed: manifest.indexed === true,
      chunkCount: manifest.chunkCount || 0,
      indexedAt: manifest.indexedAt,
      mode: manifest.indexMode,
    };
  } catch {
    return null;
  }
}

/**
 * Update manifest with indexing info
 */
function updateManifestIndexed(kbId: string, chunkCount: number, mode: EmbedderMode = 'tfidf'): void {
  const manifestPath = getManifestPath(kbId);

  if (!fs.existsSync(manifestPath)) {
    return;
  }

  try {
    const data = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(data);

    manifest.indexed = true;
    manifest.indexedAt = new Date().toISOString();
    manifest.chunkCount = chunkCount;
    manifest.indexMode = mode;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch {
    // Ignore errors
  }
}

/**
 * Clear the index for a knowledge base
 */
export function clearIndex(kbId: string): void {
  const indexDir = getIndexDir(kbId);

  if (fs.existsSync(indexDir)) {
    fs.rmSync(indexDir, {recursive: true, force: true});
  }

  // Update manifest
  const manifestPath = getManifestPath(kbId);

  if (fs.existsSync(manifestPath)) {
    try {
      const data = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(data);

      delete manifest.indexed;
      delete manifest.indexedAt;
      delete manifest.chunkCount;

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Format search results as context for LLM
 */
export function formatSearchResultsAsContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return '';
  }

  const contextParts: string[] = [];

  for (const result of results) {
    const header = `## ${result.chunk.pageTitle}`;
    const source = `Source: ${result.chunk.pageUrl}`;
    const content = result.chunk.text;

    contextParts.push(`${header}\n${source}\n\n${content}`);
  }

  return contextParts.join('\n\n---\n\n');
}
