import 'dotenv/config';
import { DiscordBot } from './services/discord-bot.js';
import { SessionManager } from './services/session-manager.js';
import { OpenCodeClient } from './services/opencode-client.js';

// Configuration
const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    guildId: process.env.DISCORD_GUILD_ID!,
    channelPrefix: process.env.DISCORD_CHANNEL_PREFIX || '',
  },
  openCode: {
    serverUrl: process.env.OPENCODE_SERVER_URL || 'http://localhost:4096',
    defaultProjectPath: process.env.OPENCODE_DEFAULT_PROJECT_PATH || 'D:/Dev',
    timeout: parseInt(process.env.OPENCODE_TIMEOUT || '600000', 10), // 10 min default
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('       Discord-OpenCode Bridge Starting...             ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Validate required environment variables
  const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID'];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Guild ID: ${config.discord.guildId}`);
  console.log(`   Channel Prefix: ${config.discord.channelPrefix ? `"${config.discord.channelPrefix}"` : '(none - all channels)'}`);
  console.log(`   OpenCode URL: ${config.openCode.serverUrl}`);
  console.log(`   Default Project Path: ${config.openCode.defaultProjectPath}`);
  console.log('');

  // Initialize OpenCode client
  const openCodeClient = new OpenCodeClient(
    config.openCode.serverUrl,
    config.openCode.timeout
  );

  // Initialize session manager
  const sessionManager = new SessionManager(
    openCodeClient,
    config.openCode.defaultProjectPath
  );

  // Check if OpenCode server is available
  console.log('🔍 Checking OpenCode server...');
  const serverAvailable = await openCodeClient.healthCheck();

  if (serverAvailable) {
    console.log('✅ OpenCode server is running');
  } else {
    console.warn('⚠️  OpenCode server not available at', config.openCode.serverUrl);
    console.warn('   The bot will still start, but sessions will fail until the server is up.');
    console.warn('   Start OpenCode server with: opencode serve --port 4096');
    console.warn('');
  }

  // Initialize Discord bot
  const bot = new DiscordBot({
    token: config.discord.token,
    guildId: config.discord.guildId,
    sessionManager,
    channelPrefix: config.discord.channelPrefix,
  });

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

    try {
      // Clean up sessions
      const sessions = sessionManager.getAllSessions();
      console.log(`   Cleaning up ${sessions.length} session(s)...`);

      for (const session of sessions) {
        await sessionManager.deleteSession(session.channelId);
      }

      // Stop bot
      await bot.stop();
      console.log('✅ Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  });

  // Start the bot
  try {
    await bot.start();
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   ✅ Bot is now running!                              ');
    console.log('');
    console.log(`   Create a channel to start${config.discord.channelPrefix ? ` (prefix: "${config.discord.channelPrefix}")` : ' (any channel)'}`);
    console.log(`   Example: #${config.discord.channelPrefix}myproject`);
    console.log('');
    console.log('   Press Ctrl+C to stop                                ');
    console.log('═══════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
