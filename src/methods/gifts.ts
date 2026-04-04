import { z } from "zod";
import { MethodDef, ChatId, UserId ,  ANNOTATIONS } from "../method-registry.js";

export const giftMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getAvailableGifts", toolName: "get_available_gifts",
    description: "Get the list of gifts that can be sent.", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "Gifts",
    params: [],
  },
  {
    annotations: ANNOTATIONS.send,
    apiMethod: "sendGift", toolName: "send_gift",
    description: "Send a gift to a user.", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "Recipient user ID" },
      { name: "gift_id", type: z.string(), required: true, description: "Gift ID" },
      { name: "text", type: z.string().max(255), required: false, description: "Gift message (0-255 chars)" },
      { name: "text_parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Text formatting" },
      { name: "text_entities", type: z.any(), required: false, description: "Text entities" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getUserGifts", toolName: "get_user_gifts",
    description: "Get gifts received by a user (v9.3).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "UserGifts",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getChatGifts", toolName: "get_chat_gifts",
    description: "Get gifts received by a chat (v9.3).", category: "gifts",
    needsChatId: true, canUploadFiles: false, returns: "ChatGifts",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "convertGiftToStars", toolName: "convert_gift_to_stars",
    description: "Convert a gift to Telegram Stars (v9.0).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "owned_gift_id", type: z.string(), required: true, description: "Owned gift ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "upgradeGift", toolName: "upgrade_gift",
    description: "Upgrade a gift to a unique gift (v9.0).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "owned_gift_id", type: z.string(), required: true, description: "Owned gift ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "transferGift", toolName: "transfer_gift",
    description: "Transfer a gift to another user (v9.0).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "owned_gift_id", type: z.string(), required: true, description: "Owned gift ID" },
      { name: "new_owner_chat_id", type: z.number().int(), required: true, description: "New owner chat ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.send,
    apiMethod: "giftPremiumSubscription", toolName: "gift_premium_subscription",
    description: "Gift a Telegram Premium subscription (v9.0).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "user_id", type: UserId, required: true, description: "Recipient user ID" },
      { name: "month_count", type: z.number().int(), required: true, description: "Months of premium" },
      { name: "star_count", type: z.number().int(), required: true, description: "Stars to pay" },
    ],
  },
];
