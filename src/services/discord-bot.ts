import {
  Client,
  Events,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
  type Message,
  type GuildChannel,
  type NonThreadGuildBasedChannel,
} from 'discord.js';
import type { SessionManager } from './session-manager.js';
import { chunkMessage, wrapInCodeBlock } from '../utils/chunker.js';

interface DiscordBotConfig {
  token: string;
  guildId: string;
  sessionManager: SessionManager;
  channelPrefix?: string; // Optional prefix to filter channels (e.g., "oc-")
}

export class DiscordBot {
  private client: Client;
  private config: DiscordBotConfig;
  private isReady = false;

  constructor(config: DiscordBotConfig) {
    this.config = {
      channelPrefix: '', // No prefix by default - all channels handled
      ...config,
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    console.log('[Discord] Setting up event handlers...');
    
    // Remove all existing listeners first (prevents accumulation with hot reload)
    this.client.removeAllListeners();
    
    // Bot ready
    this.client.once(Events.ClientReady, (client) => {
      console.log(`[Discord] Bot logged in as ${client.user.tag}`);
      console.log(`[Discord] Watching guild: ${this.config.guildId}`);
      console.log(`[Discord] Channel prefix: ${this.config.channelPrefix}`);
      this.isReady = true;
    });

    // Channel created
    this.client.on(Events.ChannelCreate, (channel) => {
      this.handleChannelCreate(channel as NonThreadGuildBasedChannel);
    });

    // Channel deleted
    this.client.on(Events.ChannelDelete, (channel) => {
      this.handleChannelDelete(channel as NonThreadGuildBasedChannel);
    });

    // Message received - with deduplication
    const processedMessages = new Set<string>();
    this.client.on(Events.MessageCreate, (message) => {
      // Deduplicate - Discord sometimes sends same event twice
      if (processedMessages.has(message.id)) {
        console.log(`[Discord] DUPLICATE event for message ${message.id}, ignoring`);
        return;
      }
      processedMessages.add(message.id);
      
      // Clean old message IDs (keep last 100)
      if (processedMessages.size > 100) {
        const firstId = processedMessages.values().next().value as string;
        if (firstId) processedMessages.delete(firstId);
      }
      
      console.log(`[Discord] MessageCreate event for message ${message.id}`);
      this.handleMessage(message);
    });

    // Error handling
    this.client.on(Events.Error, (error) => {
      console.error('[Discord] Client error:', error);
    });

    this.client.on(Events.Warn, (warning) => {
      console.warn('[Discord] Warning:', warning);
    });
  }

  /**
   * Handle new channel creation - create OpenCode session
   */
  private async handleChannelCreate(channel: NonThreadGuildBasedChannel): Promise<void> {
    // Only handle text channels in our target guild
    if (channel.type !== ChannelType.GuildText) return;
    if (channel.guild.id !== this.config.guildId) return;

    // Check if channel matches our prefix
    const prefix = this.config.channelPrefix || '';
    if (prefix && !channel.name.startsWith(prefix)) {
      console.log(`[Discord] Ignoring channel #${channel.name} (doesn't match prefix "${prefix}")`);
      return;
    }

    console.log(`[Discord] New OpenCode channel created: #${channel.name}`);

    const textChannel = channel as TextChannel;

    // Check if OpenCode server is available
    const serverAvailable = await this.config.sessionManager.isServerAvailable();
    if (!serverAvailable) {
      await textChannel.send(
        '⚠️ **OpenCode server not available**\n\n' +
          'Please start the OpenCode server with:\n' +
          '```bash\nopencode serve --port 4096\n```\n\n' +
          'Then send any message to retry.'
      );
      return;
    }

    try {
      // Create session
      const session = await this.config.sessionManager.createSession(
        channel.id,
        channel.name
      );

      await textChannel.send(
        '🚀 **OpenCode Session Started!**\n\n' +
          `📁 Project: \`${session.projectPath}\`\n` +
          `🔗 Session ID: \`${session.sessionId}\`\n\n` +
          'Send your messages here to interact with OpenCode.\n' +
          '_Tip: I\'ll remember the conversation context!_'
      );
    } catch (error) {
      console.error('[Discord] Failed to create session:', error);
      await textChannel.send(
        '❌ **Failed to create OpenCode session**\n\n' +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
          'Make sure OpenCode server is running:\n' +
          '```bash\nopencode serve --port 4096\n```'
      );
    }
  }

  /**
   * Handle channel deletion - clean up session
   */
  private async handleChannelDelete(channel: NonThreadGuildBasedChannel): Promise<void> {
    if (channel.type !== ChannelType.GuildText) return;
    if (channel.guild.id !== this.config.guildId) return;

    if (this.config.sessionManager.hasSession(channel.id)) {
      console.log(`[Discord] Channel #${channel.name} deleted, cleaning up session`);
      await this.config.sessionManager.deleteSession(channel.id);
    }
  }

  /**
   * Handle incoming messages - send to OpenCode and return response
   */
  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only handle messages in our target guild
    if (message.guild?.id !== this.config.guildId) return;

    // Only handle text channels
    if (message.channel.type !== ChannelType.GuildText) return;

    const channel = message.channel as TextChannel;

    // Check if channel matches our prefix
    const prefix = this.config.channelPrefix || '';
    if (prefix && !channel.name.startsWith(prefix)) {
      return; // Silently ignore non-OpenCode channels
    }

    // Get or create session
    let session = this.config.sessionManager.getSession(channel.id);

    if (!session) {
      // Try to create session on first message if it doesn't exist
      console.log(`[Discord] No session for #${channel.name}, creating one...`);

      const serverAvailable = await this.config.sessionManager.isServerAvailable();
      if (!serverAvailable) {
        await message.reply(
          '⚠️ OpenCode server not available. Please start it with:\n' +
            '```bash\nopencode serve --port 4096\n```'
        );
        return;
      }

      try {
        session = await this.config.sessionManager.createSession(channel.id, channel.name);
        await channel.send(
          `🚀 **Session created!** (Project: \`${session.projectPath}\`)\n\nProcessing your message...`
        );
      } catch (error) {
        await message.reply(`❌ Failed to create session: ${error}`);
        return;
      }
    }

    // Check if already processing
    if (session.isProcessing) {
      await message.reply('⏳ _Still processing previous message, please wait..._');
      return;
    }

    // Show typing indicator
    await channel.sendTyping();

    // Keep typing indicator active during processing
    const typingInterval = setInterval(() => {
      channel.sendTyping().catch(() => {});
    }, 8000);

    try {
      console.log(`[Discord] Processing: ${message.content.substring(0, 50)}...`);

      // Send to OpenCode
      const response = await this.config.sessionManager.sendMessage(
        channel.id,
        message.content
      );

      // Clear typing indicator
      clearInterval(typingInterval);

      // Send response back to Discord
      await this.sendResponse(channel, response, message);
    } catch (error) {
      clearInterval(typingInterval);

      console.error('[Discord] Error processing message:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await message.reply(
        `❌ **Error from OpenCode:**\n\`\`\`\n${errorMessage}\n\`\`\``
      );
    }
  }

  /**
   * Send a potentially long response to Discord, chunking if necessary
   */
  private async sendResponse(
    channel: TextChannel,
    response: string,
    originalMessage: Message
  ): Promise<void> {
    // Clean up the response
    const cleanResponse = response.trim();

    if (!cleanResponse) {
      await originalMessage.reply('_OpenCode returned an empty response._');
      return;
    }

    // Check if response looks like code (contains common code indicators)
    const looksLikeCode = this.looksLikeCode(cleanResponse);

    // Chunk the message
    let chunks: string[];

    if (looksLikeCode && !cleanResponse.includes('```')) {
      // Wrap in code block if it looks like code but isn't already wrapped
      chunks = wrapInCodeBlock(cleanResponse);
    } else {
      chunks = chunkMessage(cleanResponse);
    }

    // Send first chunk as reply
    if (chunks.length > 0) {
      await originalMessage.reply(chunks[0]);
    }

    // Send remaining chunks as follow-up messages
    for (let i = 1; i < chunks.length; i++) {
      // Small delay to avoid rate limiting
      await this.delay(500);
      await channel.send(chunks[i]);
    }

    // Add indicator if message was chunked
    if (chunks.length > 1) {
      await channel.send(`_📄 Response split into ${chunks.length} messages_`);
    }
  }

  /**
   * Check if text looks like code
   */
  private looksLikeCode(text: string): boolean {
    const codeIndicators = [
      /^(import|export|const|let|var|function|class|interface|type)\s/m,
      /[{}\[\]();].*[{}\[\]();]/,
      /^\s*(if|for|while|switch|try|catch)\s*\(/m,
      /=>/,
      /console\.(log|error|warn)/,
      /^\/\//m,
      /^#include/m,
      /^def\s+\w+/m,
      /^class\s+\w+/m,
    ];

    return codeIndicators.some((pattern) => pattern.test(text));
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    console.log('[Discord] Starting bot...');
    await this.client.login(this.config.token);
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    console.log('[Discord] Stopping bot...');
    this.client.destroy();
    this.isReady = false;
  }

  /**
   * Check if bot is ready
   */
  isConnected(): boolean {
    return this.isReady;
  }

  /**
   * Get bot user info
   */
  getBotUser() {
    return this.client.user;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
