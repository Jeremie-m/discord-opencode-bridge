<div align="center">

# 🌉 Discord-OpenCode Bridge

**Control OpenCode from your phone via Discord**

[![GitHub stars](https://img.shields.io/github/stars/Jeremie-m/discord-opencode-bridge?style=for-the-badge&logo=github&color=yellow)](https://github.com/Jeremie-m/discord-opencode-bridge/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Jeremie-m/discord-opencode-bridge?style=for-the-badge&logo=github&color=blue)](https://github.com/Jeremie-m/discord-opencode-bridge/network/members)
[![GitHub issues](https://img.shields.io/github/issues/Jeremie-m/discord-opencode-bridge?style=for-the-badge&logo=github&color=red)](https://github.com/Jeremie-m/discord-opencode-bridge/issues)
[![License](https://img.shields.io/github/license/Jeremie-m/discord-opencode-bridge?style=for-the-badge&color=green)](LICENSE)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)

<br />

[Features](#-features) •
[Quick Start](#-quick-start) •
[Usage](#-usage) •
[Configuration](#%EF%B8%8F-configuration) •
[Contributing](#-contributing)

<br />

<img src="https://raw.githubusercontent.com/Jeremie-m/discord-opencode-bridge/main/.github/demo.gif" alt="Demo" width="600" />

*Create a Discord channel → Get an AI coding assistant*

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔗 Channel-based Sessions
Each Discord channel maps to a persistent OpenCode session with full conversation memory.

### 💬 Smart Message Chunking  
Long responses are intelligently split at sentence boundaries, preserving code blocks intact.

### 🔄 Auto-reconnect
Sessions auto-recreate if OpenCode restarts. Never lose your context.

</td>
<td width="50%">

### ⚡ Real-time Interaction
Send prompts from your phone and receive responses instantly.

### 🤖 Sisyphus AI Personality *
Senior-engineer-level responses with the Sisyphus agent.

### 🚀 Ultrawork Mode *
Prefix with `/ultrawork` for intensive, thorough analysis.

</td>
</tr>
</table>

> \* *Requires [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) plugin. Without it, the bridge uses OpenCode's default agent.*

---

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

---

## 📋 Prerequisites

| Requirement | Description |
|-------------|-------------|
| ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white) | JavaScript runtime |
| ![OpenCode](https://img.shields.io/badge/OpenCode-CLI-blue?style=flat-square) | Installed and configured |
| ![Discord](https://img.shields.io/badge/Discord-Bot_Token-5865F2?style=flat-square&logo=discord&logoColor=white) | See setup below |
| ![Server](https://img.shields.io/badge/Discord-Server_(Admin)-5865F2?style=flat-square&logo=discord&logoColor=white) | Where you have admin rights |

---

## 🚀 Quick Start

### 1️⃣ Clone and Install

```bash
git clone https://github.com/Jeremie-m/discord-opencode-bridge.git
cd discord-opencode-bridge
npm install
```

### 2️⃣ Create Discord Bot

<details>
<summary><b>Click to expand step-by-step guide</b></summary>

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Name it `OpenCode Bridge`
3. Go to **"Bot"** section:
   - Click **"Reset Token"** → Copy the token (keep it secret!)
   - Enable **"MESSAGE CONTENT INTENT"** under Privileged Gateway Intents
4. Go to **"OAuth2" → "URL Generator"**:
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Send Messages`, `Read Message History`, `Manage Channels`
5. Open the generated URL → Add bot to your server

</details>

### 3️⃣ Get Guild ID

1. In Discord: **Settings** → **Advanced** → Enable **Developer Mode**
2. Right-click your server → **"Copy Server ID"**

### 4️⃣ Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
OPENCODE_DEFAULT_PROJECT_PATH=C:/path/to/your/projects

# Optional
DISCORD_CHANNEL_PREFIX=
OPENCODE_SERVER_URL=http://127.0.0.1:4096
```

### 5️⃣ Start Everything

```bash
npm run serve
```

> 💡 **Windows users**: Just double-click `start.bat`

You should see:
```
═══════════════════════════════════════════════════════
   ✅ Bot is now running!

   Create any channel to start chatting with OpenCode
   (or set DISCORD_CHANNEL_PREFIX to filter channels)

   Press Ctrl+C to stop
═══════════════════════════════════════════════════════
[Discord] Bot logged in as OpenCode Bridge#1234
```

---

## 📱 Usage

### Create a Session

1. Create a new text channel in your Discord server
2. The bot automatically creates an OpenCode session
3. You'll see a confirmation message with the session ID

> 💡 Set `DISCORD_CHANNEL_PREFIX` (e.g., `oc-`) to only monitor specific channels

### Chat with OpenCode

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

### 🚀 Ultrawork Mode

For complex tasks requiring thorough analysis:

```
/ultrawork Analyze the entire authentication flow and suggest security improvements
```

> ⚠️ Requires [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) plugin

---

## ⚙️ Configuration

| Variable | Description | Required | Default |
|:---------|:------------|:--------:|:--------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ | - |
| `DISCORD_GUILD_ID` | Your Discord server ID | ✅ | - |
| `OPENCODE_DEFAULT_PROJECT_PATH` | Working directory for OpenCode | ✅ | - |
| `DISCORD_CHANNEL_PREFIX` | Prefix filter for channels (empty = all) | ❌ | `""` |
| `OPENCODE_SERVER_URL` | URL of OpenCode server | ❌ | `http://127.0.0.1:4096` |
| `OPENCODE_TIMEOUT` | Request timeout (ms) | ❌ | `300000` |

---

## 🛠️ Development

```bash
# Start everything (OpenCode server + bridge) - RECOMMENDED
npm run serve

# Start everything (dev mode with hot-reload)
npm run serve:dev

# Run bridge only (if OpenCode server already running)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type check
npm run typecheck
```

<details>
<summary><b>📁 Project Structure</b></summary>

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
├── scripts/
│   └── start.js                 # Unified launcher
├── .env.example                 # Environment template
├── package.json
└── tsconfig.json
```

</details>

---

## 🔧 Troubleshooting

<details>
<summary><b>Bot doesn't respond to messages</b></summary>

1. If `DISCORD_CHANNEL_PREFIX` is set, check that the channel name starts with that prefix
2. Verify OpenCode server is running: `curl http://127.0.0.1:4096/session`
3. Check bot has `MESSAGE CONTENT INTENT` enabled in Discord Developer Portal

</details>

<details>
<summary><b>"OpenCode server not available"</b></summary>

Start the OpenCode server manually:
```bash
opencode serve --port 4096
```

</details>

<details>
<summary><b>Session errors / 404</b></summary>

The session may have been deleted from OpenCode. Send a new message and the bridge will auto-recreate the session.

</details>

<details>
<summary><b>Long responses are cut off</b></summary>

Responses over 2000 characters are automatically split into multiple messages. If you're still missing content, check the OpenCode server logs.

</details>

---

## 🤝 Contributing

Contributions are welcome! Please ensure TypeScript compiles without errors before submitting.

```bash
# Before submitting a PR
npm run typecheck
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Jérémie MARIE](https://4uu.dev)**

[![GitHub](https://img.shields.io/badge/GitHub-Jeremie--m-181717?style=for-the-badge&logo=github)](https://github.com/Jeremie-m)
[![Website](https://img.shields.io/badge/Website-4uu.dev-00D4AA?style=for-the-badge&logo=safari&logoColor=white)](https://4uu.dev)

⭐ **Star this repo if you find it useful!** ⭐

</div>
