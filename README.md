<div align="center">

# telegram-api-mcp

**Ultimate MCP server for Telegram Bot API — 169 methods, full v9.6 coverage, meta-mode, rate limiting, circuit breaker.**

[![Stars](https://img.shields.io/github/stars/timoncool/telegram-api-mcp?style=flat-square)](https://github.com/timoncool/telegram-api-mcp/stargazers)
[![npm](https://img.shields.io/npm/v/telegram-api-mcp?style=flat-square)](https://www.npmjs.com/package/telegram-api-mcp)
[![License](https://img.shields.io/github/license/timoncool/telegram-api-mcp?style=flat-square)](LICENSE)
[![Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-9.6-26A5E4?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![TRAIL](https://img.shields.io/badge/TRAIL-v2.1-6366f1?style=flat-square)](https://github.com/timoncool/trail-spec)

</div>

169/169 Bot API methods with Zod validation, token masking, tool annotations, and zero bloat (2 dependencies).

## Features

- **169/169 Bot API methods** — messages, media, polls, chats, forums, stickers, payments, business, stories, gifts, games, inline, managed bots
- **Bot API 9.6** (April 2026) — managed bots, revoting polls, shuffle options, poll descriptions
- **Meta-mode** — 2 tools instead of 169, saves ~99% context tokens
- **Rate limiting** — global (30 req/sec) + per-chat (20 msg/min), token bucket with async mutex
- **Circuit breaker** — 3-state (closed/open/half-open), auto-recovery
- **Retry with backoff** — respects Telegram 429 `retry_after`, exponential backoff on 5xx
- **Zod validation** — every parameter validated before hitting Telegram API
- **Token masking** — bot token never appears in responses, logs, or error messages
- **File upload security** — path traversal protection, configurable allowed directories
- **Tool annotations** — all 169 methods annotated (readOnly, destructive, idempotent, openWorld)
- **Response truncation** — 100K char limit to prevent context overflow
- **Zero bloat** — only 2 dependencies: `@modelcontextprotocol/sdk` + `zod`

## Quick Start

### Claude Code

```bash
claude mcp add telegram -- npx telegram-api-mcp -e TELEGRAM_BOT_TOKEN=your_token
```

With meta-mode (recommended for large conversations):

```bash
claude mcp add telegram -- npx telegram-api-mcp \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e TELEGRAM_META_MODE=true
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

### With default chat (skip chat_id in every call)

```json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["telegram-api-mcp"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your_token",
        "TELEGRAM_DEFAULT_CHAT_ID": "-1001234567890"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/timoncool/telegram-api-mcp.git
cd telegram-api-mcp
npm install && npm run build
TELEGRAM_BOT_TOKEN=your_token node dist/index.js
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|:---:|:---:|-------------|
| `TELEGRAM_BOT_TOKEN` | **Yes** | — | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_DEFAULT_CHAT_ID` | No | — | Default chat ID for all tools |
| `TELEGRAM_DEFAULT_THREAD_ID` | No | — | Default forum topic thread ID |
| `TELEGRAM_META_MODE` | No | `false` | Use 2 meta-tools instead of 169 |
| `TELEGRAM_GLOBAL_RATE_LIMIT` | No | `30` | Max requests/sec ([Telegram limit](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits)) |
| `TELEGRAM_PER_CHAT_RATE_LIMIT` | No | `20` | Max messages/min per group ([Telegram limit](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits)) |
| `TELEGRAM_MAX_RETRIES` | No | `3` | Retry attempts on transient errors |
| `TELEGRAM_CB_THRESHOLD` | No | `5` | Failures before circuit opens |
| `TELEGRAM_CB_COOLDOWN` | No | `30000` | Circuit breaker cooldown (ms) |
| `TELEGRAM_ALLOWED_UPLOAD_DIRS` | No | — | Comma-separated allowed upload paths |
| `TELEGRAM_MAX_FILE_SIZE` | No | `52428800` | Max upload file size (50MB) |

## Meta Mode

When `TELEGRAM_META_MODE=true`, the server exposes only 2 tools instead of 169:

- **`telegram_find`** — search methods by keyword or category
- **`telegram_call`** — call any method by name with JSON params

This saves ~99% of context tokens while keeping full API access:

```
User: "Post a poll in my channel"
AI: → telegram_find(query: "poll")
AI: → telegram_call(method: "sendPoll", params: { chat_id: ..., question: "...", options: [...] })
```

## API Coverage

169/169 methods — **100% Bot API 9.6** (April 2026)

| Category | Count | Key methods |
|----------|:---:|-------------|
| Bot | 21 | getMe, setMyCommands, setMyProfilePhoto, getFile, getUserProfilePhotos |
| Stickers | 16 | sendSticker, createNewStickerSet, uploadStickerFile, setStickerKeywords |
| Chat | 15 | getChat, setChatTitle, setChatPermissions, pinChatMessage, leaveChat |
| Business | 14 | readBusinessMessage, setBusinessAccountName, getBusinessConnection |
| Forum | 13 | createForumTopic, editForumTopic, closeForumTopic, deleteForumTopic |
| Editing | 10 | editMessageText, editMessageMedia, deleteMessage, deleteMessages, stopPoll |
| Messages | 9 | sendMessage, sendMessageDraft, sendLocation, sendContact, sendChecklist |
| Media | 9 | sendPhoto, sendVideo, sendAudio, sendDocument, sendMediaGroup, sendPaidMedia |
| Members | 9 | banChatMember, promoteChatMember, setChatMemberTag, restrictChatMember |
| Invite | 8 | createChatInviteLink, createChatSubscriptionInviteLink, approveChatJoinRequest |
| Payments | 8 | sendInvoice, createInvoiceLink, getStarTransactions, getMyStarBalance |
| Gifts | 8 | sendGift, getUserGifts, getChatGifts, giftPremiumSubscription, upgradeGift |
| Other | 5 | verifyUser, verifyChat, setUserEmojiStatus, savePreparedInlineMessage |
| Forwarding | 4 | forwardMessage, forwardMessages, copyMessage, copyMessages |
| Stories | 4 | postStory, editStory, deleteStory, repostStory |
| Inline | 4 | answerInlineQuery, answerCallbackQuery, answerWebAppQuery, savePreparedInlineMessage |
| Updates | 4 | getUpdates, setWebhook, deleteWebhook, getWebhookInfo |
| Games | 3 | sendGame, setGameScore, getGameHighScores |
| Managed Bots | 3 | getManagedBotToken, replaceManagedBotToken, savePreparedKeyboardButton |
| Polls | 1 | sendPoll (v9.6: revoting, shuffle, multiple correct, descriptions) |
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
    ├── passport.ts       # setPassportDataErrors
    └── other.ts          # verifyUser, setChatMenuButton, ...
```

### Design principles

- **Declarative registry** — each method is pure data (name, params, types, annotations). One generic handler serves all 169 methods. Adding a new method = one array entry.
- **Zod validation** — every parameter validated before reaching Telegram. Clear error messages with hints instead of opaque API 400s.
- **Token bucket rate limiting** — no race conditions (async mutex). Defaults match [Telegram's official limits](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits): 30 req/sec global, 20 msg/min per group.
- **Circuit breaker** — 429 (rate limit) is NOT counted as failure. Only real errors (5xx, network) trip the breaker. Half-open probe recovers automatically.
- **Tool annotations** — every method has MCP annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint) so AI clients know which tools are safe to auto-approve.
- **Response truncation** — responses capped at 100K chars to prevent context window overflow.

## Security

- Bot token never appears in MCP tool responses or error messages (masked as `***`)
- File upload paths validated against allowed directories (`TELEGRAM_ALLOWED_UPLOAD_DIRS`)
- Path traversal attacks blocked (resolve + normalize + separator check)
- No `eval()`, no `Function()`, no dynamic imports
- No external requests except `api.telegram.org`
- No telemetry, no analytics, no phone-home
- Zero bloat: only 2 runtime dependencies (`@modelcontextprotocol/sdk` + `zod`)

## Development

```bash
npm install
npm run build         # TypeScript compilation
npm run typecheck     # Type checking without emit
npm test              # Run all tests (vitest)
npm run test:watch    # Watch mode
npm run lint          # ESLint
```

## Other Projects by [@timoncool](https://github.com/timoncool)

| Project | Description |
|---------|-------------|
| [civitai-mcp-ultimate](https://github.com/timoncool/civitai-mcp-ultimate) | Civitai API as MCP server |
| [trail-spec](https://github.com/timoncool/trail-spec) | TRAIL — cross-MCP content tracking protocol |
| [ACE-Step Studio](https://github.com/timoncool/ACE-Step-Studio) | AI music studio — songs, vocals, covers, videos |
| [VideoSOS](https://github.com/timoncool/videosos) | AI video production in the browser |
| [tg-challenge-bot](https://github.com/timoncool/tg-challenge-bot) | AI anti-spam bot for Telegram |
| [Bulka](https://github.com/timoncool/Bulka) | Live-coding music platform |

## Support the Author

I build open-source software and do AI research. Most of what I create is free and available to everyone. Your donations help me keep creating without worrying about where the next meal comes from =)

**[All donation methods](https://github.com/timoncool/ACE-Step-Studio/blob/master/DONATE.md)** | **[dalink.to/nerual_dreming](https://dalink.to/nerual_dreming)** | **[boosty.to/neuro_art](https://boosty.to/neuro_art)**

- **BTC:** `1E7dHL22RpyhJGVpcvKdbyZgksSYkYeEBC`
- **ETH (ERC20):** `0xb5db65adf478983186d4897ba92fe2c25c594a0c`
- **USDT (TRC20):** `TQST9Lp2TjK6FiVkn4fwfGUee7NmkxEE7C`


## Star History

<a href="https://www.star-history.com/?repos=timoncool%2Ftelegram-api-mcp&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=timoncool/telegram-api-mcp&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=timoncool/telegram-api-mcp&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=timoncool/telegram-api-mcp&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT
