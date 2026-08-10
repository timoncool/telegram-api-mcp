import { z } from "zod";
import { MethodDef, ChatId, UserId, BooleanFlag, ANNOTATIONS } from "../method-registry.js";

/**
 * Filters shared by the gift listing methods. `savedOnly` is off for getUserGifts,
 * which has no saved/unsaved distinction.
 */
function giftFilters(opts: { saved?: boolean } = {}): MethodDef["params"] {
  const filters: MethodDef["params"] = [];
  if (opts.saved) {
    filters.push(
      { name: "exclude_unsaved", type: BooleanFlag, required: false, description: "Exclude gifts not saved to the profile page" },
      { name: "exclude_saved", type: BooleanFlag, required: false, description: "Exclude gifts saved to the profile page" },
    );
  }
  filters.push(
    { name: "exclude_unlimited", type: BooleanFlag, required: false, description: "Exclude gifts that can be purchased unlimited times" },
    { name: "exclude_limited_upgradable", type: BooleanFlag, required: false, description: "Exclude limited upgradable gifts" },
    { name: "exclude_limited_non_upgradable", type: BooleanFlag, required: false, description: "Exclude limited non-upgradable gifts" },
    { name: "exclude_from_blockchain", type: BooleanFlag, required: false, description: "Exclude gifts hosted on the blockchain" },
    { name: "exclude_unique", type: BooleanFlag, required: false, description: "Exclude unique gifts" },
    { name: "sort_by_price", type: BooleanFlag, required: false, description: "Sort by price instead of send date" },
    { name: "offset", type: z.string(), required: false, description: "Offset returned by a previous call; empty for the first page" },
    { name: "limit", type: z.number().int().min(1).max(100), required: false, description: "Max gifts to return (1-100, default 100)" },
  );
  return filters;
}

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
    description: "Send a gift to a user or channel chat.", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "user_id", type: UserId, required: false, description: "Recipient user ID (required if chat_id not set)" },
      { name: "chat_id", type: ChatId, required: false, description: "Target chat ID (required if user_id not set, v8.3)" },
      { name: "gift_id", type: z.string(), required: true, description: "Gift ID" },
      { name: "text", type: z.string().max(255), required: false, description: "Gift message (0-255 chars)" },
      { name: "text_parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Text formatting" },
      { name: "text_entities", type: z.any(), required: false, description: "Text entities" },
      { name: "pay_for_upgrade", type: z.boolean(), required: false, description: "Pay to upgrade the gift (v8.2)" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getUserGifts", toolName: "get_user_gifts",
    description: "Get the gifts owned and hosted by a user (v9.3).", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "OwnedGifts",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      ...giftFilters(),
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getChatGifts", toolName: "get_chat_gifts",
    description: "Get the gifts owned and hosted by a chat (v9.3).", category: "gifts",
    needsChatId: true, canUploadFiles: false, returns: "OwnedGifts",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
      ...giftFilters({ saved: true }),
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
    description: "Upgrade a regular gift to a unique gift. Requires the can_transfer_and_upgrade_gifts business bot right.", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "owned_gift_id", type: z.string(), required: true, description: "Owned gift ID" },
      { name: "keep_original_details", type: BooleanFlag, required: false, description: "Keep the original gift text, sender and receiver" },
      { name: "star_count", type: z.number().int(), required: false, description: "Stars to pay for the upgrade if it isn't free" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "transferGift", toolName: "transfer_gift",
    description: "Transfer an owned unique gift to another user. Requires the can_transfer_and_upgrade_gifts business bot right.", category: "gifts",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "owned_gift_id", type: z.string(), required: true, description: "Owned gift ID" },
      { name: "new_owner_chat_id", type: z.number().int(), required: true, description: "New owner chat ID" },
      { name: "star_count", type: z.number().int(), required: false, description: "Stars to pay for the transfer if it isn't free" },
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
      { name: "text", type: z.string().max(128), required: false, description: "Text shown with the gift (0-128 chars)" },
      { name: "text_parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Text formatting" },
      { name: "text_entities", type: z.any(), required: false, description: "Text entities" },
    ],
  },
];
