import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useCredentials } from '../context/CredentialContext.js';
import { Spinner } from '../components/Spinner.js';
import { ErrorMessage, formatApiError } from '../components/ErrorMessage.js';
import type { ServiceDefinition, ActionableError } from '../types/index.js';

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
  | 'detail'
  | 'add-credential'
  | 'testing'
  | 'confirm-delete';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const {
    state,
    getAllServiceDefinitions,
    getServiceStatus,
    getServiceDefinition,
    saveCredentials,
    deleteCredentials,
    testConnection,
  } = useCredentials();

  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null);

  // Wizard state for adding credentials
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardFields, setWizardFields] = useState<Record<string, string>>({});
  const [currentFieldValue, setCurrentFieldValue] = useState('');

  // Error state
  const [error, setError] = useState<ActionableError | null>(null);

  const services = getAllServiceDefinitions();

  // Reset wizard when starting fresh
  const startAddCredential = (service: ServiceDefinition) => {
    setSelectedService(service);
    setWizardStep(0);
    setWizardFields({});
    setCurrentFieldValue('');
    setError(null);
    setViewState('add-credential');
  };

  // Handle wizard field submission
  const handleFieldSubmit = async () => {
    if (!selectedService) return;

    const currentField = selectedService.fields[wizardStep];
    const value = currentFieldValue.trim();

    // Validate field
    if (currentField.validation) {
      const validationError = currentField.validation(value);
      if (validationError) {
        setError({
          message: validationError,
          retryable: false,
        });
        return;
      }
    }

    // Save field value
    const newFields = { ...wizardFields, [currentField.key]: value };
    setWizardFields(newFields);

    // Check if more fields
    if (wizardStep < selectedService.fields.length - 1) {
      // Move to next field
      setWizardStep(wizardStep + 1);
      setCurrentFieldValue('');
      setError(null);
    } else {
      // All fields collected - test connection (per CONTEXT.md: auto-test on submit)
      setError(null);
      setViewState('testing');

      const result = await testConnection(selectedService.id, newFields);

      if (result.success) {
        // Save credentials only if test passes (per CONTEXT.md)
        const saveResult = await saveCredentials(selectedService.id, newFields);
        if (saveResult.success) {
          setViewState('detail');
        } else {
          setError(formatApiError(new Error(saveResult.error || 'Failed to save')));
          setViewState('add-credential');
        }
      } else {
        setError(formatApiError(new Error(result.error || 'Connection test failed')));
        setViewState('add-credential');
      }
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!selectedService) return;
    await deleteCredentials(selectedService.id);
    setViewState('list');
    setSelectedService(null);
  };

  useInput((input, key) => {
    // Disable input during testing
    if (viewState === 'testing') return;

    // Global back navigation
    if (input === 'b' || key.escape) {
      if (viewState === 'list') {
        onBack();
      } else if (viewState === 'detail' || viewState === 'confirm-delete') {
        setViewState('list');
        setSelectedService(null);
        setError(null);
      } else if (viewState === 'add-credential') {
        if (wizardStep > 0) {
          // Go back one step in wizard
          setWizardStep(wizardStep - 1);
          const prevField = selectedService?.fields[wizardStep - 1];
          if (prevField) {
            setCurrentFieldValue(wizardFields[prevField.key] || '');
          }
          setError(null);
        } else {
          // Back to detail or list
          if (selectedService && getServiceStatus(selectedService.id)?.isConfigured) {
            setViewState('detail');
          } else {
            setViewState('list');
            setSelectedService(null);
          }
          setError(null);
        }
      }
      return;
    }

    // List view controls
    if (viewState === 'list') {
      if (key.upArrow) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : services.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex(prev => (prev < services.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        const service = services[selectedIndex];
        setSelectedService(service);
        const status = getServiceStatus(service.id);
        if (status?.isConfigured) {
          setViewState('detail');
        } else {
          startAddCredential(service);
        }
      }
      return;
    }

    // Detail view controls
    if (viewState === 'detail' && selectedService) {
      if (input === 'e') {
        startAddCredential(selectedService);
      } else if (input === 'd') {
        setViewState('confirm-delete');
      }
      return;
    }

    // Delete confirmation
    if (viewState === 'confirm-delete') {
      if (input === 'y') {
        handleDelete();
      } else if (input === 'n') {
        setViewState('detail');
      }
      return;
    }

    // Retry on error
    if (error?.retryable && input === 'r') {
      if (viewState === 'add-credential' && selectedService) {
        // Retry from current step
        setError(null);
      }
    }
  });

  const renderList = () => (
    <Box flexDirection="column">
      <Text color={palette.cyan} bold>Integration Settings</Text>
      <Text color={palette.dim}>Manage service credentials and connections</Text>

      {state.isLoading ? (
        <Box marginTop={1}>
          <Spinner label="Loading services..." />
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {services.map((service, index) => {
            const status = getServiceStatus(service.id);
            const isSelected = index === selectedIndex;

            return (
              <Box key={service.id}>
                <Text color={isSelected ? palette.cyan : undefined}>
                  {isSelected ? '> ' : '  '}
                  {service.name}
                </Text>
                {/* Connection badge per CONTEXT.md */}
                <Text color={status?.isConfigured ? palette.green : palette.dim}>
                  {status?.isConfigured ? ' [Connected]' : ' [Not configured]'}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={2}>
        <Text color={palette.dim}>
          Up/Down Navigate  Enter Configure  b Back
        </Text>
      </Box>
    </Box>
  );

  const renderDetail = () => {
    if (!selectedService) return null;
    const status = getServiceStatus(selectedService.id);

    return (
      <Box flexDirection="column">
        <Text color={palette.cyan} bold>{selectedService.name}</Text>
        <Text color={palette.dim}>{selectedService.description}</Text>

        <Box marginTop={1}>
          <Text color={status?.isConfigured ? palette.green : palette.red}>
            Status: {status?.isConfigured ? 'Connected' : 'Not configured'}
          </Text>
        </Box>

        {status?.lastVerified && (
          <Box>
            <Text color={palette.dim}>
              Last verified: {new Date(status.lastVerified).toLocaleString()}
            </Text>
          </Box>
        )}

        {/* Masked credentials per CONTEXT.md */}
        {status?.isConfigured && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.yellow} bold>Credentials</Text>
            {selectedService.fields.map(field => (
              <Box key={field.key} marginLeft={2}>
                <Text>{field.label}: </Text>
                <Text color={palette.dim}>
                  {field.type === 'password' ? '********' : (status.fields[field.key] || '(not set)')}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        <Box marginTop={2}>
          <Text color={palette.dim}>
            {status?.isConfigured
              ? 'e Edit credentials  d Delete  b Back'
              : 'Enter to configure  b Back'}
          </Text>
        </Box>
      </Box>
    );
  };

  const renderAddCredential = () => {
    if (!selectedService) return null;
    const currentField = selectedService.fields[wizardStep];

    return (
      <Box flexDirection="column">
        <Text color={palette.cyan} bold>Configure {selectedService.name}</Text>
        <Text color={palette.dim}>
          Step {wizardStep + 1} of {selectedService.fields.length}
        </Text>

        {/* Show previous fields */}
        {wizardStep > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {selectedService.fields.slice(0, wizardStep).map(f => (
              <Box key={f.key}>
                <Text color={palette.dim}>{f.label}: </Text>
                <Text color={palette.dim}>
                  {f.type === 'password' ? '********' : wizardFields[f.key]}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Current field input */}
        <Box marginTop={1}>
          <Text>{currentField.label}: </Text>
          <TextInput
            value={currentFieldValue}
            onChange={setCurrentFieldValue}
            onSubmit={handleFieldSubmit}
            placeholder={currentField.placeholder}
            mask={currentField.type === 'password' ? '*' : undefined}
          />
        </Box>

        {error && (
          <Box marginTop={1}>
            <ErrorMessage error={error} showRetryHint={false} />
          </Box>
        )}

        <Box marginTop={1}>
          <Text color={palette.dim}>
            Enter to continue  Esc to go back
          </Text>
        </Box>
      </Box>
    );
  };

  const renderTesting = () => (
    <Box flexDirection="column">
      <Spinner
        label="Testing connection..."
        subtext="Please wait while we verify your credentials"
      />
    </Box>
  );

  const renderConfirmDelete = () => (
    <Box flexDirection="column">
      <Text color={palette.red} bold>Delete Credentials?</Text>
      <Box marginTop={1}>
        <Text>Are you sure you want to delete {selectedService?.name} credentials?</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={palette.dim}>This will remove the credentials from your system keychain.</Text>
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
      case 'detail':
        return renderDetail();
      case 'add-credential':
        return renderAddCredential();
      case 'testing':
        return renderTesting();
      case 'confirm-delete':
        return renderConfirmDelete();
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={palette.orange}>
        {'+-[ Settings ]' + '-'.repeat(49) + '+'}
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
