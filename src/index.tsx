#!/usr/bin/env node
import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, render} from 'ink';
import {meeseeksArt, tagline} from './ascii.js';

const palette = {
  cyan: '#00DFFF',        // Meeseeks blue (bright cyan)
  darkCyan: '#0099CC',    // Darker cyan for depth
  orange: '#FF7A00',      // SolarWinds orange
  teal: '#00D9D9',        // Teal highlight
  white: '#FFFFFF',       // White
  yellow: '#FFD700',      // Gold/yellow accent
  magenta: '#FF00FF',     // Cyberpunk magenta
  green: '#00FF88',       // Neon green
};

const GLITCH_FRAMES = 8;
const GLITCH_INTERVAL = 60;
const SCANLINE_INTERVAL = 18;
const FINAL_HOLD = 1500;

const glitchPalette = [palette.cyan, palette.magenta, palette.teal, palette.orange, palette.green];

const randomInt = (max: number) => Math.floor(Math.random() * max);

const glitchText = (source: string) => {
  const chars = source.split('');
  const swaps = Math.max(8, Math.floor(chars.length * 0.05));
  for (let i = 0; i < swaps; i += 1) {
    const index = randomInt(chars.length);
    if (chars[index] === '\n' || chars[index] === ' ') {
      continue;
    }
    const glitchChars = ['█', '░', '▒', '▓', '▀', '▄', '▌', '▐', '╳', '◢', '◣', '◤', '◥'];
    chars[index] = glitchChars[randomInt(glitchChars.length)];
  }
  return chars.join('');
};

const App = () => {
  const lines = useMemo(() => meeseeksArt.trimEnd().split('\n'), []);
  const [frame, setFrame] = useState(0);
  const [scanline, setScanline] = useState(0);
  const [phase, setPhase] = useState<'glitch' | 'scan' | 'final'>('glitch');

  useEffect(() => {
    if (phase !== 'glitch') return;
    const timer = setInterval(() => {
      setFrame((current) => {
        if (current + 1 >= GLITCH_FRAMES) {
          setPhase('scan');
          return current;
        }
        return current + 1;
      });
    }, GLITCH_INTERVAL);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'scan') return;
    const timer = setInterval(() => {
      setScanline((current) => {
        if (current + 1 >= lines.length) {
          setPhase('final');
          return current;
        }
        return current + 1;
      });
    }, SCANLINE_INTERVAL);
    return () => clearInterval(timer);
  }, [phase, lines.length]);

  useEffect(() => {
    if (phase !== 'final') return;
    const timer = setTimeout(() => {
      process.exit(0);
    }, FINAL_HOLD);
    return () => clearTimeout(timer);
  }, [phase]);

  const displayLines = lines.map((line, index) => {
    if (phase === 'scan' && index > scanline) return '';
    if (phase === 'glitch') return glitchText(line);
    return line;
  });

  const color = phase === 'glitch'
    ? glitchPalette[frame % glitchPalette.length]
    : palette.cyan;

  const border = phase === 'final' ? palette.orange : palette.teal;

  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      {/* Top border */}
      <Text color={border}>{'╔' + '═'.repeat(62) + '╗'}</Text>
      
      {/* ASCII Art */}
      <Box flexDirection="column">
        {displayLines.map((line, i) => (
          <Text key={i} color={color}>{'║ '}{line.padEnd(60)}{'║'}</Text>
        ))}
      </Box>

      {/* Bottom border */}
      <Text color={border}>{'╚' + '═'.repeat(62) + '╝'}</Text>
      
      {/* Tagline */}
      <Box marginTop={1} justifyContent="center">
        <Text color={palette.yellow} bold>
          {'  '}★ {phase === 'final' ? tagline : '[ INITIALIZING... ]'} ★
        </Text>
      </Box>

      {/* Status line */}
      <Box marginTop={1}>
        <Text color={phase === 'final' ? palette.green : palette.magenta} dimColor={phase !== 'final'}>
          {phase === 'final' 
            ? '  ► Welcome to Meeseeks CLI - Ready to help!' 
            : `  ► Loading${'.'.repeat((frame % 3) + 1)}`}
        </Text>
      </Box>
    </Box>
  );
};

render(<App />);
