import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import type {KnowledgeBase, KnowledgeBaseSource, CrawlProgress} from '../types/index.js';
import {
  listKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase as createKB,
  deleteKnowledgeBase as deleteKB,
  addSource as addSourceToKB,
  removeSource as removeSourceFromKB,
  crawlSource as crawlKBSource,
  loadKnowledgeBaseContent as loadKBContent,
} from '../utils/knowledgeBase.js';

export interface CrawlState {
  isActive: boolean;
  kbId?: string;
  sourceId?: string;
  progress: number;
  total: number;
  currentUrl: string;
}

interface KnowledgeBaseContextType {
  knowledgeBases: KnowledgeBase[];
  isLoading: boolean;
  crawlState: CrawlState;
  refresh: () => void;
  createKnowledgeBase: (name: string, crawlDepth: number) => KnowledgeBase;
  deleteKnowledgeBase: (id: string) => boolean;
  addSource: (kbId: string, url: string) => KnowledgeBaseSource | null;
  removeSource: (kbId: string, sourceId: string) => boolean;
  crawlSource: (kbId: string, sourceId: string) => Promise<{success: boolean; pageCount: number; error?: string}>;
  getKBContent: (kbId: string) => string;
  getKB: (kbId: string) => KnowledgeBase | null;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [crawlState, setCrawlState] = useState<CrawlState>({
    isActive: false,
    progress: 0,
    total: 0,
    currentUrl: '',
  });

  const refresh = useCallback(() => {
    setIsLoading(true);
    const kbs = listKnowledgeBases();
    setKnowledgeBases(kbs);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createKnowledgeBase = useCallback((name: string, crawlDepth: number): KnowledgeBase => {
    const kb = createKB(name, crawlDepth);
    refresh();
    return kb;
  }, [refresh]);

  const deleteKnowledgeBase = useCallback((id: string): boolean => {
    const result = deleteKB(id);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const addSource = useCallback((kbId: string, url: string): KnowledgeBaseSource | null => {
    const source = addSourceToKB(kbId, url);
    if (source) {
      refresh();
    }
    return source;
  }, [refresh]);

  const removeSource = useCallback((kbId: string, sourceId: string): boolean => {
    const result = removeSourceFromKB(kbId, sourceId);
    if (result) {
      refresh();
    }
    return result;
  }, [refresh]);

  const crawlSource = useCallback(async (
    kbId: string,
    sourceId: string
  ): Promise<{success: boolean; pageCount: number; error?: string}> => {
    setCrawlState({
      isActive: true,
      kbId,
      sourceId,
      progress: 0,
      total: 0,
      currentUrl: '',
    });

    const onProgress = (progress: CrawlProgress) => {
      setCrawlState(prev => ({
        ...prev,
        progress: progress.crawled,
        total: progress.total,
        currentUrl: progress.currentUrl,
      }));
    };

    try {
      const result = await crawlKBSource(kbId, sourceId, onProgress);
      refresh();
      return result;
    } finally {
      setCrawlState({
        isActive: false,
        progress: 0,
        total: 0,
        currentUrl: '',
      });
    }
  }, [refresh]);

  const getKBContent = useCallback((kbId: string): string => {
    return loadKBContent(kbId);
  }, []);

  const getKB = useCallback((kbId: string): KnowledgeBase | null => {
    return getKnowledgeBase(kbId);
  }, []);

  return (
    <KnowledgeBaseContext.Provider
      value={{
        knowledgeBases,
        isLoading,
        crawlState,
        refresh,
        createKnowledgeBase,
        deleteKnowledgeBase,
        addSource,
        removeSource,
        crawlSource,
        getKBContent,
        getKB,
      }}
    >
      {children}
    </KnowledgeBaseContext.Provider>
  );
};

export const useKnowledgeBase = (): KnowledgeBaseContextType => {
  const context = useContext(KnowledgeBaseContext);
  if (!context) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};
