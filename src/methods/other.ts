import { z } from "zod";
import {
  MethodDef, ChatId, UserId, Text, ParseMode, MessageEntities, BooleanFlag,
  commonSendParams,
  ANNOTATIONS,
} from "../method-registry.js";

export const otherMethods: MethodDef[] = [
  // ─── sendMessageDraft (v9.3, expanded to all bots in v9.5) ────────────
  {
    apiMethod: "sendMessageDraft",
    annotations: ANNOTATIONS.send,
    toolName: "send_message_draft",
    description: "Send a streaming draft message. Content appears progressively as it's being generated.",
    category: "messages",
    needsChatId: true,
    canUploadFiles: false,
    returns: "Message",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Target chat ID" },
      { name: "text", type: Text, required: true, description: "Draft message text" },
      { name: "parse_mode", type: ParseMode, required: false, description: "Text formatting mode" },
      { name: "entities", type: MessageEntities, required: false, description: "Special entities" },
      ...commonSendParams(),
    ],
  },

  // ─── WebApp ───────────────────────────────────────────────────────────
  {
    apiMethod: "answerWebAppQuery",
    annotations: ANNOTATIONS.send,
    toolName: "answer_web_app_query",
    description: "Set the result of an interaction with a Web App and send a message on behalf of the user.",
    category: "inline",
    needsChatId: false,
    canUploadFiles: false,
    returns: "SentWebAppMessage",
    params: [
      { name: "web_app_query_id", type: z.string(), required: true, description: "Web App query ID" },
      { name: "result", type: z.any(), required: true, description: "InlineQueryResult object" },
    ],
  },

  // ─── Chat Menu Button ─────────────────────────────────────────────────
  {
    apiMethod: "setChatMenuButton",
    annotations: ANNOTATIONS.modify,
    toolName: "set_chat_menu_button",
    description: "Set the bot's menu button in a private chat or default menu button.",
    category: "bot",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "chat_id", type: z.number().int(), required: false, description: "Chat ID for specific chat" },
      { name: "menu_button", type: z.any(), required: false, description: "MenuButton object" },
    ],
  },
  {
    apiMethod: "getChatMenuButton",
    annotations: ANNOTATIONS.readOnly,
    toolName: "get_chat_menu_button",
    description: "Get the current menu button for a chat or default.",
    category: "bot",
    needsChatId: false,
    canUploadFiles: false,
    returns: "MenuButton",
    params: [
      { name: "chat_id", type: z.number().int(), required: false, description: "Chat ID for specific chat" },
    ],
  },

  // ─── Subscription Invite Links ────────────────────────────────────────
  {
    apiMethod: "createChatSubscriptionInviteLink",
    annotations: ANNOTATIONS.send,
    toolName: "create_chat_subscription_invite_link",
    description: "Create a subscription invite link for a channel chat.",
    category: "invite",
    needsChatId: true,
    canUploadFiles: false,
    returns: "ChatInviteLink",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
      { name: "name", type: z.string().max(32), required: false, description: "Link name (0-32 chars)" },
      { name: "subscription_period", type: z.number().int(), required: true, description: "Subscription period in seconds" },
      { name: "subscription_price", type: z.number().int(), required: true, description: "Subscription price in Stars" },
    ],
  },
  {
    apiMethod: "editChatSubscriptionInviteLink",
    annotations: ANNOTATIONS.modify,
    toolName: "edit_chat_subscription_invite_link",
    description: "Edit a subscription invite link.",
    category: "invite",
    needsChatId: true,
    canUploadFiles: false,
    returns: "ChatInviteLink",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
      { name: "invite_link", type: z.string(), required: true, description: "Invite link to edit" },
      { name: "name", type: z.string().max(32), required: false, description: "Link name" },
    ],
  },

  // ─── Star Subscriptions ───────────────────────────────────────────────
  {
    apiMethod: "editUserStarSubscription",
    annotations: ANNOTATIONS.modify,
    toolName: "edit_user_star_subscription",
    description: "Edit a user's Star subscription (cancel or extend).",
    category: "payments",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      { name: "telegram_payment_charge_id", type: z.string(), required: true, description: "Payment charge ID" },
      { name: "is_canceled", type: BooleanFlag, required: true, description: "Cancel the subscription" },
    ],
  },

  // ─── Business Connection ──────────────────────────────────────────────
  {
    apiMethod: "getBusinessConnection",
    annotations: ANNOTATIONS.readOnly,
    toolName: "get_business_connection",
    description: "Get information about a business connection.",
    category: "business",
    needsChatId: false,
    canUploadFiles: false,
    returns: "BusinessConnection",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
    ],
  },

  // ─── Verification ─────────────────────────────────────────────────────
  {
    apiMethod: "verifyUser",
    annotations: ANNOTATIONS.modify,
    toolName: "verify_user",
    description: "Verify a user on behalf of the bot's organization.",
    category: "other",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID to verify" },
      { name: "custom_description", type: z.string().max(70), required: false, description: "Custom description (0-70 chars)" },
    ],
  },
  {
    apiMethod: "removeUserVerification",
    annotations: ANNOTATIONS.modify,
    toolName: "remove_user_verification",
    description: "Remove user verification.",
    category: "other",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
    ],
  },
  {
    apiMethod: "verifyChat",
    annotations: ANNOTATIONS.modify,
    toolName: "verify_chat",
    description: "Verify a chat on behalf of the bot's organization.",
    category: "other",
    needsChatId: true,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
      { name: "custom_description", type: z.string().max(70), required: false, description: "Custom description (0-70 chars)" },
    ],
  },
  {
    apiMethod: "removeChatVerification",
    annotations: ANNOTATIONS.modify,
    toolName: "remove_chat_verification",
    description: "Remove chat verification.",
    category: "other",
    needsChatId: true,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
    ],
  },

  // ─── Sticker extras ───────────────────────────────────────────────────
  {
    apiMethod: "setStickerKeywords",
    annotations: ANNOTATIONS.modify,
    toolName: "set_sticker_keywords",
    description: "Change search keywords for a sticker.",
    category: "stickers",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "sticker", type: z.string(), required: true, description: "Sticker file_id" },
      { name: "keywords", type: z.array(z.string()), required: false, description: "Search keywords" },
    ],
  },
  {
    apiMethod: "setStickerMaskPosition",
    annotations: ANNOTATIONS.modify,
    toolName: "set_sticker_mask_position",
    description: "Change the mask position of a mask sticker.",
    category: "stickers",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "sticker", type: z.string(), required: true, description: "Sticker file_id" },
      { name: "mask_position", type: z.any(), required: false, description: "MaskPosition object" },
    ],
  },

  // ─── User Emoji Status ────────────────────────────────────────────────
  {
    apiMethod: "setUserEmojiStatus",
    annotations: ANNOTATIONS.modify,
    toolName: "set_user_emoji_status",
    description: "Set a custom emoji status for a user (requires bot to have appropriate rights).",
    category: "other",
    needsChatId: false,
    canUploadFiles: false,
    returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      { name: "emoji_status_custom_emoji_id", type: z.string(), required: false, description: "Custom emoji ID for status" },
      { name: "emoji_status_expiration_date", type: z.number().int(), required: false, description: "Expiration Unix timestamp" },
    ],
  },

  // ─── Prepared Inline Message ──────────────────────────────────────────
  {
    apiMethod: "savePreparedInlineMessage",
    annotations: ANNOTATIONS.modify,
    toolName: "save_prepared_inline_message",
    description: "Save a prepared inline message result for a user to send via inline button.",
    category: "inline",
    needsChatId: false,
    canUploadFiles: false,
    returns: "PreparedInlineMessage",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      { name: "result", type: z.any(), required: true, description: "InlineQueryResult object" },
      { name: "allow_user_chats", type: BooleanFlag, required: false, description: "Allow in user chats" },
      { name: "allow_bot_chats", type: BooleanFlag, required: false, description: "Allow in bot chats" },
      { name: "allow_group_chats", type: BooleanFlag, required: false, description: "Allow in group chats" },
      { name: "allow_channel_chats", type: BooleanFlag, required: false, description: "Allow in channel chats" },
    ],
  },
];
