import fs from 'node:fs';
import path from 'node:path';

// Define types locally to avoid dependency on types file that may not exist yet
interface SuperRalphPhase {
  id: number;
  title: string;
  status: 'pending' | 'brainstorming' | 'planning' | 'executing' | 'completed' | 'failed';
}

interface SuperRalphSession {
  id: string;
  task: string;
  status: string;
  currentPhase: number;
  phases: SuperRalphPhase[];
  aiTool: 'claude-code';
  createdAt: string;
  updatedAt: string;
}

export function generateSessionId(taskDescription: string): string {
  const slug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

export function getSessionDir(projectRoot: string, sessionId: string): string {
  return path.join(projectRoot, '.super-ralph', 'sessions', sessionId);
}

export function getTasksDir(projectRoot: string, sessionId: string): string {
  return path.join(projectRoot, 'tasks', `super-ralph-${sessionId}`);
}

export function createSession(projectRoot: string, task: string): SuperRalphSession {
  const id = generateSessionId(task);
  const now = new Date().toISOString();

  const session: SuperRalphSession = {
    id,
    task,
    status: 'created',
    currentPhase: 0,
    phases: [],
    aiTool: 'claude-code',
    createdAt: now,
    updatedAt: now,
  };

  const sessionDir = getSessionDir(projectRoot, id);
  const tasksDir = getTasksDir(projectRoot, id);
  const learningsDir = path.join(sessionDir, 'learnings');

  fs.mkdirSync(sessionDir, {recursive: true});
  fs.mkdirSync(tasksDir, {recursive: true});
  fs.mkdirSync(learningsDir, {recursive: true});
  fs.writeFileSync(
    path.join(sessionDir, 'session.json'),
    JSON.stringify(session, null, 2),
  );

  return session;
}

export function loadSession(projectRoot: string, sessionId: string): SuperRalphSession | null {
  const sessionFile = path.join(getSessionDir(projectRoot, sessionId), 'session.json');
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
}

export function updateSession(
  projectRoot: string,
  sessionId: string,
  updates: Partial<Pick<SuperRalphSession, 'status' | 'currentPhase' | 'phases'>>,
): SuperRalphSession {
  const session = loadSession(projectRoot, sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updated: SuperRalphSession = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(getSessionDir(projectRoot, sessionId), 'session.json'),
    JSON.stringify(updated, null, 2),
  );

  return updated;
}
