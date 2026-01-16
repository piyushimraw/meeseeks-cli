import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {useKnowledgeBase} from '../context/KnowledgeBaseContext.js';
import type {KnowledgeBase as KBType} from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type ViewState =
  | 'list'
  | 'create-name'
  | 'create-url'
  | 'create-depth'
  | 'detail'
  | 'add-source'
  | 'crawling'
  | 'confirm-delete';

interface KnowledgeBaseProps {
  onBack: () => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({onBack}) => {
  const {
    knowledgeBases,
    isLoading,
    crawlState,
    createKnowledgeBase,
    deleteKnowledgeBase,
    addSource,
    crawlSource,
    removeSource,
  } = useKnowledgeBase();

  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [selectedKB, setSelectedKB] = useState<KBType | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDepth, setNewDepth] = useState(2);

  // Error state
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (crawlState.isActive) return;

    // Global back navigation
    if (input === 'b' || key.escape) {
      if (viewState === 'list') {
        onBack();
      } else if (viewState === 'detail' || viewState === 'confirm-delete') {
        setViewState('list');
        setSelectedKB(null);
        setSelectedSourceIndex(0);
        setError(null);
      } else if (viewState.startsWith('create-') || viewState === 'add-source') {
        if (viewState === 'create-name') {
          setViewState('list');
        } else if (viewState === 'create-url') {
          setViewState('create-name');
        } else if (viewState === 'create-depth') {
          setViewState('create-url');
        } else if (viewState === 'add-source') {
          setViewState('detail');
        }
        setError(null);
      }
      return;
    }

    // List view controls
    if (viewState === 'list') {
      if (key.upArrow) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, knowledgeBases.length - 1)));
      } else if (key.downArrow) {
        setSelectedIndex(prev => (prev < knowledgeBases.length - 1 ? prev + 1 : 0));
      } else if (key.return && knowledgeBases.length > 0) {
        setSelectedKB(knowledgeBases[selectedIndex]);
        setViewState('detail');
        setSelectedSourceIndex(0);
      } else if (input === 'n') {
        setNewName('');
        setNewUrl('');
        setNewDepth(2);
        setViewState('create-name');
      } else if (input === 'd' && knowledgeBases.length > 0) {
        setSelectedKB(knowledgeBases[selectedIndex]);
        setViewState('confirm-delete');
      }
      return;
    }

    // Detail view controls
    if (viewState === 'detail' && selectedKB) {
      if (key.upArrow && selectedKB.sources.length > 0) {
        setSelectedSourceIndex(prev => (prev > 0 ? prev - 1 : selectedKB.sources.length - 1));
      } else if (key.downArrow && selectedKB.sources.length > 0) {
        setSelectedSourceIndex(prev => (prev < selectedKB.sources.length - 1 ? prev + 1 : 0));
      } else if (input === 'a') {
        setNewUrl('');
        setViewState('add-source');
      } else if (input === 'c' && selectedKB.sources.length > 0) {
        const source = selectedKB.sources[selectedSourceIndex];
        if (source && source.status !== 'crawling') {
          setViewState('crawling');
          crawlSource(selectedKB.id, source.id).then(() => {
            // Refresh the selected KB
            const updatedKBs = knowledgeBases.find(kb => kb.id === selectedKB.id);
            if (updatedKBs) {
              setSelectedKB(updatedKBs);
            }
            setViewState('detail');
          });
        }
      } else if (input === 'r' && selectedKB.sources.length > 0) {
        const source = selectedKB.sources[selectedSourceIndex];
        if (source) {
          removeSource(selectedKB.id, source.id);
          // Refresh selected KB from the updated list
          const updated = knowledgeBases.find(kb => kb.id === selectedKB.id);
          if (updated) {
            setSelectedKB(updated);
            if (selectedSourceIndex >= updated.sources.length) {
              setSelectedSourceIndex(Math.max(0, updated.sources.length - 1));
            }
          }
        }
      }
      return;
    }

    // Confirm delete controls
    if (viewState === 'confirm-delete') {
      if (input === 'y' && selectedKB) {
        deleteKnowledgeBase(selectedKB.id);
        setViewState('list');
        setSelectedKB(null);
        setSelectedIndex(prev => Math.max(0, Math.min(prev, knowledgeBases.length - 2)));
      } else if (input === 'n') {
        setViewState('list');
        setSelectedKB(null);
      }
      return;
    }

    // Depth selection controls
    if (viewState === 'create-depth') {
      if (key.upArrow || key.leftArrow) {
        setNewDepth(prev => Math.max(1, prev - 1));
      } else if (key.downArrow || key.rightArrow) {
        setNewDepth(prev => Math.min(3, prev + 1));
      } else if (key.return) {
        // Create the KB and start crawling
        const kb = createKnowledgeBase(newName, newDepth);
        const source = addSource(kb.id, newUrl);
        if (source) {
          setSelectedKB(kb);
          setViewState('crawling');
          crawlSource(kb.id, source.id).then(() => {
            // Refresh the selected KB
            const updatedKB = knowledgeBases.find(k => k.id === kb.id);
            if (updatedKB) {
              setSelectedKB(updatedKB);
            }
            setViewState('detail');
          });
        } else {
          setSelectedKB(kb);
          setViewState('detail');
        }
      }
      return;
    }
  });

  const handleNameSubmit = () => {
    if (!newName.trim()) {
      setError('Name is required');
      return;
    }
    setError(null);
    setViewState('create-url');
  };

  const handleUrlSubmit = () => {
    if (!newUrl.trim()) {
      setError('URL is required');
      return;
    }
    try {
      new URL(newUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }
    setError(null);
    setViewState('create-depth');
  };

  const handleAddSourceSubmit = () => {
    if (!newUrl.trim()) {
      setError('URL is required');
      return;
    }
    try {
      new URL(newUrl);
    } catch {
      setError('Invalid URL format');
      return;
    }

    if (selectedKB) {
      const source = addSource(selectedKB.id, newUrl);
      if (source) {
        // Refresh selected KB
        const updated = knowledgeBases.find(kb => kb.id === selectedKB.id);
        if (updated) {
          setSelectedKB(updated);
        }
        setError(null);
        setViewState('detail');
      } else {
        setError('Failed to add source (may already exist)');
      }
    }
  };

  const renderList = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Knowledge Bases</Text>

      {isLoading ? (
        <Box marginTop={1}>
          <Text color={palette.dim}>Loading...</Text>
        </Box>
      ) : knowledgeBases.length === 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text color={palette.dim}>No knowledge bases yet.</Text>
          <Text color={palette.yellow}>Press 'n' to create one.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {knowledgeBases.map((kb, index) => (
            <Box key={kb.id}>
              <Text color={index === selectedIndex ? palette.cyan : undefined}>
                {index === selectedIndex ? '> ' : '  '}
                {kb.name}
              </Text>
              <Text color={palette.dim}>
                {' '}({kb.sources.length} source{kb.sources.length !== 1 ? 's' : ''}, {kb.totalPages} page{kb.totalPages !== 1 ? 's' : ''})
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={2}>
        <Text color={palette.dim}>
          n New  Enter View  d Delete  b Back
        </Text>
      </Box>
    </Box>
  );

  const renderCreateName = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Create Knowledge Base</Text>
      <Box marginTop={1}>
        <Text>Name: </Text>
        <TextInput
          value={newName}
          onChange={setNewName}
          onSubmit={handleNameSubmit}
          placeholder="e.g., React Docs"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={palette.red}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={palette.dim}>Enter to continue  Esc to cancel</Text>
      </Box>
    </Box>
  );

  const renderCreateUrl = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Create Knowledge Base</Text>
      <Text color={palette.dim}>Name: {newName}</Text>
      <Box marginTop={1}>
        <Text>URL: </Text>
        <TextInput
          value={newUrl}
          onChange={setNewUrl}
          onSubmit={handleUrlSubmit}
          placeholder="https://example.com/docs"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={palette.red}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={palette.dim}>Enter to continue  Esc to go back</Text>
      </Box>
    </Box>
  );

  const renderCreateDepth = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Create Knowledge Base</Text>
      <Text color={palette.dim}>Name: {newName}</Text>
      <Text color={palette.dim}>URL: {newUrl}</Text>
      <Box marginTop={1}>
        <Text>Crawl Depth: </Text>
        <Box>
          {[1, 2, 3].map(d => (
            <Text key={d} color={d === newDepth ? palette.cyan : palette.dim}>
              {d === newDepth ? `[${d}]` : ` ${d} `}
              {d < 3 ? ' ' : ''}
            </Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text color={palette.dim}>
          Depth 1: Entry page only  |  Depth 2: + linked pages  |  Depth 3: Deep crawl
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={palette.dim}>Arrow keys to select  Enter to create  Esc to go back</Text>
      </Box>
    </Box>
  );

  const renderDetail = () => {
    if (!selectedKB) return null;

    return (
      <Box flexDirection="column">
        <Text color={palette.cyan} bold>{selectedKB.name}</Text>
        <Text color={palette.dim}>
          Created: {new Date(selectedKB.createdAt).toLocaleDateString()} | Depth: {selectedKB.crawlDepth} | Pages: {selectedKB.totalPages}
        </Text>

        <Box marginTop={1}>
          <Text color={palette.yellow} bold>Sources</Text>
        </Box>

        {selectedKB.sources.length === 0 ? (
          <Box marginTop={1}>
            <Text color={palette.dim}>No sources. Press 'a' to add one.</Text>
          </Box>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {selectedKB.sources.map((source, index) => (
              <Box key={source.id} flexDirection="column">
                <Box>
                  <Text color={index === selectedSourceIndex ? palette.cyan : undefined}>
                    {index === selectedSourceIndex ? '> ' : '  '}
                    {source.url.length > 50 ? source.url.slice(0, 47) + '...' : source.url}
                  </Text>
                </Box>
                <Box marginLeft={4}>
                  <Text color={
                    source.status === 'complete' ? palette.green :
                    source.status === 'error' ? palette.red :
                    source.status === 'crawling' ? palette.yellow :
                    palette.dim
                  }>
                    [{source.status}]
                  </Text>
                  <Text color={palette.dim}>
                    {' '}{source.pageCount} pages
                    {source.lastCrawledAt && ` | Last: ${new Date(source.lastCrawledAt).toLocaleDateString()}`}
                  </Text>
                </Box>
                {source.error && (
                  <Box marginLeft={4}>
                    <Text color={palette.red}>{source.error}</Text>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        <Box marginTop={2}>
          <Text color={palette.dim}>
            a Add source  c Crawl selected  r Remove selected  b Back
          </Text>
        </Box>
      </Box>
    );
  };

  const renderAddSource = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Add Source to {selectedKB?.name}</Text>
      <Box marginTop={1}>
        <Text>URL: </Text>
        <TextInput
          value={newUrl}
          onChange={setNewUrl}
          onSubmit={handleAddSourceSubmit}
          placeholder="https://example.com/docs"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color={palette.red}>{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={palette.dim}>Enter to add  Esc to cancel</Text>
      </Box>
    </Box>
  );

  const renderCrawling = () => (
    <Box flexDirection="column">
      <Text color={palette.yellow} bold>Crawling...</Text>
      <Box marginTop={1}>
        <Text color={palette.cyan}>
          Progress: {crawlState.progress}/{crawlState.total} pages
        </Text>
      </Box>
      {crawlState.currentUrl && (
        <Box marginTop={1}>
          <Text color={palette.dim}>
            Current: {crawlState.currentUrl.length > 60 ? crawlState.currentUrl.slice(0, 57) + '...' : crawlState.currentUrl}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={palette.dim}>Please wait...</Text>
      </Box>
    </Box>
  );

  const renderConfirmDelete = () => (
    <Box flexDirection="column">
      <Text color={palette.red} bold>Delete Knowledge Base?</Text>
      <Box marginTop={1}>
        <Text>Are you sure you want to delete "{selectedKB?.name}"?</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={palette.dim}>This will remove all crawled content.</Text>
      </Box>
      <Box marginTop={2}>
        <Text color={palette.yellow}>y Yes  n No</Text>
      </Box>
    </Box>
  );

  const renderContent = () => {
    switch (viewState) {
      case 'list':
        return renderList();
      case 'create-name':
        return renderCreateName();
      case 'create-url':
        return renderCreateUrl();
      case 'create-depth':
        return renderCreateDepth();
      case 'detail':
        return renderDetail();
      case 'add-source':
        return renderAddSource();
      case 'crawling':
        return renderCrawling();
      case 'confirm-delete':
        return renderConfirmDelete();
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Knowledge Base ]' + '-'.repeat(42) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>Esc/b Go back</Text>
      </Box>
    </Box>
  );
};
