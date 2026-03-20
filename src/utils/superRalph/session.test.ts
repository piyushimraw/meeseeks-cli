import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createSession,
  loadSession,
  updateSession,
  generateSessionId,
  getSessionDir,
  getTasksDir,
} from './session.js';

describe('session', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('generateSessionId', () => {
    it('should generate a slug from task description', () => {
      const id = generateSessionId('Build the analytics dashboard');
      expect(id).toMatch(/^build-the-analytics-dashboard-/);
    });

    it('should truncate long descriptions', () => {
      const id = generateSessionId('This is a very long task description that should be truncated to a reasonable length');
      expect(id.length).toBeLessThan(80);
    });

    it('should handle special characters', () => {
      const id = generateSessionId('Fix bug #123 (urgent!)');
      expect(id).not.toMatch(/[#()!]/);
    });
  });

  describe('getSessionDir', () => {
    it('should return correct path under .super-ralph/sessions/', () => {
      const dir = getSessionDir(tmpDir, 'my-session');
      expect(dir).toBe(path.join(tmpDir, '.super-ralph', 'sessions', 'my-session'));
    });
  });

  describe('getTasksDir', () => {
    it('should return correct path under tasks/', () => {
      const dir = getTasksDir(tmpDir, 'my-session');
      expect(dir).toBe(path.join(tmpDir, 'tasks', 'super-ralph-my-session'));
    });
  });

  describe('createSession', () => {
    it('should create session directories and write session.json', () => {
      const session = createSession(tmpDir, 'Build a dashboard');
      expect(session.task).toBe('Build a dashboard');
      expect(session.status).toBe('created');
      expect(session.phases).toEqual([]);
      expect(session.aiTool).toBe('claude-code');

      const sessionDir = getSessionDir(tmpDir, session.id);
      expect(fs.existsSync(path.join(sessionDir, 'session.json'))).toBe(true);

      const tasksDir = getTasksDir(tmpDir, session.id);
      expect(fs.existsSync(tasksDir)).toBe(true);
    });
  });

  describe('loadSession', () => {
    it('should load an existing session', () => {
      const created = createSession(tmpDir, 'Test task');
      const loaded = loadSession(tmpDir, created.id);
      expect(loaded).toEqual(created);
    });

    it('should return null for non-existent session', () => {
      const loaded = loadSession(tmpDir, 'nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields and write to disk', () => {
      const session = createSession(tmpDir, 'Test task');
      const updated = updateSession(tmpDir, session.id, {
        status: 'brainstorming',
        currentPhase: 1,
        phases: [{id: 1, title: 'Phase 1', status: 'brainstorming'}],
      });

      expect(updated.status).toBe('brainstorming');
      expect(updated.currentPhase).toBe(1);
      expect(updated.phases).toHaveLength(1);

      // Verify persisted
      const loaded = loadSession(tmpDir, session.id);
      expect(loaded?.status).toBe('brainstorming');
    });
  });
});
