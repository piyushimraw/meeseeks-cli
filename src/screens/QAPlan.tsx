import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {useCopilot} from '../context/CopilotContext.js';
import {useKnowledgeBase} from '../context/KnowledgeBaseContext.js';
import {chatWithCopilot, type ChatResponse} from '../utils/copilot.js';
import {getBranchDiff, getCurrentBranch, getDefaultBranch} from '../utils/git.js';
import type {KnowledgeBase, SearchResult} from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type QAPlanState = 'idle' | 'select-kb' | 'searching' | 'generating' | 'complete' | 'error';

interface QAPlanProps {
  onBack: () => void;
}

export const QAPlan: React.FC<QAPlanProps> = ({onBack}) => {
  const {authState, getToken} = useCopilot();
  const {knowledgeBases, getKBContent, searchKB, isIndexed, formatSearchContext} = useKnowledgeBase();
  const [state, setState] = useState<QAPlanState>('idle');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKBIndex, setSelectedKBIndex] = useState(0);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [gitDiff, setGitDiff] = useState<string>('');
  const [branchInfo, setBranchInfo] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<ChatResponse['usage'] | null>(null);

  // Load git diff on mount
  useEffect(() => {
    const diff = getBranchDiff();
    setGitDiff(diff);

    const current = getCurrentBranch();
    const base = getDefaultBranch();
    if (current && current !== base) {
      setBranchInfo(`${current} -> ${base}`);
    } else {
      setBranchInfo(current || 'unknown');
    }
  }, []);

  const handleGenerate = async (kb: KnowledgeBase | null) => {
    const token = getToken();
    if (!token) {
      setError('No Copilot token available. Please connect first.');
      setState('error');
      return;
    }

    setError(null);

    // Get KB content using RAG if indexed, otherwise use full content
    let kbContent = '';
    if (kb) {
      const kbIndexed = isIndexed(kb.id);

      if (kbIndexed) {
        // Use RAG search - search with a query derived from the git diff
        setState('searching');

        // Create a search query from the git diff summary
        const searchQuery = `Code changes: ${gitDiff.slice(0, 500)}`;

        try {
          const results = await searchKB(kb.id, searchQuery, 10);
          setSearchResults(results);
          kbContent = formatSearchContext(results);
        } catch (err) {
          // Fall back to full content on error
          kbContent = getKBContent(kb.id);
        }
      } else {
        // Fall back to full content if not indexed
        kbContent = getKBContent(kb.id);
      }
    }

    setState('generating');

    // Build the system prompt
    let systemPrompt = 'You are a QA engineer assistant. Generate comprehensive, actionable test plans for code changes.';
    if (kbContent) {
      systemPrompt += `\n\n## Reference Documentation\nUse the following documentation to understand the project context and ensure test coverage aligns with documented features:\n\n${kbContent}`;
    }

    // Build the user prompt
    let userPrompt = 'Generate a QA test plan for the following code changes. Include:\n';
    userPrompt += '1. Summary of changes\n';
    userPrompt += '2. Areas affected\n';
    userPrompt += '3. Test cases with clear steps\n';
    userPrompt += '4. Edge cases to consider\n';
    userPrompt += '5. Regression testing recommendations\n\n';
    userPrompt += '## Code Changes (Git Diff)\n\n```diff\n' + gitDiff + '\n```';

    const result = await chatWithCopilot(token, [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]);

    if (result.success && result.content) {
      setOutput(result.content);
      setModelInfo(result.model || null);
      setUsageInfo(result.usage || null);
      setState('complete');
    } else {
      setError(result.error || 'Failed to generate QA plan');
      setState('error');
    }
  };

  useInput((input, key) => {
    if (input === 'b' || key.escape) {
      if (state === 'select-kb') {
        setState('idle');
      } else {
        onBack();
      }
      return;
    }

    if (state === 'idle' && input === 'g' && authState.isConnected) {
      if (knowledgeBases.length > 0) {
        setState('select-kb');
      } else {
        handleGenerate(null);
      }
      return;
    }

    if (state === 'select-kb') {
      const options = knowledgeBases.length + 1; // +1 for "Skip" option
      if (key.upArrow) {
        setSelectedKBIndex(prev => (prev > 0 ? prev - 1 : options - 1));
      } else if (key.downArrow) {
        setSelectedKBIndex(prev => (prev < options - 1 ? prev + 1 : 0));
      } else if (key.return) {
        if (selectedKBIndex < knowledgeBases.length) {
          setSelectedKB(knowledgeBases[selectedKBIndex]);
          handleGenerate(knowledgeBases[selectedKBIndex]);
        } else {
          // Skip - generate without KB
          setSelectedKB(null);
          handleGenerate(null);
        }
      }
      return;
    }

    if ((state === 'complete' || state === 'error') && input === 'r') {
      setState('idle');
      setOutput(null);
      setError(null);
      setSelectedKB(null);
      setSelectedKBIndex(0);
      setSearchResults([]);
      setModelInfo(null);
      setUsageInfo(null);
    }
  });

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              QA Plan Generator
            </Text>

            <Box marginTop={1} flexDirection="column">
              <Text>Generate test plans based on your code changes.</Text>

              <Box marginTop={1} flexDirection="column" marginLeft={2}>
                <Text color={palette.green}>
                  - Analyzes git diff ({branchInfo})
                </Text>
                <Text color={palette.green}>
                  - Uses Knowledge Base context (optional)
                </Text>
                <Text color={palette.green}>
                  - Generates comprehensive test cases
                </Text>
                <Text color={palette.green}>
                  - Identifies edge cases and regression areas
                </Text>
              </Box>

              {gitDiff === '(no changes)' ? (
                <Box marginTop={2}>
                  <Text color={palette.yellow}>
                    No code changes detected. Commit or stage some changes first.
                  </Text>
                </Box>
              ) : null}
            </Box>

            {authState.isConnected ? (
              <Box marginTop={2}>
                <Text color={palette.yellow}>
                  Press 'g' to generate QA plan
                  {knowledgeBases.length > 0 ? ' (will select Knowledge Base)' : ''}
                </Text>
              </Box>
            ) : (
              <Box marginTop={2} flexDirection="column">
                <Text color={palette.red}>
                  Not connected to Copilot
                </Text>
                <Text color={palette.dim}>
                  Please connect to Copilot first from the main menu
                </Text>
              </Box>
            )}
          </Box>
        );

      case 'select-kb':
        return (
          <Box flexDirection="column">
            <Text color={palette.cyan} bold>
              Select Knowledge Base
            </Text>
            <Text color={palette.dim}>
              Choose a knowledge base to provide context for the QA plan:
            </Text>

            <Box flexDirection="column" marginTop={1}>
              {knowledgeBases.map((kb, index) => (
                <Box key={kb.id}>
                  <Text color={index === selectedKBIndex ? palette.cyan : undefined}>
                    {index === selectedKBIndex ? '> ' : '  '}
                    {kb.name}
                  </Text>
                  <Text color={palette.dim}>
                    {' '}({kb.totalPages} pages)
                  </Text>
                </Box>
              ))}
              <Box>
                <Text color={selectedKBIndex === knowledgeBases.length ? palette.cyan : undefined}>
                  {selectedKBIndex === knowledgeBases.length ? '> ' : '  '}
                  Skip (no knowledge base)
                </Text>
              </Box>
            </Box>

            <Box marginTop={2}>
              <Text color={palette.dim}>
                Up/Down to select  Enter to confirm  Esc to go back
              </Text>
            </Box>
          </Box>
        );

      case 'searching':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Searching knowledge base...</Text>
            {selectedKB && (
              <Box marginTop={1}>
                <Text color={palette.dim}>
                  Finding relevant context from: {selectedKB.name}
                </Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Using semantic search to find relevant documentation
              </Text>
            </Box>
          </Box>
        );

      case 'generating':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Generating QA plan...</Text>
            {selectedKB && (
              <Box marginTop={1}>
                <Text color={palette.dim}>
                  Using knowledge base: {selectedKB.name}
                  {searchResults.length > 0 && ` (${searchResults.length} relevant chunks)`}
                </Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={palette.dim}>
                Analyzing changes with GitHub Copilot (model: gpt-4o)
              </Text>
            </Box>
          </Box>
        );

      case 'complete':
        return (
          <Box flexDirection="column">
            <Text color={palette.green} bold>
              QA Plan Generated
            </Text>
            {selectedKB && (
              <Text color={palette.dim}>
                Based on: {selectedKB.name}
                {searchResults.length > 0 && ` (using ${searchResults.length} relevant chunks via RAG)`}
              </Text>
            )}
            <Box marginTop={1} flexDirection="column">
              {output?.split('\n').map((line, i) => (
                <Text key={i} color={palette.dim}>
                  {line}
                </Text>
              ))}
            </Box>
            {(modelInfo || usageInfo) && (
              <Box marginTop={1}>
                <Text color={palette.dim}>
                  {modelInfo && `Model: ${modelInfo}`}
                  {modelInfo && usageInfo && ' | '}
                  {usageInfo && `Tokens: ${usageInfo.prompt_tokens.toLocaleString()} (prompt) + ${usageInfo.completion_tokens.toLocaleString()} (completion) = ${usageInfo.total_tokens.toLocaleString()} total`}
                </Text>
              </Box>
            )}
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to reset</Text>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Error
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to retry</Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Create a QA Plan ]' + '-'.repeat(40) + '+'}
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
