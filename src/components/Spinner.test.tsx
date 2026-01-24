import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { Spinner } from './Spinner.js';

describe('Spinner', () => {
  describe('rendering', () => {
    it('displays the label text', () => {
      const { lastFrame } = render(<Spinner label="Loading data" />);

      expect(lastFrame()).toContain('Loading data');
    });

    it('displays subtext when provided', () => {
      const { lastFrame } = render(
        <Spinner label="Processing" subtext="Please wait..." />
      );

      expect(lastFrame()).toContain('Processing');
      expect(lastFrame()).toContain('Please wait...');
    });

    it('does not display subtext when not provided', () => {
      const { lastFrame } = render(<Spinner label="Loading" />);

      // Should contain label but not extra undefined text
      expect(lastFrame()).toContain('Loading');
      // Subtext area should not render
      expect(lastFrame()?.split('\n').length).toBeLessThanOrEqual(2);
    });
  });

  describe('user behavior', () => {
    it('shows loading indicator to inform user of async operation', () => {
      const { lastFrame } = render(
        <Spinner label="Fetching results" subtext="This may take a moment" />
      );

      // User should see both the action being performed and helpful context
      const frame = lastFrame();
      expect(frame).toContain('Fetching results');
      expect(frame).toContain('This may take a moment');
    });
  });
});
