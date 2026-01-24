import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Screen } from '../types/index.js';
import type { Key } from 'ink';

// Mock the contexts and ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual<typeof import('ink')>('ink');
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
    useInput: vi.fn(),
  };
});

vi.mock('../context/CopilotContext.js', () => ({
  useCopilot: () => ({
    authState: {
      isConnected: false,
      isInitializing: false,
      selectedModel: 'gpt-4o',
    },
  }),
}));

vi.mock('../context/JiraContext.js', () => ({
  useJira: () => ({
    state: {
      isConnected: false,
      isInitialized: false,
    },
  }),
}));

vi.mock('../utils/copilot.js', () => ({
  getSourceDisplayName: (source: string) => source,
}));

import { Menu } from './Menu.js';
import { useInput } from 'ink';

// Type for the input handler
type InputHandler = (input: string, key: Key) => void;

// Helper to create a Key object with defaults
const createKey = (overrides: Partial<Key> = {}): Key => ({
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  ...overrides,
});

describe('Menu', () => {
  let mockOnSelect: (screen: Screen) => void;
  let capturedInputHandler: InputHandler | null;

  beforeEach(() => {
    mockOnSelect = vi.fn() as (screen: Screen) => void;
    capturedInputHandler = null;
    vi.mocked(useInput).mockImplementation((handler: InputHandler) => {
      capturedInputHandler = handler;
    });
  });

  describe('rendering', () => {
    it('displays the main menu header', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      expect(lastFrame()).toContain('Main Menu');
    });

    it('displays provider section with menu items', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      expect(lastFrame()).toContain('PROVIDERS');
      expect(lastFrame()).toContain('Connect to Copilot');
      expect(lastFrame()).toContain('Select Model');
    });

    it('displays agents section with menu items', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      expect(lastFrame()).toContain('AGENTS');
      expect(lastFrame()).toContain('Create a QA Plan');
      expect(lastFrame()).toContain('Sprint Tickets');
      expect(lastFrame()).toContain('Test Watcher');
    });

    it('displays tools section with menu items', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      expect(lastFrame()).toContain('TOOLS');
      expect(lastFrame()).toContain('Meta Prompting Setup');
      expect(lastFrame()).toContain('View Git Changes');
      expect(lastFrame()).toContain('Knowledge Base');
      expect(lastFrame()).toContain('Integration Settings');
    });

    it('displays keyboard hints', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      expect(lastFrame()).toContain('Navigate');
      expect(lastFrame()).toContain('Select');
      expect(lastFrame()).toContain('Quit');
    });

    it('shows selection indicator on first item', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      // First item should have the > indicator
      expect(lastFrame()).toContain('> Connect to Copilot');
    });
  });

  describe('user behavior', () => {
    it('allows navigation through menu items with keyboard', () => {
      render(<Menu onSelect={mockOnSelect} />);

      // Verify input handler was captured
      expect(capturedInputHandler).not.toBeNull();
    });

    it('calls onSelect with correct screen when user presses enter', () => {
      render(<Menu onSelect={mockOnSelect} />);

      // Simulate pressing enter on first item (Connect to Copilot)
      capturedInputHandler?.('', createKey({ return: true }));

      expect(mockOnSelect).toHaveBeenCalledWith('copilot-connect');
    });

    it('navigates to next item on down arrow', () => {
      const { lastFrame } = render(<Menu onSelect={mockOnSelect} />);

      // Initial state - first item selected
      expect(lastFrame()).toContain('> Connect to Copilot');

      // Navigate down
      capturedInputHandler?.('', createKey({ downArrow: true }));

      // Now press enter - should select second item (Select Model)
      capturedInputHandler?.('', createKey({ return: true }));

      expect(mockOnSelect).toHaveBeenCalledWith('model-select');
    });

    it('wraps to first item when navigating past last', () => {
      render(<Menu onSelect={mockOnSelect} />);

      // Navigate up from first item should wrap to last
      capturedInputHandler?.('', createKey({ upArrow: true }));
      capturedInputHandler?.('', createKey({ return: true }));

      // Should select Integration Settings (last item)
      expect(mockOnSelect).toHaveBeenCalledWith('settings');
    });

    it('opens settings with comma shortcut', () => {
      render(<Menu onSelect={mockOnSelect} />);

      capturedInputHandler?.(',', createKey());

      expect(mockOnSelect).toHaveBeenCalledWith('settings');
    });
  });
});

describe('Menu with connected Copilot', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows connected status when Copilot is connected', async () => {
    vi.doMock('../context/CopilotContext.js', () => ({
      useCopilot: () => ({
        authState: {
          isConnected: true,
          isInitializing: false,
          selectedModel: 'claude-3.5-sonnet',
          tokenSource: 'vscode',
        },
      }),
    }));

    // Re-import Menu with new mock
    const { Menu: MenuConnected } = await import('./Menu.js');
    const { render: renderFresh } = await import('ink-testing-library');

    const mockOnSelect = vi.fn();
    const { lastFrame } = renderFresh(<MenuConnected onSelect={mockOnSelect} />);

    expect(lastFrame()).toContain('[Connected: vscode]');
    expect(lastFrame()).toContain('[claude-3.5-sonnet]');
  });
});

describe('Menu with connected Jira', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows connected status when Jira is connected', async () => {
    vi.doMock('../context/JiraContext.js', () => ({
      useJira: () => ({
        state: {
          isConnected: true,
          isInitialized: true,
        },
      }),
    }));

    // Re-import Menu with new mock
    const { Menu: MenuJira } = await import('./Menu.js');
    const { render: renderFresh } = await import('ink-testing-library');

    const mockOnSelect = vi.fn();
    const { lastFrame } = renderFresh(<MenuJira onSelect={mockOnSelect} />);

    // Sprint Tickets should show connected
    expect(lastFrame()).toContain('Sprint Tickets');
    expect(lastFrame()).toContain('[Connected]');
  });
});
