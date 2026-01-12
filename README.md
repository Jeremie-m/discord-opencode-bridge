# Discord-OpenCode Bridge

Control OpenCode from your phone via Discord. Create a new Discord channel to spawn an OpenCode session, then chat with it from anywhere.

## Features

- **Channel-based sessions**: Each Discord channel maps to an OpenCode session
- **Persistent conversations**: Context is preserved across messages
- **Smart message chunking**: Long responses are split at sentence boundaries
- **Real-time interaction**: Send prompts and receive responses instantly

## Architecture

```
Phone (Discord) <---> Discord API <---> Bridge Service <---> OpenCode Server
                                              |
                                    SessionManager
                                    (channelId -> sessionId)
```

## Prerequisites

- Node.js 18+
- OpenCode CLI installed and configured
- Discord Bot Token
- Discord Server (Guild)

## Setup

### 1. Clone and Install

```bash
cd D:/Dev/discord-opencode-bridge
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section, create a bot
4. Copy the token to `.env`
5. Enable these Privileged Gateway Intents:
   - Message Content Intent
6. Go to OAuth2 > URL Generator
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Read Message History`, `View Channels`
7. Use the generated URL to invite the bot to your server

### 4. Start OpenCode Server

```bash
opencode serve --port 4096
```

### 5. Run the Bridge

```bash
npm run dev
```

## Usage

1. Create a new text channel in your Discord server
2. The bot will automatically create an OpenCode session
3. Send messages to interact with OpenCode
4. Responses will be posted back to the channel

## License

MIT
