---
name: telegram-mcp
description: Guide for using the Telegram Bot API MCP server effectively. Use when the user asks to send messages, manage chats/groups/channels, work with Telegram bots, send media, create polls, manage stickers, handle payments, or any Telegram Bot API task. Triggers on "telegram", "send message", "bot", "channel", "group chat", "sticker", "poll", "inline keyboard".
---

# Telegram Bot API MCP Server — Usage Guide

You have access to the Telegram Bot API via MCP tools. This server covers **100% of Bot API 9.6** (169 methods).

## Detecting the Mode

The server runs in one of two modes:

### Standard Mode (169 tools)
Each Bot API method is a separate tool with snake_case naming:
- `send_message`, `send_photo`, `ban_chat_member`, `get_chat`, etc.
- Parameters are validated with Zod before hitting the API
- Use tools directly — no discovery step needed

### Meta Mode (2 tools)
Only two tools are exposed:
- **`telegram_find`** — search methods by keyword or category
- **`telegram_call`** — call any method by name

**Always call `telegram_find` first** to discover the correct method name and required parameters before calling `telegram_call`.

```
telegram_find(query: "poll")           → shows sendPoll and its params
telegram_call(method: "sendPoll", params: { chat_id: ..., question: "...", options: [...] })
```

## Tool Naming Convention

MCP tool names are snake_case. Telegram API method names are camelCase:
- Tool: `send_message` → API method: `sendMessage`
- Tool: `ban_chat_member` → API method: `banChatMember`

In meta-mode, `telegram_call` expects the **camelCase** API name.

## Default Chat ID

If `TELEGRAM_DEFAULT_CHAT_ID` is configured, you can omit `chat_id` from any call — the server fills it in automatically. Same for `TELEGRAM_DEFAULT_THREAD_ID` (forum topics).

If the user says "send message" without specifying a chat — just send it, the default will be used.

## Common Workflows

### Send a message
```json
{ "chat_id": 123, "text": "Hello!", "parse_mode": "HTML" }
```
Supports `HTML`, `Markdown`, `MarkdownV2`. Prefer HTML — it's the least error-prone.

### Send media
Use `send_photo`, `send_video`, `send_document`, `send_audio`, `send_animation`, `send_voice`, `send_video_note`.

The media parameter accepts:
1. **file_id** — reuse a file already on Telegram servers (fastest)
2. **HTTP URL** — Telegram downloads it (up to 20MB)
3. **Local file path** — absolute path, uploaded via multipart (up to 50MB)

### Send media group (album)
```json
{
  "chat_id": 123,
  "media": [
    { "type": "photo", "media": "https://example.com/1.jpg", "caption": "First" },
    { "type": "photo", "media": "https://example.com/2.jpg" }
  ]
}
```
2-10 items. Only the first item's caption is shown.

### Inline keyboards
```json
{
  "chat_id": 123,
  "text": "Choose:",
  "reply_markup": {
    "inline_keyboard": [
      [{ "text": "Option A", "callback_data": "a" }, { "text": "Option B", "callback_data": "b" }],
      [{ "text": "Visit site", "url": "https://example.com" }]
    ]
  }
}
```

### Polls (v9.6 features)
```json
{
  "chat_id": 123,
  "question": "Favorite language?",
  "options": [{ "text": "TypeScript" }, { "text": "Python" }, { "text": "Rust" }],
  "allows_revoting": true,
  "shuffle_options": true,
  "description": "Pick your favorite programming language"
}
```
New in 9.6: `allows_revoting`, `shuffle_options`, `allow_adding_options`, `hide_results_until_closes`, `description`, `correct_option_ids` (array, replaces old `correct_option_id`).

### Edit a sent message
```json
// edit_message_text
{ "chat_id": 123, "message_id": 456, "text": "Updated text" }
```
Can also edit caption, media, reply markup, live location.

### Forward / copy messages
- `forward_message` — forwards with "Forwarded from" header
- `copy_message` — copies without header (like a new message)
- `forward_messages` / `copy_messages` — bulk versions (array of message_ids)

### Chat management
```
get_chat(chat_id)                    → full chat info
get_chat_administrators(chat_id)     → list of admins
ban_chat_member(chat_id, user_id)    → ban a user
promote_chat_member(chat_id, user_id, can_manage_chat: true, ...)  → make admin
set_chat_title(chat_id, title)       → change title
```

### Forum topics
```
create_forum_topic(chat_id, name: "Bug Reports")
close_forum_topic(chat_id, message_thread_id)
```
Set `TELEGRAM_DEFAULT_THREAD_ID` to target a specific topic by default.

### Stickers
```
send_sticker(chat_id, sticker: "file_id_or_url")
get_sticker_set(name: "animals_by_bot")
create_new_sticker_set(user_id, name, title, stickers: [...])
```

### Payments (Telegram Stars)
```
send_invoice(chat_id, title, description, payload, currency: "XTR", prices: [{ label: "Item", amount: 100 }])
get_star_transactions()
refund_star_payment(user_id, telegram_payment_charge_id)
```
Use currency `"XTR"` for Telegram Stars. Omit `provider_token` for Star payments.

### Business accounts
Methods prefixed with `set_business_account_*`, `get_business_account_*`.
All require `business_connection_id` — get it from `get_business_connection`.

### Stories
```
post_story(business_connection_id, content: { type: "photo", photo: "..." }, active_period: 86400)
edit_story(business_connection_id, story_id, ...)
delete_story(business_connection_id, story_id)
```

### Gifts
```
send_gift(user_id: 123, gift_id: "...", text: "Happy birthday!")
get_available_gifts()     → list all gifts
get_user_gifts(user_id)   → gifts received by user
```

## Telegram API Limits

These are enforced by Telegram (and by our rate limiter):
- **30 requests/second** globally (for broadcast-style sends)
- **20 messages/minute** to the same group chat
- **~1 message/second** to the same individual chat
- **50 MB** max file upload
- **20 MB** max file download via `get_file`
- **4096 chars** max message text
- **1024 chars** max caption
- **300 chars** max poll question
- **100 messages** max in `delete_messages`
- **10 items** max in `send_media_group`
- **12 options** max in `send_poll`

The server automatically handles 429 (Too Many Requests) by waiting `retry_after` seconds and retrying.

## Error Handling

The server returns `isError: true` with a descriptive message. Common patterns:
- **"Bad Request: chat not found"** — wrong chat_id or bot not in the chat
- **"Forbidden: bot was blocked by the user"** — user blocked the bot
- **"Too Many Requests: retry after N"** — rate limited, server retries automatically
- **"Circuit breaker is OPEN"** — too many consecutive failures, wait for cooldown

## Parse Mode Cheat Sheet

### HTML (recommended)
```html
<b>bold</b> <i>italic</i> <code>mono</code>
<a href="https://example.com">link</a>
<pre language="python">code block</pre>
<blockquote>quote</blockquote>
<tg-spoiler>spoiler</tg-spoiler>
```

### MarkdownV2 (escape these: `_*[]()~>#+-=|{}.!`)
```
*bold* _italic_ `mono` [link](url)
```

## Categories for telegram_find (meta-mode)

Use `category` param to filter:
`messages`, `media`, `polls`, `editing`, `forwarding`, `chat`, `members`, `invite`, `forum`, `stickers`, `inline`, `payments`, `business`, `stories`, `gifts`, `games`, `bot`, `updates`, `managed_bots`, `passport`, `other`

## Things to Remember

1. **chat_id** can be a number (`-1001234567890`) or a string (`"@username"`) for public chats
2. **Channels** use negative IDs starting with `-100`
3. **Supergroups** also use `-100` prefix
4. **user_id** is always a positive integer
5. **message_id** is a positive integer, unique within a chat
6. **file_id** is a string — reuse it to avoid re-uploading
7. **Bot must be admin** to delete others' messages, ban users, pin messages, manage topics
8. **Bot must be in the chat** to send messages (except via inline mode)
9. When editing inline messages, use `inline_message_id` instead of `chat_id` + `message_id`
10. `sendMessageDraft` sends streaming text — useful for showing "typing" with progressive content
