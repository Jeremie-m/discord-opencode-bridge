import { OpenCodeClient, OpenCodeClientError } from './opencode-client.js';

export interface ChannelSession {
  channelId: string;
  sessionId: string;
  projectPath: string;
  channelName: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  isProcessing: boolean;
}

export class SessionManager {
  private sessions = new Map<string, ChannelSession>();
  private openCodeClient: OpenCodeClient;
  private defaultProjectPath: string;

  constructor(openCodeClient: OpenCodeClient, defaultProjectPath: string = 'D:/Dev') {
    this.openCodeClient = openCodeClient;
    this.defaultProjectPath = defaultProjectPath;
  }

  /**
   * Create a new session for a Discord channel
   */
  async createSession(
    channelId: string,
    channelName: string,
    projectPath?: string
  ): Promise<ChannelSession> {
    // Check if session already exists
    if (this.sessions.has(channelId)) {
      console.log(`[SessionManager] Session already exists for channel ${channelId}`);
      return this.sessions.get(channelId)!;
    }

    const resolvedPath = projectPath || this.parseProjectPath(channelName) || this.defaultProjectPath;

    try {
      // Create OpenCode session
      const openCodeSession = await this.openCodeClient.createSession(
        `Discord: #${channelName}`
      );

      const session: ChannelSession = {
        channelId,
        sessionId: openCodeSession.id,
        projectPath: resolvedPath,
        channelName,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        isProcessing: false,
      };

      this.sessions.set(channelId, session);
      console.log(
        `[SessionManager] Created session ${openCodeSession.id} for #${channelName} (project: ${resolvedPath})`
      );

      return session;
    } catch (error) {
      console.error(`[SessionManager] Failed to create session:`, error);
      throw error;
    }
  }

  /**
   * Get session by channel ID
   */
  getSession(channelId: string): ChannelSession | undefined {
    return this.sessions.get(channelId);
  }

  /**
   * Check if a channel has an active session
   */
  hasSession(channelId: string): boolean {
    return this.sessions.has(channelId);
  }

  /**
   * Send a message to OpenCode and get the response
   */
  async sendMessage(channelId: string, message: string): Promise<string> {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new Error(`No session found for channel ${channelId}`);
    }

    if (session.isProcessing) {
      throw new Error('Session is currently processing another message. Please wait.');
    }

    session.isProcessing = true;
    session.lastActivity = new Date();

    try {
      const response = await this.openCodeClient.sendMessage(session.sessionId, message);
      session.messageCount++;
      return response;
    } catch (error) {
      if (error instanceof OpenCodeClientError) {
        // If session not found, try to recreate it
        if (error.statusCode === 404) {
          console.log(`[SessionManager] Session ${session.sessionId} not found, recreating...`);
          this.sessions.delete(channelId);
          const newSession = await this.createSession(channelId, session.channelName, session.projectPath);
          return this.openCodeClient.sendMessage(newSession.sessionId, message);
        }
      }
      throw error;
    } finally {
      session.isProcessing = false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(channelId: string): Promise<boolean> {
    const session = this.sessions.get(channelId);
    if (!session) {
      return false;
    }

    try {
      await this.openCodeClient.deleteSession(session.sessionId);
    } catch (error) {
      console.warn(`[SessionManager] Failed to delete OpenCode session:`, error);
      // Continue anyway - remove from local map
    }

    this.sessions.delete(channelId);
    console.log(`[SessionManager] Deleted session for channel ${channelId}`);
    return true;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): ChannelSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session statistics
   */
  getStats(): { total: number; processing: number; totalMessages: number } {
    const sessions = this.getAllSessions();
    return {
      total: sessions.length,
      processing: sessions.filter((s) => s.isProcessing).length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
    };
  }

  /**
   * Parse project path from channel name
   * Examples:
   *   - "mtt-manager" -> "D:/Dev/mtt-manager"
   *   - "project-myapp" -> "D:/Dev/myapp"
   *   - "opencode-test" -> default path
   */
  private parseProjectPath(channelName: string): string | null {
    // Remove common prefixes
    const cleanName = channelName
      .replace(/^(opencode|oc|project|proj)-?/i, '')
      .trim();

    if (!cleanName || cleanName === channelName) {
      return null;
    }

    // Construct path
    return `${this.defaultProjectPath}/${cleanName}`;
  }

  /**
   * Check if OpenCode server is available
   */
  async isServerAvailable(): Promise<boolean> {
    return this.openCodeClient.healthCheck();
  }

  /**
   * Wait for OpenCode server
   */
  async waitForServer(): Promise<boolean> {
    return this.openCodeClient.waitForServer();
  }
}
