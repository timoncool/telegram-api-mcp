# telegram-api-mcp

[![Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-9.6-26A5E4?logo=telegram)](https://core.telegram.org/bots/api)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Ultimate MCP server for Telegram Bot API** — 160 methods, full v9.6 coverage, meta-mode, rate limiting, circuit breaker.

## Features

- **160 Bot API methods** — messages, media, polls, chats, forums, stickers, payments, business, stories, gifts, games, inline, managed bots
- **Bot API 9.6** (April 2026) — managed bots, revoting polls, shuffle options, poll descriptions
- **Meta-mode** — 2 tools instead of 160 for ~99% context token savings
- **Rate limiting** — global (per second) + per-chat (per minute), token bucket algorithm
- **Circuit breaker** — auto-opens after consecutive failures, half-open recovery
- **Retry with retry_after** — respects Telegram's 429 headers, exponential backoff
- **File uploads** — multipart/form-data with streaming, path traversal protection
- **Zod validation** — every parameter validated before hitting Telegram API
- **Token safety** — bot token never appears in logs, responses, or error messages
- **DEFAULT_CHAT_ID** — set once, skip chat_id in every call
- **TypeScript strict** — noImplicitAny, noUnusedLocals, full type safety
- **Zero bloat** — only 2 dependencies: `@modelcontextprotocol/sdk` + `zod`

## Quick Start

### Claude Code

```bash
claude mcp add -e TELEGRAM_BOT_TOKEN=your_token telegram-api -- npx telegram-api-mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["telegram-api-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your_token_from_botfather"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/timoncool/telegram-api-mcp.git
cd telegram-api-mcp
npm install
npm run build
TELEGRAM_BOT_TOKEN=your_token node dist/index.js
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | **Yes** | — | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_DEFAULT_CHAT_ID` | No | — | Default chat ID for all tools |
| `TELEGRAM_DEFAULT_THREAD_ID` | No | — | Default forum topic thread ID |
| `TELEGRAM_META_MODE` | No | `false` | Use 2 meta-tools instead of 160 |
| `TELEGRAM_GLOBAL_RATE_LIMIT` | No | `30` | Max requests per second |
| `TELEGRAM_PER_CHAT_RATE_LIMIT` | No | `20` | Max messages per minute per chat |
| `TELEGRAM_MAX_RETRIES` | No | `3` | Retry attempts on transient errors |
| `TELEGRAM_CB_THRESHOLD` | No | `5` | Failures before circuit opens |
| `TELEGRAM_CB_COOLDOWN` | No | `30000` | Circuit breaker cooldown (ms) |
| `TELEGRAM_ALLOWED_UPLOAD_DIRS` | No | — | Comma-separated allowed upload paths |
| `TELEGRAM_MAX_FILE_SIZE` | No | `52428800` | Max upload file size (50MB) |

## Meta Mode

When `TELEGRAM_META_MODE=true`, the server exposes only 2 tools instead of 160:

- **`telegram_find`** — search methods by keyword or category
- **`telegram_call`** — call any method by name with JSON params

This saves ~99% of context tokens while keeping full API access. The AI discovers methods on-demand:

```
User: "Post a poll in my channel"
AI: → telegram_find(query: "poll")
AI: → telegram_call(method: "sendPoll", params: { question: "...", options: [...] })
```

## API Coverage

| Category | Methods | Examples |
|----------|---------|---------|
| Messages | 9 | sendMessage, sendDice, sendChatAction, sendChecklist |
| Media | 9 | sendPhoto, sendVideo, sendDocument, sendMediaGroup |
| Polls | 1 | sendPoll (v9.6: revoting, shuffle, descriptions) |
| Editing | 10 | editMessageText, deleteMessage, deleteMessages |
| Forwarding | 4 | forwardMessage, copyMessage, copyMessages |
| Chat | 16 | getChat, setChatTitle, setChatPermissions, pinChatMessage |
| Members | 9 | banChatMember, promoteChatMember, setChatMemberTag |
| Invite | 6 | createChatInviteLink, approveChatJoinRequest |
| Forum | 13 | createForumTopic, editForumTopic, closeForumTopic |
| Bot | 24 | getMe, setMyCommands, setMyProfilePhoto, getFile |
| Stickers | 14 | sendSticker, createNewStickerSet, uploadStickerFile |
| Payments | 7 | sendInvoice, getStarTransactions, refundStarPayment |
| Business | 13 | readBusinessMessage, setBusinessAccountName, postStory |
| Stories | 4 | postStory, editStory, deleteStory, repostStory |
| Gifts | 8 | sendGift, getUserGifts, convertGiftToStars, upgradeGift |
| Games | 3 | sendGame, setGameScore, getGameHighScores |
| Inline | 2 | answerInlineQuery, answerCallbackQuery |
| Managed Bots | 3 | getManagedBotToken, replaceManagedBotToken (v9.6) |
| Updates | 4 | getUpdates, setWebhook, getWebhookInfo |
| Passport | 1 | setPassportDataErrors |

## Architecture

```
src/
├── index.ts              # Entry point
├── config.ts             # Environment config with validation
├── server.ts             # MCP server (standard + meta mode)
├── telegram-client.ts    # HTTP client with retry, rate limit, circuit breaker
├── rate-limiter.ts       # Token bucket: global + per-chat
├── circuit-breaker.ts    # 3-state circuit breaker (closed/open/half-open)
├── method-registry.ts    # Declarative method definitions + Zod schema builder
└── methods/
    ├── index.ts          # Aggregator + search
    ├── messages.ts       # sendMessage, sendDice, sendChecklist, ...
    ├── media.ts          # → in messages.ts (sendPhoto, sendVideo, ...)
    ├── forwarding.ts     # forwardMessage, copyMessage, ...
    ├── editing.ts        # editMessageText, deleteMessage, ...
    ├── chat.ts           # getChat, setChatTitle, banChatMember, ...
    ├── bot.ts            # getMe, setMyCommands, getFile, ...
    ├── forum.ts          # createForumTopic, editForumTopic, ...
    ├── stickers.ts       # sendSticker, createNewStickerSet, ...
    ├── payments.ts       # sendInvoice, getStarTransactions, ...
    ├── business.ts       # readBusinessMessage, setBusinessAccount*, ...
    ├── stories.ts        # postStory, editStory, deleteStory, ...
    ├── gifts.ts          # sendGift, getUserGifts, convertGiftToStars, ...
    ├── games.ts          # sendGame, setGameScore, ...
    ├── inline.ts         # answerInlineQuery, answerCallbackQuery
    ├── managed-bots.ts   # getManagedBotToken, replaceManagedBotToken
    ├── updates.ts        # getUpdates, setWebhook, ...
    └── passport.ts       # setPassportDataErrors
```

### Key design decisions

- **Declarative registry** — each method is data (name, params, types, validation), not a handler. One generic handler serves all 160 methods. Adding a new Bot API method = one array entry.
- **Zod everywhere** — params validated before reaching Telegram. Clear error messages instead of opaque API 400s.
- **Token bucket rate limiting** — mathematically correct, no race conditions in async context. Per-chat limiting prevents Telegram's 20msg/min/chat restriction.
- **Circuit breaker** — 429 (rate limit) is NOT counted as failure. Only real errors (5xx, network) trip the breaker.
- **No token leakage** — token masked in all error messages, never returned in tool responses. `getFile` returns `file_path`, not full URL with token.
- **Path traversal protection** — file uploads restricted to `TELEGRAM_ALLOWED_UPLOAD_DIRS` when set.

## Security

- Bot token never appears in MCP tool responses or logs
- File upload paths validated against allowed directories
- Path traversal attacks blocked (resolve + normalize + startsWith check)
- No `eval()`, no `Function()`, no dynamic imports
- No external requests except `api.telegram.org`
- No telemetry, no analytics, no phone-home

## License

MIT
