# Gap Analysis: Existing MCP Servers vs Bot API 9.6

## Methods missing from ALL three libraries

These methods exist in Bot API 9.6 but are NOT implemented in any of the three audited MCP servers:

### v9.6 (April 3, 2026) — NONE have these
- `getManagedBotToken` — new
- `replaceManagedBotToken` — new
- `savePreparedKeyboardButton` — new
- sendPoll updated params: `allows_revoting`, `shuffle_options`, `allow_adding_options`, `hide_results_until_closes`, `description`, `description_parse_mode`, `description_entities`
- `correct_option_ids` replaces `correct_option_id` (**breaking change**)

### v9.5 (March 1, 2026) — Only FantomaSkaRus1 has setChatMemberTag
- `setChatMemberTag` — FantomaSkaRus1: YES, TONresistor: NO, DeadBeef: NO
- `can_manage_tags` param in promoteChatMember — FantomaSkaRus1: YES, others: NO
- `sendMessageDraft` expanded to all bots — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: NO

### v9.4 (February 9, 2026)
- `setMyProfilePhoto` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES
- `removeMyProfilePhoto` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES
- `getUserProfileAudios` — FantomaSkaRus1: YES, TONresistor: NO, DeadBeef: NO

### v9.3 (December 31, 2025)
- `sendMessageDraft` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: NO
- `getUserGifts` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES
- `getChatGifts` — FantomaSkaRus1: YES, TONresistor: NO, DeadBeef: YES
- `repostStory` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES

### v9.2 (August 2025)
- `approveSuggestedPost` — FantomaSkaRus1: YES, TONresistor: NO, DeadBeef: NO
- `declineSuggestedPost` — FantomaSkaRus1: YES, TONresistor: NO, DeadBeef: NO

### v9.1 (July 2025)
- `sendChecklist` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES
- `editMessageChecklist` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: NO
- `getMyStarBalance` — FantomaSkaRus1: YES, TONresistor: YES, DeadBeef: YES

---

## Feature comparison

| Feature | FantomaSkaRus1 | TONresistor | DeadBeef | **Our Server** |
|---------|---------------|-------------|----------|----------------|
| Bot API version | ~9.5 | ~9.4 | ~9.3 | **9.6** |
| Total methods | 174 | 161 | 166 | **ALL** |
| v9.6 methods | NO | NO | NO | **YES** |
| v9.5 methods | Partial | NO | NO | **YES** |
| Multipart upload | YES (sync) | YES (broken Win) | NO | **YES (stream)** |
| Rate limiting | Global only | Global + per-chat | NONE | **Global + per-chat** |
| Circuit breaker | NO | YES | NO | **YES** |
| Retry w/ retry_after | NO | YES | NO | **YES** |
| Validation (Zod) | All fields | 35 methods | NONE | **All methods** |
| Tests | NONE | Unit+Integration | NONE | **Full** |
| Meta-mode | NO | YES (2 tools) | NO | **YES** |
| DEFAULT_CHAT_ID | YES | NO | NO | **YES** |
| Path sanitization | NO (traversal!) | NO | N/A | **YES** |
| Token masking | NO (leaks!) | YES | Partial | **YES** |
| Windows support | YES | BROKEN | YES | **YES** |
| npm/npx | NO | NO | NO (crates.io) | **YES** |
| Docker | YES | NO | NO | **YES** |
| CI/CD | NO | NO | self-hosted | **GitHub Actions** |

---

## Our server must have (from day 1)

### Critical
1. ALL Bot API 9.6 methods (~150+)
2. Multipart file upload with streaming (not readFileSync)
3. Path sanitization (whitelist dirs, block traversal)
4. Token never in responses or logs
5. Zod validation on ALL methods
6. Rate limiting: global + per-chat + retry_after
7. Circuit breaker
8. Cross-platform file paths (Windows + Unix)
9. DEFAULT_CHAT_ID + DEFAULT_THREAD_ID env vars
10. Meta-mode (2 tools for token economy)

### Important
11. npm package with npx support
12. Tests (unit + integration)
13. GitHub Actions CI
14. Docker support
15. TypeScript strict mode

### Nice to have
16. Prometheus metrics
17. Health endpoint
18. Webhook mode (in addition to polling)
