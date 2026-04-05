import React from 'react';
import {describe, it, expect} from 'vitest';
import {render} from 'ink-testing-library';
import {SuperRalph} from './SuperRalph.js';

describe('SuperRalph', () => {
  it('should render the task input prompt on idle', () => {
    const {lastFrame} = render(<SuperRalph onBack={() => {}} />);
    const frame = lastFrame();
    expect(frame).toContain('Super Ralph');
    expect(frame).toContain('task');
  });

  it('should show back hint', () => {
    const {lastFrame} = render(<SuperRalph onBack={() => {}} />);
    const frame = lastFrame();
    expect(frame).toContain('Esc');
  });
});
