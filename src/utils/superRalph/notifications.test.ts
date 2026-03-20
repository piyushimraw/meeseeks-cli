import {describe, it, expect} from 'vitest';
import {buildNotificationArgs, formatNotification} from './notifications.js';

describe('notifications', () => {
  describe('formatNotification', () => {
    it('should format phase complete notification', () => {
      const msg = formatNotification('phase-complete', {phase: 1, title: 'Layout'});
      expect(msg.title).toBe('Super Ralph');
      expect(msg.body).toContain('Phase 1');
      expect(msg.body).toContain('Layout');
    });

    it('should format failure notification', () => {
      const msg = formatNotification('failure', {taskId: 'task-001', error: 'Test failed'});
      expect(msg.title).toBe('Super Ralph - Action Required');
      expect(msg.body).toContain('task-001');
    });

    it('should format session complete notification', () => {
      const msg = formatNotification('session-complete', {task: 'Build dashboard'});
      expect(msg.body).toContain('Build dashboard');
    });
  });

  describe('buildNotificationArgs', () => {
    it('should build osascript args array for macOS', () => {
      const args = buildNotificationArgs('Title', 'Body text');
      expect(args[0]).toBe('-e');
      expect(args[1]).toContain('Title');
      expect(args[1]).toContain('Body text');
    });
  });
});
