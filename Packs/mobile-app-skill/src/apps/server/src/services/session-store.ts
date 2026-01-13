import { join } from 'node:path';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: {
    name: string;
    input?: any;
    result?: string;
    isError?: boolean;
  }[];
}

export interface Session {
  id: string;
  name: string;
  claudeSessionId?: string; // The session ID from claude CLI for --resume
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const SESSIONS_DIR = join(process.env.HOME || '/', '.config/pai/Skills/MobileApp/sessions');

class SessionStore {
  private sessions = new Map<string, Session>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await mkdir(SESSIONS_DIR, { recursive: true });

      // Load existing sessions
      const files = await readdir(SESSIONS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await readFile(join(SESSIONS_DIR, file), 'utf-8');
            const session = JSON.parse(content) as Session;
            this.sessions.set(session.id, session);
          } catch (e) {
            console.error(`Failed to load session ${file}:`, e);
          }
        }
      }

      console.log(`[SessionStore] Loaded ${this.sessions.size} sessions`);
      this.initialized = true;
    } catch (e) {
      console.error('[SessionStore] Init error:', e);
      this.initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  private generateId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async create(name?: string): Promise<Session> {
    await this.init();

    const id = this.generateId();
    const now = new Date().toISOString();

    const session: Session = {
      id,
      name: name || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(id, session);
    await this.persist(session);

    return session;
  }

  async get(id: string): Promise<Session | null> {
    await this.init();
    return this.sessions.get(id) || null;
  }

  async list(): Promise<Session[]> {
    await this.init();
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id'>): Promise<Message> {
    await this.init();

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
    };

    session.messages.push(fullMessage);
    session.updatedAt = new Date().toISOString();

    await this.persist(session);
    return fullMessage;
  }

  async updateMessage(sessionId: string, messageId: string, updates: Partial<Message>): Promise<void> {
    await this.init();

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message = session.messages.find(m => m.id === messageId);
    if (message) {
      Object.assign(message, updates);
      session.updatedAt = new Date().toISOString();
      await this.persist(session);
    }
  }

  async setClaudeSessionId(sessionId: string, claudeSessionId: string): Promise<void> {
    await this.init();

    const session = this.sessions.get(sessionId);
    if (session) {
      session.claudeSessionId = claudeSessionId;
      session.updatedAt = new Date().toISOString();
      await this.persist(session);
    }
  }

  async delete(id: string): Promise<boolean> {
    await this.init();

    if (!this.sessions.has(id)) {
      return false;
    }

    this.sessions.delete(id);

    try {
      await unlink(join(SESSIONS_DIR, `${id}.json`));
    } catch (e) {
      // File might not exist
    }

    return true;
  }

  async rename(id: string, name: string): Promise<boolean> {
    await this.init();

    const session = this.sessions.get(id);
    if (!session) return false;

    session.name = name;
    session.updatedAt = new Date().toISOString();
    await this.persist(session);

    return true;
  }

  private async persist(session: Session): Promise<void> {
    try {
      await writeFile(
        join(SESSIONS_DIR, `${session.id}.json`),
        JSON.stringify(session, null, 2)
      );
    } catch (e) {
      console.error(`[SessionStore] Failed to persist session ${session.id}:`, e);
    }
  }
}

export const sessionStore = new SessionStore();
