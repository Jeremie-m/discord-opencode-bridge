/**
 * OpenCode HTTP API Client
 * Communicates with `opencode serve` running on localhost
 */

export interface OpenCodeSession {
  id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenCodeMessagePart {
  type: 'text';
  text: string;
}

export interface OpenCodeMessageRequest {
  parts: OpenCodeMessagePart[];
  agent?: string;
  system?: string;
}

// Response part from OpenCode API
export interface OpenCodeResponsePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'text' | 'step-start' | 'step-finish' | 'reasoning' | 'tool-call' | 'tool-result';
  text?: string;
  reason?: string;
}

// Full response from OpenCode API
export interface OpenCodeMessageResponse {
  info: {
    id: string;
    sessionID: string;
    role: string;
    time: {
      created: number;
      completed: number;
    };
    modelID: string;
    providerID: string;
    cost: number;
    tokens: {
      input: number;
      output: number;
      reasoning: number;
    };
    finish: string;
  };
  parts: OpenCodeResponsePart[];
}

export class OpenCodeClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: string
  ) {
    super(message);
    this.name = 'OpenCodeClientError';
  }
}

export class OpenCodeClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 600000) {
    // 10 min timeout for long responses
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  /**
   * Check if OpenCode server is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/session`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Wait for OpenCode server to be available
   */
  async waitForServer(maxAttempts: number = 10, delayMs: number = 2000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.healthCheck()) {
        return true;
      }
      console.log(`Waiting for OpenCode server... (${i + 1}/${maxAttempts})`);
      await this.delay(delayMs);
    }
    return false;
  }

  /**
   * Create a new OpenCode session
   */
  async createSession(title?: string): Promise<OpenCodeSession> {
    const response = await this.request<OpenCodeSession>('/session', {
      method: 'POST',
      body: JSON.stringify({ title: title || `Discord Session ${Date.now()}` }),
    });

    console.log(`[OpenCode] Created session: ${response.id}`);
    return response;
  }

  /**
   * Send a message to an OpenCode session and get the response
   * @param sessionId - The session ID
   * @param message - The message content
   * @param agent - Agent to use (default: "Sisyphus")
   * @param systemPrompt - Optional system prompt override (for ultrawork mode etc.)
   */
  async sendMessage(
    sessionId: string, 
    message: string,
    agent: string = 'Sisyphus',
    systemPrompt?: string
  ): Promise<string> {
    const body: OpenCodeMessageRequest = {
      parts: [{ type: 'text', text: message }],
      agent,
    };

    // Add system prompt if provided (for ultrawork mode)
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    try {
      const response = await this.request<OpenCodeMessageResponse>(
        `/session/${sessionId}/message`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      // Extract text content from response parts
      return this.extractTextFromResponse(response);
    } catch (error) {
      if (error instanceof OpenCodeClientError) {
        throw error;
      }
      throw new OpenCodeClientError(`Failed to send message: ${error}`);
    }
  }

  /**
   * Extract readable text from OpenCode response
   * Formats: reasoning as quote block, text as main response
   */
  private extractTextFromResponse(response: OpenCodeMessageResponse): string {
    if (!response.parts || !Array.isArray(response.parts)) {
      return '_OpenCode returned an unexpected response format._';
    }

    const output: string[] = [];

    // Extract reasoning (thinking) parts
    const reasoningParts = response.parts
      .filter((part) => part.type === 'reasoning' && part.text)
      .map((part) => part.text!);

    // Extract text (response) parts  
    const textParts = response.parts
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text!);

    // Format reasoning as a quote block (collapsible "thinking" style)
    if (reasoningParts.length > 0) {
      const reasoningText = reasoningParts.join('\n');
      output.push(`> 💭 *Thinking...*`);
      // Split reasoning into lines and prefix each with > for quote block
      const reasoningLines = reasoningText.split('\n').map(line => `> ${line}`);
      output.push(reasoningLines.join('\n'));
      output.push(''); // Empty line separator
    }

    // Format text as the main response
    if (textParts.length > 0) {
      output.push(textParts.join('\n\n'));
    } else if (reasoningParts.length === 0) {
      output.push('_OpenCode returned no text content._');
    }

    return output.join('\n');
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<OpenCodeSession> {
    return this.request<OpenCodeSession>(`/session/${sessionId}`, {
      method: 'GET',
    });
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<OpenCodeSession[]> {
    const response = await this.request<OpenCodeSession[] | { sessions: OpenCodeSession[] }>(
      '/session',
      { method: 'GET' }
    );

    // Handle both array and object responses
    if (Array.isArray(response)) {
      return response;
    }
    return response.sessions || [];
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/session/${sessionId}`, {
      method: 'DELETE',
    });
    console.log(`[OpenCode] Deleted session: ${sessionId}`);
  }

  /**
   * Generic request helper with timeout and error handling
   */
  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new OpenCodeClientError(
          `OpenCode API error: ${response.status} ${response.statusText}`,
          response.status,
          errorBody
        );
      }

      // Handle empty responses (like DELETE)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenCodeClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenCodeClientError('Request timeout - OpenCode may be processing a long task');
      }

      throw new OpenCodeClientError(`Network error: ${error}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
