# Bot API coverage and verification

The registry is checked against [Telegram Bot API 10.3](https://core.telegram.org/bots/api)
(August 24, 2026), retrieved September 10, 2026: **185 method names and 932 top-level
parameter entries**. Parameters shared by multiple methods are counted once per method.

## Changes

- Add 21 missing parameter entries across 19 methods; remove 26 obsolete entries.
- Make `editEphemeralMessageText.text` optional so rich-message-only edits are accepted.
- Accept empty `sendMessageDraft.text`, as permitted by Telegram.
- Reject unknown parameters in both MCP modes instead of silently dropping them.
  Required unstructured values must also be present.
- Derive multipart upload traversal from documented input types. Nested files in
  stories, profiles, stickers, polls, paid media, live photos and recursive rich-message
  blocks become `attach://` references with the corresponding bytes in the same request.
  Ordinary text, button URLs and file IDs are not treated as upload fields.
- Isolate URL downloads in per-call temporary directories and clean them on success
  or failure to prevent collisions between simultaneous uploads.
- Return complete API results by default. Operators can opt into truncation with
  `TELEGRAM_MAX_RESPONSE_LENGTH`.
- Show every optional parameter in method search, with pagination via `offset` and
  an input schema when a single method matches.

## What the checks establish

The audit compares method names, parameter names and requiredness, and the generated
file-field graph. Tests exercise an actual in-memory MCP client/server connection
and inspect outgoing HTTP bodies against a mock Telegram endpoint.

These checks do **not** establish that every operation succeeds against a live bot.
No live payments, gifts, stories, administrative actions or business operations were
performed. Telegram validates complex object semantics, permissions, account state,
chat capabilities and file constraints. Complex objects preserve their fields, but
this project does not locally reproduce every Telegram semantic constraint.

On September 10, 2026, type checking, lint, build and **293 tests** passed, along with
the live specification audit. The test count includes separate registry checks for
all 185 methods; it does not mean 293 live Telegram calls.

## Reproduce and update

```bash
npm ci
npm run check       # Types, lint, tests, build and saved-spec audit
npm run audit:live  # Current official spec, without modifying the saved snapshot
```

After a new Bot API release:

```bash
npm run docs:refresh
npm run audit
```

Refreshing documentation also regenerates file-upload schemas. New methods or
parameters still require registry updates and tests; audit failures identify drift.
