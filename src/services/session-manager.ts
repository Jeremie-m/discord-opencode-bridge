import type { OpenCodeClient } from './opencode-client.js';

interface ChannelSession {
  channelId: string;
  sessionId: string;
  projectPath: string;
  createdAt: Date;
}

export class SessionManager {
  private sessions = new Map<string, ChannelSession>();
  private openCodeClient: OpenCodeClient;

  constructor(openCodeClient: OpenCodeClient) {
    this.openCodeClient = openCodeClient;
  }

  async createSession(channelId: string, projectPath: string): Promise<ChannelSession> {
    // Create a new OpenCode session
    const sessionId = await this.openCodeClient.createSession(`Discord-${channelId}`);

    const session: ChannelSession = {
      channelId,
      sessionId,
      projectPath,
      createdAt: new Date(),
    };

    this.sessions.set(channelId, session);
    console.log(`Created session ${sessionId} for channel ${channelId}`);

    return session;
  }

  getSession(channelId: string): ChannelSession | undefined {
    return this.sessions.get(channelId);
  }

  hasSession(channelId: string): boolean {
    return this.sessions.has(channelId);
  }

  async sendMessage(channelId: string, message: string): Promise<string> {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new Error(`No session found for channel ${channelId}`);
    }

    return this.openCodeClient.sendMessage(session.sessionId, message);
  }

  async deleteSession(channelId: string): Promise<void> {
    const session = this.sessions.get(channelId);
    if (session) {
      await this.openCodeClient.deleteSession(session.sessionId);
      this.sessions.delete(channelId);
      console.log(`Deleted session for channel ${channelId}`);
    }
  }

  getAllSessions(): ChannelSession[] {
    return Array.from(this.sessions.values());
  }
}
