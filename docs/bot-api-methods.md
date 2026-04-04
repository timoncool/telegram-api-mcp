# Telegram Bot API v9.6 — Complete Method Reference

> Source: https://core.telegram.org/bots/api
> Last updated: April 3, 2026

## Getting Updates (4 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getUpdates` | Long polling for updates | offset, limit, timeout, allowed_updates |
| `setWebhook` | Set webhook URL | url (req), certificate, ip_address, max_connections, secret_token |
| `deleteWebhook` | Remove webhook | drop_pending_updates |
| `getWebhookInfo` | Get webhook status | — |

## Bot Info & Settings (20+ methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getMe` | Get bot info | — |
| `logOut` | Log out from cloud Bot API | — |
| `close` | Close bot instance | — |
| `setMyCommands` | Set bot commands | commands (req), scope, language_code |
| `deleteMyCommands` | Delete bot commands | scope, language_code |
| `getMyCommands` | Get bot commands | scope, language_code |
| `setMyName` | Set bot name | name, language_code |
| `getMyName` | Get bot name | language_code |
| `setMyDescription` | Set bot description | description, language_code |
| `getMyDescription` | Get bot description | language_code |
| `setMyShortDescription` | Set short description | short_description, language_code |
| `getMyShortDescription` | Get short description | language_code |
| `setMyDefaultAdministratorRights` | Set default admin rights | rights, for_channels |
| `getMyDefaultAdministratorRights` | Get default admin rights | for_channels |
| `setMyDefaultParseMode` | Set default parse mode | parse_mode |
| `getMyDefaultParseMode` | Get default parse mode | — |
| `setMyDefaultChatPermissions` | Set default chat permissions | permissions, for_group_chats |
| `getMyDefaultChatPermissions` | Get default chat permissions | — |
| `setMyProfilePhoto` | Set bot profile photo (v9.4) | photo |
| `removeMyProfilePhoto` | Remove bot profile photo (v9.4) | photo_id |
| `getMyTopics` | Get bot forum topics | — |

## Sending Messages (18 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `sendMessage` | Send text message | chat_id (req), text (req), parse_mode, entities, link_preview_options, reply_parameters, reply_markup, protect_content, effect_id, allow_paid_broadcast |
| `sendMessageDraft` | Send streaming draft (v9.3) | chat_id (req), text (req) |
| `sendPhoto` | Send photo | chat_id (req), photo (req), caption, has_spoiler, show_caption_above_media |
| `sendAudio` | Send audio file | chat_id (req), audio (req), caption, duration, performer, title, thumbnail |
| `sendDocument` | Send document | chat_id (req), document (req), caption, thumbnail, disable_content_type_detection |
| `sendVideo` | Send video | chat_id (req), video (req), caption, duration, width, height, thumbnail, has_spoiler, supports_streaming |
| `sendAnimation` | Send GIF/animation | chat_id (req), animation (req), caption, duration, width, height, thumbnail, has_spoiler |
| `sendVoice` | Send voice message | chat_id (req), voice (req), caption, duration |
| `sendVideoNote` | Send video note | chat_id (req), video_note (req), duration, length, thumbnail |
| `sendPaidMedia` | Send paid media | chat_id (req), star_count (req), media (req), caption |
| `sendMediaGroup` | Send media group | chat_id (req), media (req) — array of InputMedia |
| `sendLocation` | Send location | chat_id (req), latitude (req), longitude (req), live_period, heading |
| `sendVenue` | Send venue | chat_id (req), latitude (req), longitude (req), title (req), address (req) |
| `sendContact` | Send contact | chat_id (req), phone_number (req), first_name (req) |
| `sendPoll` | Send poll/quiz | chat_id (req), question (req), options (req), type, is_anonymous, allows_multiple_answers, correct_option_ids, explanation |
| `sendDice` | Send dice animation | chat_id (req), emoji |
| `sendChatAction` | Show typing/uploading | chat_id (req), action (req) |
| `sendChecklist` | Send checklist (v9.1) | chat_id (req), checklist (req) |

### Common optional params for all send methods:
- `business_connection_id`, `message_thread_id`, `reply_parameters`, `reply_markup`
- `protect_content`, `effect_id`, `allow_paid_broadcast`, `disable_notification`

### sendPoll — NEW in v9.6 (April 2026):
- `allows_revoting` — allow changing vote
- `shuffle_options` — shuffle options randomly
- `allow_adding_options` — allow users to add options
- `hide_results_until_closes` — hide results until poll closes
- `description`, `description_parse_mode`, `description_entities` — poll description
- `correct_option_ids` (replaces `correct_option_id`) — multiple correct answers

## Forwarding & Copying (4 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `forwardMessage` | Forward message | chat_id (req), from_chat_id (req), message_id (req) |
| `forwardMessages` | Forward multiple | chat_id (req), from_chat_id (req), message_ids (req) |
| `copyMessage` | Copy message | chat_id (req), from_chat_id (req), message_id (req), caption |
| `copyMessages` | Copy multiple | chat_id (req), from_chat_id (req), message_ids (req) |

## Editing Messages (7 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `editMessageText` | Edit text | text (req), chat_id/message_id or inline_message_id |
| `editMessageCaption` | Edit caption | caption, chat_id/message_id or inline_message_id |
| `editMessageMedia` | Edit media | media (req), chat_id/message_id or inline_message_id |
| `editMessageReplyMarkup` | Edit keyboard | reply_markup, chat_id/message_id or inline_message_id |
| `editMessageLiveLocation` | Edit live location | latitude (req), longitude (req) |
| `stopMessageLiveLocation` | Stop live location | chat_id/message_id or inline_message_id |
| `editMessageChecklist` | Edit checklist (v9.1) | chat_id (req), message_id (req), checklist (req) |

## Message Management (4 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `deleteMessage` | Delete message | chat_id (req), message_id (req) |
| `deleteMessages` | Delete multiple | chat_id (req), message_ids (req) |
| `setMessageReaction` | Set reaction | chat_id (req), message_id (req), reaction, is_big |
| `stopPoll` | Stop poll | chat_id (req), message_id (req) |

## Pinning (3 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `pinChatMessage` | Pin message | chat_id (req), message_id (req), disable_notification |
| `unpinChatMessage` | Unpin message | chat_id (req), message_id |
| `unpinAllChatMessages` | Unpin all | chat_id (req) |

## Chat Management (20+ methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getChat` | Get chat info | chat_id (req) |
| `getChatAdministrators` | Get admins | chat_id (req) |
| `getChatMemberCount` | Get member count | chat_id (req) |
| `getChatMember` | Get member info | chat_id (req), user_id (req) |
| `banChatMember` | Ban user | chat_id (req), user_id (req), until_date, revoke_messages |
| `unbanChatMember` | Unban user | chat_id (req), user_id (req), only_if_banned |
| `restrictChatMember` | Restrict user | chat_id (req), user_id (req), permissions (req), until_date |
| `promoteChatMember` | Promote to admin | chat_id (req), user_id (req), can_manage_chat, can_delete_messages, can_manage_tags (v9.5), ... |
| `setChatAdministratorCustomTitle` | Set admin title | chat_id (req), user_id (req), custom_title |
| `setChatMemberTag` | Set member tag (v9.5) | chat_id (req), user_id (req), tag |
| `banChatSenderChat` | Ban channel | chat_id (req), sender_chat_id (req) |
| `unbanChatSenderChat` | Unban channel | chat_id (req), sender_chat_id (req) |
| `setChatPermissions` | Set permissions | chat_id (req), permissions (req) |
| `setChatPhoto` | Set chat photo | chat_id (req), photo (req) |
| `deleteChatPhoto` | Delete chat photo | chat_id (req) |
| `setChatTitle` | Set chat title | chat_id (req), title (req) |
| `setChatDescription` | Set description | chat_id (req), description |
| `setChatStickerSet` | Set sticker set | chat_id (req), sticker_set_name (req) |
| `deleteChatStickerSet` | Delete sticker set | chat_id (req) |
| `leaveChat` | Leave chat | chat_id (req) |

## Invite Links (5 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `exportChatInviteLink` | Generate primary link | chat_id (req) |
| `createChatInviteLink` | Create additional link | chat_id (req), name, expire_date, member_limit, creates_join_request |
| `editChatInviteLink` | Edit link | chat_id (req), invite_link (req) |
| `revokeChatInviteLink` | Revoke link | chat_id (req), invite_link (req) |
| `approveChatJoinRequest` | Approve join | chat_id (req), user_id (req) |
| `declineChatJoinRequest` | Decline join | chat_id (req), user_id (req) |

## Forum Topics (12 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getForumTopicIconStickers` | Get icon stickers | — |
| `createForumTopic` | Create topic | chat_id (req), name (req), icon_color, icon_custom_emoji_id |
| `editForumTopic` | Edit topic | chat_id (req), message_thread_id (req), name, icon_custom_emoji_id |
| `closeForumTopic` | Close topic | chat_id (req), message_thread_id (req) |
| `reopenForumTopic` | Reopen topic | chat_id (req), message_thread_id (req) |
| `deleteForumTopic` | Delete topic | chat_id (req), message_thread_id (req) |
| `unpinAllForumTopicMessages` | Unpin all in topic | chat_id (req), message_thread_id (req) |
| `editGeneralForumTopic` | Edit General topic | chat_id (req), name (req) |
| `closeGeneralForumTopic` | Close General | chat_id (req) |
| `reopenGeneralForumTopic` | Reopen General | chat_id (req) |
| `hideGeneralForumTopic` | Hide General | chat_id (req) |
| `unhideGeneralForumTopic` | Unhide General | chat_id (req) |
| `unpinAllGeneralForumTopicMessages` | Unpin all in General | chat_id (req) |

## User Info (4 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getUserProfilePhotos` | Get profile photos | user_id (req), offset, limit |
| `getUserProfileAudios` | Get profile audios (v9.4) | user_id (req), offset, limit |
| `getUserChatBoosts` | Get user boosts | chat_id (req), user_id (req) |
| `getFile` | Get file for download | file_id (req) |

## Stickers (14 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `sendSticker` | Send sticker | chat_id (req), sticker (req) |
| `getStickerSet` | Get sticker set | name (req) |
| `getCustomEmojiStickers` | Get custom emoji | custom_emoji_ids (req) |
| `uploadStickerFile` | Upload sticker file | user_id (req), sticker (req), sticker_format (req) |
| `createNewStickerSet` | Create sticker set | user_id (req), name (req), title (req), stickers (req) |
| `addStickerToSet` | Add sticker | user_id (req), name (req), sticker (req) |
| `setStickerPositionInSet` | Set position | sticker (req), position (req) |
| `deleteStickerFromSet` | Delete sticker | sticker (req) |
| `replaceStickerInSet` | Replace sticker | user_id (req), name (req), old_sticker (req), sticker (req) |
| `setStickerSetTitle` | Set title | name (req), title (req) |
| `setStickerSetThumbnail` | Set thumbnail | name (req), user_id (req), thumbnail |
| `setCustomEmojiStickerSetThumbnail` | Set emoji thumbnail | name (req), custom_emoji_id |
| `deleteStickerSet` | Delete set | name (req) |
| `setStickerEmojiList` | Set emoji list | sticker (req), emoji_list (req) |

## Inline Mode (2 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `answerInlineQuery` | Answer inline query | inline_query_id (req), results (req), cache_time, is_personal, next_offset |
| `answerCallbackQuery` | Answer callback | callback_query_id (req), text, show_alert, url, cache_time |

## Payments (5+ methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `sendInvoice` | Send invoice | chat_id (req), title (req), description (req), payload (req), currency (req), prices (req) |
| `createInvoiceLink` | Create invoice link | title (req), description (req), payload (req), currency (req), prices (req) |
| `answerShippingQuery` | Answer shipping | shipping_query_id (req), ok (req), shipping_options, error_message |
| `answerPreCheckoutQuery` | Answer pre-checkout | pre_checkout_query_id (req), ok (req), error_message |
| `getStarTransactions` | Get star transactions | offset, limit |
| `getMyStarBalance` | Get star balance (v9.1) | — |
| `refundStarPayment` | Refund stars | user_id (req), telegram_payment_charge_id (req) |

## Business (10+ methods, v9.0+)

| Method | Description | Key Params |
|--------|-------------|------------|
| `readBusinessMessage` | Mark as read | business_connection_id (req), chat_id (req), message_id (req) |
| `deleteBusinessMessages` | Delete messages | business_connection_id (req), message_ids (req) |
| `setBusinessAccountName` | Set name | business_connection_id (req), first_name (req), last_name |
| `setBusinessAccountUsername` | Set username | business_connection_id (req), username |
| `setBusinessAccountBio` | Set bio | business_connection_id (req), bio |
| `setBusinessAccountProfilePhoto` | Set photo | business_connection_id (req), photo (req) |
| `removeBusinessAccountProfilePhoto` | Remove photo | business_connection_id (req), photo_id |
| `setBusinessAccountGiftSettings` | Set gift settings | business_connection_id (req), show_gift_button, accepted_gift_types |
| `getBusinessAccountGifts` | Get gifts | business_connection_id (req) |
| `getBusinessAccountStarBalance` | Get star balance | business_connection_id (req) |
| `transferBusinessAccountStars` | Transfer stars | business_connection_id (req), star_count (req) |

## Stories (4 methods, v9.0+)

| Method | Description | Key Params |
|--------|-------------|------------|
| `postStory` | Post story | business_connection_id (req), content (req), active_period (req) |
| `editStory` | Edit story | business_connection_id (req), story_id (req), content |
| `deleteStory` | Delete story | business_connection_id (req), story_id (req) |
| `repostStory` | Repost story (v9.3) | chat_id (req), story_sender_chat_id (req), story_id (req) |

## Gifts (5+ methods, v9.0+)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getAvailableGifts` | Get available gifts | — |
| `sendGift` | Send gift | user_id (req), gift_id (req), text |
| `convertGiftToStars` | Convert to stars | business_connection_id (req), owned_gift_id (req) |
| `upgradeGift` | Upgrade gift | business_connection_id (req), owned_gift_id (req) |
| `transferGift` | Transfer gift | business_connection_id (req), owned_gift_id (req), new_owner_chat_id (req) |
| `getUserGifts` | Get user gifts (v9.3) | user_id (req) |
| `getChatGifts` | Get chat gifts (v9.3) | chat_id (req) |
| `giftPremiumSubscription` | Gift premium (v9.0) | user_id (req), month_count (req), star_count (req) |

## Suggested Posts (2 methods, v9.2+)

| Method | Description | Key Params |
|--------|-------------|------------|
| `approveSuggestedPost` | Approve post | business_connection_id (req), message_id (req) |
| `declineSuggestedPost` | Decline post | business_connection_id (req), message_id (req) |

## Managed Bots (2 methods, v9.6)

| Method | Description | Key Params |
|--------|-------------|------------|
| `getManagedBotToken` | Get managed bot token | user_id (req) |
| `replaceManagedBotToken` | Replace token | user_id (req) |

## Other (3 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `savePreparedKeyboardButton` | Save button (v9.6) | user_id (req), button (req) |
| `setPassportDataErrors` | Passport errors | user_id (req), errors (req) |
| `getChatBoosts` | Get chat boosts | chat_id (req) |

## Games (3 methods)

| Method | Description | Key Params |
|--------|-------------|------------|
| `sendGame` | Send game | chat_id (req), game_short_name (req) |
| `setGameScore` | Set score | user_id (req), score (req), chat_id/message_id or inline_message_id |
| `getGameHighScores` | Get high scores | user_id (req), chat_id/message_id or inline_message_id |

## Webhook (already in Getting Updates)

---

## Total Method Count: ~150+ methods

### Methods by API version:
- **v9.0** (Apr 2025): +readBusinessMessage, deleteBusinessMessages, setBusinessAccount*, postStory, editStory, deleteStory, convertGiftToStars, upgradeGift, transferGift, giftPremiumSubscription
- **v9.1** (Jul 2025): +sendChecklist, editMessageChecklist, getMyStarBalance
- **v9.2** (Aug 2025): +approveSuggestedPost, declineSuggestedPost
- **v9.3** (Dec 2025): +sendMessageDraft, getUserGifts, getChatGifts, repostStory
- **v9.4** (Feb 2026): +setMyProfilePhoto, removeMyProfilePhoto, getUserProfileAudios
- **v9.5** (Mar 2026): +setChatMemberTag
- **v9.6** (Apr 2026): +getManagedBotToken, replaceManagedBotToken, savePreparedKeyboardButton
