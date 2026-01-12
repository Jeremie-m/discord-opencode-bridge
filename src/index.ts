import 'dotenv/config';
import { DiscordBot } from './services/discord-bot.js';
import { SessionManager } from './services/session-manager.js';
import { OpenCodeClient } from './services/opencode-client.js';

async function main() {
  console.log('Starting Discord-OpenCode Bridge...');

  // Validate environment
  const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Initialize services
  const openCodeClient = new OpenCodeClient(
    process.env.OPENCODE_SERVER_URL || 'http://localhost:4096'
  );

  const sessionManager = new SessionManager(openCodeClient);

  const bot = new DiscordBot({
    token: process.env.DISCORD_TOKEN!,
    guildId: process.env.DISCORD_GUILD_ID!,
    sessionManager,
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await bot.stop();
    process.exit(0);
  });

  // Start the bot
  await bot.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
