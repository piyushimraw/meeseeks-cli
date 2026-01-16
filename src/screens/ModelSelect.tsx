import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {useCopilot} from '../context/CopilotContext.js';
import {fetchAvailableModels, type FetchModelsResult} from '../utils/copilot.js';
import type {CopilotModel} from '../types/index.js';

const palette = {
  cyan: '#00DFFF',
  orange: '#FF7A00',
  yellow: '#FFD700',
  green: '#00FF88',
  red: '#FF4444',
  dim: '#666666',
};

type ScreenState = 'loading' | 'loaded' | 'error' | 'not-connected';

interface ModelSelectProps {
  onBack: () => void;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({onBack}) => {
  const {authState, getToken, setModel} = useCopilot();
  const [state, setState] = useState<ScreenState>('loading');
  const [models, setModels] = useState<CopilotModel[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelSource, setModelSource] = useState<'api' | 'fallback'>('fallback');

  useEffect(() => {
    if (!authState.isConnected) {
      setState('not-connected');
      return;
    }

    const loadModels = async () => {
      setState('loading');
      const token = getToken();
      
      if (!token) {
        setState('not-connected');
        return;
      }

      const result: FetchModelsResult = await fetchAvailableModels(token);
      
      if (result.success && result.models && result.models.length > 0) {
        setModels(result.models);
        setModelSource(result.source);
        
        // Find current model index
        const currentModelIndex = result.models.findIndex(
          (m) => m.id === authState.selectedModel
        );
        if (currentModelIndex >= 0) {
          setSelectedIndex(currentModelIndex);
        }
        
        setState('loaded');
      } else {
        setError(result.error || 'Failed to load models');
        setState('error');
      }
    };

    loadModels();
  }, [authState.isConnected, authState.selectedModel, getToken]);

  useInput((input, key) => {
    if (input === 'b' || key.escape) {
      onBack();
      return;
    }

    if (state === 'loaded') {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
      }

      if (key.return) {
        const selectedModel = models[selectedIndex];
        if (selectedModel) {
          setModel(selectedModel.id);
          onBack();
        }
      }
    }

    if (state === 'error' || state === 'not-connected') {
      if (input === 'r') {
        setState('loading');
        // Re-trigger the effect
        setModels([]);
      }
    }
  });

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow}>Loading available models...</Text>
            <Box marginTop={1}>
              <Text color={palette.dim}>Fetching from Copilot API</Text>
            </Box>
          </Box>
        );

      case 'not-connected':
        return (
          <Box flexDirection="column">
            <Text color={palette.yellow} bold>
              Not Connected to Copilot
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text>
                Please connect to GitHub Copilot first before selecting a model.
              </Text>
              <Box marginTop={1}>
                <Text color={palette.cyan}>
                  Go to "Connect to Copilot" from the main menu.
                </Text>
              </Box>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box flexDirection="column">
            <Text color={palette.red} bold>
              Error Loading Models
            </Text>
            <Box marginTop={1}>
              <Text color={palette.red}>{error}</Text>
            </Box>
            <Box marginTop={2}>
              <Text color={palette.yellow}>Press 'r' to retry</Text>
            </Box>
          </Box>
        );

      case 'loaded':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={palette.green} bold>
                Select AI Model
              </Text>
              {modelSource === 'fallback' && (
                <Text color={palette.dim}> (using cached list)</Text>
              )}
            </Box>

            {/* Group models by vendor */}
            {renderModelList()}

            <Box marginTop={2} flexDirection="column">
              <Text color={palette.dim}>
                Current: <Text color={palette.cyan}>{authState.selectedModel}</Text>
              </Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderModelList = () => {
    // Group by vendor
    const vendors = [...new Set(models.map((m) => m.vendor || 'Other'))];
    
    return (
      <Box flexDirection="column">
        {vendors.map((vendor) => {
          const vendorModels = models.filter((m) => (m.vendor || 'Other') === vendor);
          return (
            <Box key={vendor} flexDirection="column" marginBottom={1}>
              <Text color={palette.yellow} bold>
                {vendor}
              </Text>
              <Box flexDirection="column" marginLeft={2}>
                {vendorModels.map((model) => {
                  const globalIndex = models.indexOf(model);
                  const isSelected = globalIndex === selectedIndex;
                  const isCurrent = model.id === authState.selectedModel;
                  
                  return (
                    <Box key={model.id}>
                      <Text color={isSelected ? palette.cyan : undefined}>
                        {isSelected ? '> ' : '  '}
                        {model.name}
                      </Text>
                      {isCurrent && (
                        <Text color={palette.green}> (current)</Text>
                      )}
                      <Text color={palette.dim}> [{model.id}]</Text>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Select Model ]' + '-'.repeat(44) + '+'}
      </Text>

      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        {renderContent()}
      </Box>

      <Text color={palette.orange}>{'+-' + '-'.repeat(60) + '+'}</Text>

      <Box marginTop={1} marginLeft={2}>
        <Text color={palette.dim}>
          {state === 'loaded'
            ? 'Up/Down Navigate  Enter Select  Esc/b Go back'
            : 'Esc/b Go back'}
        </Text>
      </Box>
    </Box>
  );
};
