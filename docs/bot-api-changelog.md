# Telegram Bot API Changelog (v9.0 — v9.6)

> Source: https://core.telegram.org/bots/api-changelog

## Bot API 9.6 — April 3, 2026

### New Methods
- `getManagedBotToken` — get token for managed bot
- `replaceManagedBotToken` — replace managed bot token
- `savePreparedKeyboardButton` — save prepared keyboard button

### New Types
- `KeyboardButtonRequestManagedBot`
- `ManagedBotCreated`
- `ManagedBotUpdated`
- `PreparedKeyboardButton`
- `PollOptionAdded`, `PollOptionDeleted`

### Polls Major Update
- Multiple correct answers: `correct_option_ids` replaces `correct_option_id` (**BREAKING**)
- `allows_revoting` — allow users to change votes
- `shuffle_options` — randomize option order
- `allow_adding_options` — users can add poll options
- `hide_results_until_closes` — hide results until closure
- `description`, `description_parse_mode`, `description_entities` — poll description
- PollOption: `persistent_id`, `added_by_user`, `added_by_chat`, `addition_date`
- PollAnswer: `option_persistent_ids`
- ReplyParameters: `poll_option_id`
- Message: `reply_to_poll_option_id`

### Other
- `can_manage_bots` field in User
- `request_managed_bot` in KeyboardButton
- `managed_bot_created` in Message
- Max poll closure time: 2,628,000 seconds

---

## Bot API 9.5 — March 1, 2026

### New Methods
- `setChatMemberTag` — set/remove member tags in chats

### New Features
- MessageEntity type `date_time` for formatted date/time
- `sendMessageDraft` expanded to ALL bots (was limited before)
- `tag` field in ChatMemberMember and ChatMemberRestricted
- `can_edit_tag` in ChatPermissions
- `can_manage_tags` in ChatMemberAdministrator and ChatAdministratorRights
- `can_manage_tags` parameter in `promoteChatMember`
- `sender_tag` in Message
- `iconCustomEmojiId` in BottomButton (WebApps)

---

## Bot API 9.4 — February 9, 2026

### New Methods
- `setMyProfilePhoto` — set bot profile photo
- `removeMyProfilePhoto` — remove bot profile photo
- `getUserProfileAudios` — get user profile audio tracks

### New Types
- `ChatOwnerLeft`, `ChatOwnerChanged`
- `VideoQuality`
- `UserProfileAudios`

### New Features
- Custom emoji in direct bot messages (Premium)
- `createForumTopic` works in private chats
- `allows_users_to_create_topics` in User
- `icon_custom_emoji_id`, `style` in KeyboardButton and InlineKeyboardButton
- `qualities` in Video
- `first_profile_audio` in ChatFullInfo
- `rarity` in UniqueGiftModel
- `is_burned` in UniqueGift

---

## Bot API 9.3 — December 31, 2025

### New Methods
- `sendMessageDraft` — send streaming partial messages (initially limited bots)
- `getUserGifts` — fetch user's gifts
- `getChatGifts` — fetch chat's gifts
- `repostStory` — repost stories

### New Features
- `message_thread_id` in private chat topics
- `exclude_from_blockchain` in getBusinessAccountGifts

### Breaking Changes
- `last_resale_star_count` replaced with `last_resale_currency` + `last_resale_amount`

---

## Bot API 9.2 — August 15, 2025

### New Methods
- `approveSuggestedPost` — approve suggested channel post
- `declineSuggestedPost` — decline suggested channel post

### New Types
- `DirectMessagesTopic`
- `SuggestedPostParameters`, `SuggestedPostPrice`, `SuggestedPostInfo`

### New Features
- `checklist_task_id` in ReplyParameters
- `direct_messages_topic_id` across send methods

---

## Bot API 9.1 — July 3, 2025

### New Methods
- `sendChecklist` — send interactive checklist
- `editMessageChecklist` — edit checklist message
- `getMyStarBalance` — get bot's Telegram Stars balance

### New Types
- `ChecklistTask`, `Checklist`, `InputChecklist`, `InputChecklistTask`
- `ChecklistTasksDone`, `ChecklistTasksAdded`

### Other
- Max poll options increased to 12

---

## Bot API 9.0 — April 11, 2025

### New Methods — Business
- `readBusinessMessage` — mark business message as read
- `deleteBusinessMessages` — delete business messages
- `setBusinessAccountName` — set business account name
- `setBusinessAccountUsername` — set business username
- `setBusinessAccountBio` — set business bio
- `setBusinessAccountProfilePhoto` — set business profile photo
- `removeBusinessAccountProfilePhoto` — remove business profile photo
- `setBusinessAccountGiftSettings` — configure gift settings
- `getBusinessAccountGifts` — get gifts
- `getBusinessAccountStarBalance` — get star balance
- `transferBusinessAccountStars` — transfer stars

### New Methods — Stories
- `postStory` — post a story
- `editStory` — edit a story
- `deleteStory` — delete a story

### New Methods — Gifts
- `convertGiftToStars` — convert gift to stars
- `upgradeGift` — upgrade gift to unique
- `transferGift` — transfer gift to another user
- `giftPremiumSubscription` — gift premium subscription

### New Types
- `BusinessBotRights`, `InputProfilePhoto`
- `InputStoryContentPhoto`, `InputStoryContentVideo`, `StoryArea`
- `UniqueGift`, `GiftInfo`, `AcceptedGiftTypes`
- `StarAmount`

### Breaking Changes
- `can_reply` replaced with `rights` (type `BusinessBotRights`)

---

## Summary: New Methods by Version

| Version | Date | New Methods |
|---------|------|-------------|
| 9.0 | Apr 2025 | 15+ (business, stories, gifts) |
| 9.1 | Jul 2025 | 3 (checklist, star balance) |
| 9.2 | Aug 2025 | 2 (suggested posts) |
| 9.3 | Dec 2025 | 4 (draft, gifts, repost) |
| 9.4 | Feb 2026 | 3 (profile photo, audios) |
| 9.5 | Mar 2026 | 1 (member tags) |
| 9.6 | Apr 2026 | 3 (managed bots, polls) |
