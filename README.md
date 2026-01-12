# Discord-OpenCode Bridge 🌉

Control **OpenCode** from your phone via **Discord**. Create a new Discord channel to spawn an OpenCode session, then chat with it from anywhere!

## ✨ Features

- **Channel-based sessions**: Each Discord channel maps to a persistent OpenCode session
- **Conversation memory**: Context is preserved across messages (OpenCode remembers the conversation)
- **Smart message chunking**: Long responses are split at sentence boundaries, preserving code blocks
- **Real-time interaction**: Send prompts and receive responses instantly
- **Auto-reconnect**: Sessions auto-recreate if OpenCode restarts

## 🏗️ Architecture

```
📱 Phone (Discord)
        │
        ▼
┌─────────────────┐
│  Discord API    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Discord-OpenCode Bridge        │
│  ┌───────────────────────────┐  │
│  │ SessionManager            │  │
│  │ Map<channelId → sessionId>│  │
│  └───────────────────────────┘  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ OpenCode Server │
│ localhost:4096  │
└─────────────────┘
```

## 📋 Prerequisites

- **Node.js 18+**
- **OpenCode CLI** installed and configured
- **Discord Bot Token** (see setup below)
- **Discord Server** where you have admin rights

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Jeremie-m/discord-opencode-bridge.git
cd discord-opencode-bridge
npm install
```

### 2. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Name it `OpenCode Bridge`
3. Go to **"Bot"** section:
   - Click **"Reset Token"** → Copy the token (keep it secret!)
   - Enable **"MESSAGE CONTENT INTENT"** under Privileged Gateway Intents
4. Go to **"OAuth2" → "URL Generator"**:
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Send Messages`, `Read Message History`, `Manage Channels`
5. Open the generated URL → Add bot to your server

### 3. Get Guild ID

1. In Discord: Settings → Advanced → Enable **Developer Mode**
2. Right-click your server → **"Copy Server ID"**

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_CHANNEL_PREFIX=oc-
OPENCODE_SERVER_URL=http://localhost:4096
OPENCODE_DEFAULT_PROJECT_PATH=D:/Dev
```

### 5. Start OpenCode Server

In a separate terminal:
```bash
opencode serve --port 4096
```

### 6. Start the Bridge

```bash
npm run dev
```

You should see:
```
═══════════════════════════════════════════════════════
   ✅ Bot is now running!

   Create a channel starting with "oc-" to start
   Example: #oc-myproject

   Press Ctrl+C to stop
═══════════════════════════════════════════════════════
[Discord] Bot logged in as OpenCode Bridge#1234
```

## 📱 Usage

### Create a Session

1. In your Discord server, create a new text channel starting with `oc-`
   - Example: `#oc-mtt-manager` or `#oc-myproject`
2. The bot will automatically create an OpenCode session
3. You'll see a confirmation message with the session ID

### Chat with OpenCode

Simply send messages in the channel:

```
You: Explain how the auth system works in this project

Bot: The authentication system uses JWT tokens stored in...
     [detailed response from OpenCode]

You: Show me the login function

Bot: Here's the login function from src/auth/login.ts:
     ```typescript
     export async function login(email: string, password: string) {
       // ... code
     }
     ```
```

### Session Persistence

- Each channel maintains its own conversation history
- OpenCode remembers context from previous messages
- Context is preserved even if you close Discord and come back

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | (required) |
| `DISCORD_GUILD_ID` | Your Discord server ID | (required) |
| `DISCORD_CHANNEL_PREFIX` | Prefix for OpenCode channels | `oc-` |
| `OPENCODE_SERVER_URL` | URL of OpenCode server | `http://localhost:4096` |
| `OPENCODE_DEFAULT_PROJECT_PATH` | Default project path | `D:/Dev` |
| `OPENCODE_TIMEOUT` | Request timeout (ms) | `300000` (5 min) |

## 🛠️ Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run typecheck
```

## 📁 Project Structure

```
discord-opencode-bridge/
├── src/
│   ├── index.ts                 # Entry point
│   ├── services/
│   │   ├── discord-bot.ts       # Discord client & event handlers
│   │   ├── opencode-client.ts   # OpenCode HTTP API client
│   │   └── session-manager.ts   # Channel ↔ Session mapping
│   └── utils/
│       └── chunker.ts           # Smart message splitting
├── .env.example                 # Environment template
├── package.json
└── tsconfig.json
```

## 🔧 Troubleshooting

### Bot doesn't respond to messages

1. Check that the channel name starts with your configured prefix (default: `oc-`)
2. Verify OpenCode server is running: `curl http://localhost:4096/session`
3. Check bot has `MESSAGE CONTENT INTENT` enabled in Discord Developer Portal

### "OpenCode server not available"

Start the OpenCode server:
```bash
opencode serve --port 4096
```

### Session errors / 404

The session may have been deleted from OpenCode. Send a new message and the bridge will auto-recreate the session.

### Long responses are cut off

Responses over 2000 characters are automatically split into multiple messages. If you're still missing content, check the OpenCode server logs.

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome! Please ensure TypeScript compiles without errors before submitting.
