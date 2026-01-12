import {
  Client,
  Events,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
  type Message,
  type GuildChannel,
} from 'discord.js';
import type { SessionManager } from './session-manager.js';
import { chunkMessage } from '../utils/chunker.js';

interface DiscordBotConfig {
  token: string;
  guildId: string;
  sessionManager: SessionManager;
}

export class DiscordBot {
  private client: Client;
  private config: DiscordBotConfig;

  constructor(config: DiscordBotConfig) {
    this.config = config;
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
    this.client.once(Events.ClientReady, (client) => {
      console.log(`Discord bot logged in as ${client.user.tag}`);
    });

    this.client.on(Events.ChannelCreate, (channel) => {
      this.handleChannelCreate(channel as GuildChannel);
    });

    this.client.on(Events.MessageCreate, (message) => {
      this.handleMessage(message);
    });
  }

  private async handleChannelCreate(channel: GuildChannel): Promise<void> {
    // Only handle text channels in our target guild
    if (channel.type !== ChannelType.GuildText) return;
    if (channel.guild.id !== this.config.guildId) return;

    console.log(`New channel created: #${channel.name}`);

    // TODO: Parse project path from channel name
    // TODO: Create OpenCode session
    // TODO: Send confirmation message

    const textChannel = channel as TextChannel;
    await textChannel.send(
      '🚀 **OpenCode Bridge** - Session initialized!\n' +
      'Send your messages here to interact with OpenCode.'
    );
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only handle messages in our target guild
    if (message.guild?.id !== this.config.guildId) return;

    // TODO: Check if channel has an active session
    // TODO: Send message to OpenCode
    // TODO: Stream response back to Discord

    console.log(`Message from ${message.author.tag}: ${message.content}`);
  }

  async start(): Promise<void> {
    await this.client.login(this.config.token);
  }

  async stop(): Promise<void> {
    this.client.destroy();
  }
}
