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

  constructor(baseUrl: string, timeout: number = 300000) {
    // 5 min timeout for long responses
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
   */
  async sendMessage(sessionId: string, message: string): Promise<string> {
    const body: OpenCodeMessageRequest = {
      parts: [{ type: 'text', text: message }],
    };

    try {
      console.log(`[OpenCode] Sending message to session ${sessionId}...`);
      
      const response = await this.request<OpenCodeMessageResponse>(
        `/session/${sessionId}/message`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      console.log(`[OpenCode] Received response with ${response.parts?.length || 0} parts`);
      console.log(`[OpenCode] Response info:`, response.info?.id, response.info?.finish);
      
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
   * DEBUG MODE: Shows all parts for analysis
   */
  private extractTextFromResponse(response: OpenCodeMessageResponse): string {
    if (!response.parts || !Array.isArray(response.parts)) {
      return `[DEBUG] No parts array:\n${JSON.stringify(response, null, 2)}`;
    }

    // DEBUG: Show all parts with their types
    const debugOutput: string[] = [];
    debugOutput.push(`[DEBUG] Response has ${response.parts.length} parts:`);
    
    for (const part of response.parts) {
      debugOutput.push(`\n--- Part type: ${part.type} ---`);
      if (part.text) {
        debugOutput.push(part.text);
      } else {
        debugOutput.push(`(no text, keys: ${Object.keys(part).join(', ')})`);
      }
    }

    return debugOutput.join('\n');
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
      console.log(`[OpenCode] Response content-type: ${contentType}`);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log(`[OpenCode] Non-JSON response: ${text.substring(0, 200)}`);
        return {} as T;
      }

      // Get raw text first to debug
      const rawText = await response.text();
      console.log(`[OpenCode] Raw response length: ${rawText.length}`);
      console.log(`[OpenCode] Raw response preview: ${rawText.substring(0, 300)}...`);
      
      // Check if it's multiple JSON objects (NDJSON)
      if (rawText.includes('}\n{') || rawText.includes('}{')) {
        console.log(`[OpenCode] WARNING: Response contains multiple JSON objects!`);
      }
      
      return JSON.parse(rawText) as T;
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
