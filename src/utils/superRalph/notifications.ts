import {execFile} from 'node:child_process';

interface NotificationMessage {
  title: string;
  body: string;
}

type NotificationType = 'phase-complete' | 'failure' | 'session-complete';

export function formatNotification(type: NotificationType, data: Record<string, unknown>): NotificationMessage {
  switch (type) {
    case 'phase-complete':
      return {
        title: 'Super Ralph',
        body: `Phase ${data.phase}: "${data.title}" completed successfully.`,
      };
    case 'failure':
      return {
        title: 'Super Ralph - Action Required',
        body: `Task ${data.taskId} failed: ${data.error}`,
      };
    case 'session-complete':
      return {
        title: 'Super Ralph',
        body: `All phases complete for: ${data.task}`,
      };
  }
}

export function buildNotificationArgs(title: string, body: string): string[] {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedBody = body.replace(/"/g, '\\"');
  return ['-e', `display notification "${escapedBody}" with title "${escapedTitle}"`];
}

export function sendNotification(type: NotificationType, data: Record<string, unknown>): void {
  const {title, body} = formatNotification(type, data);
  const args = buildNotificationArgs(title, body);
  execFile('osascript', args, () => {
    // Fire and forget
  });
}
