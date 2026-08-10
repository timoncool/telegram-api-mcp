import { z } from "zod";
import { MethodDef, ChatId, BooleanFlag ,  ANNOTATIONS } from "../method-registry.js";

export const businessMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "readBusinessMessage", toolName: "read_business_message",
    description: "Mark a business message as read.", category: "business",
    needsChatId: true, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "chat_id", type: ChatId, required: true, description: "Chat ID" },
      { name: "message_id", type: z.number().int(), required: true, description: "Message ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.destructive,
    apiMethod: "deleteBusinessMessages", toolName: "delete_business_messages",
    description: "Delete business messages.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "message_ids", type: z.array(z.number().int()), required: true, description: "Message IDs to delete" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountName", toolName: "set_business_account_name",
    description: "Set the name of a connected business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "first_name", type: z.string(), required: true, description: "First name" },
      { name: "last_name", type: z.string(), required: false, description: "Last name" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountUsername", toolName: "set_business_account_username",
    description: "Set the username of a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "username", type: z.string(), required: false, description: "Username (empty to remove)" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountBio", toolName: "set_business_account_bio",
    description: "Set the bio of a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "bio", type: z.string(), required: false, description: "Bio text" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountProfilePhoto", toolName: "set_business_account_profile_photo",
    description: "Set the profile photo of a business account.", category: "business",
    needsChatId: false, canUploadFiles: true, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "photo", type: z.any(), required: true, description: "InputProfilePhoto object" },
      { name: "is_public", type: BooleanFlag, required: false, description: "Set the public photo, visible even if the main photo is hidden" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "removeBusinessAccountProfilePhoto", toolName: "remove_business_account_profile_photo",
    description: "Remove a business account profile photo.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "is_public", type: BooleanFlag, required: false, description: "Remove the public photo instead of the main one" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountGiftSettings", toolName: "set_business_account_gift_settings",
    description: "Configure gift settings for a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "show_gift_button", type: BooleanFlag, required: true, description: "Show a gift button in the input field" },
      { name: "accepted_gift_types", type: z.any(), required: true, description: "AcceptedGiftTypes object" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getBusinessAccountGifts", toolName: "get_business_account_gifts",
    description: "Get gifts owned by a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "OwnedGifts",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "exclude_unsaved", type: BooleanFlag, required: false, description: "Exclude gifts not saved to the profile page" },
      { name: "exclude_saved", type: BooleanFlag, required: false, description: "Exclude gifts saved to the profile page" },
      { name: "exclude_unlimited", type: BooleanFlag, required: false, description: "Exclude gifts that can be purchased unlimited times" },
      { name: "exclude_limited_upgradable", type: BooleanFlag, required: false, description: "Exclude limited upgradable gifts" },
      { name: "exclude_limited_non_upgradable", type: BooleanFlag, required: false, description: "Exclude limited non-upgradable gifts" },
      { name: "exclude_unique", type: BooleanFlag, required: false, description: "Exclude unique gifts" },
      { name: "exclude_from_blockchain", type: BooleanFlag, required: false, description: "Exclude gifts hosted on the blockchain" },
      { name: "sort_by_price", type: BooleanFlag, required: false, description: "Sort by price instead of send date" },
      { name: "offset", type: z.string(), required: false, description: "Offset returned by a previous call; empty for the first page" },
      { name: "limit", type: z.number().int().min(1).max(100), required: false, description: "Max gifts to return (1-100, default 100)" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getBusinessAccountStarBalance", toolName: "get_business_account_star_balance",
    description: "Get the Telegram Stars balance of a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "StarAmount",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "transferBusinessAccountStars", toolName: "transfer_business_account_stars",
    description: "Transfer Telegram Stars from a business account to the bot.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "star_count", type: z.number().int().positive(), required: true, description: "Number of stars to transfer" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "approveSuggestedPost", toolName: "approve_suggested_post",
    description: "Approve a suggested post in a direct messages chat (v9.2).", category: "business",
    needsChatId: true, canUploadFiles: false, returns: "true",
    params: [
      { name: "chat_id", type: z.number().int(), required: true, description: "Direct messages chat ID" },
      { name: "message_id", type: z.number().int(), required: true, description: "Suggested post message ID" },
      { name: "send_date", type: z.number().int(), required: false, description: "Unix time to publish the post; within 2678400 seconds (30 days)" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "declineSuggestedPost", toolName: "decline_suggested_post",
    description: "Decline a suggested post in a direct messages chat (v9.2).", category: "business",
    needsChatId: true, canUploadFiles: false, returns: "true",
    params: [
      { name: "chat_id", type: z.number().int(), required: true, description: "Direct messages chat ID" },
      { name: "message_id", type: z.number().int(), required: true, description: "Suggested post message ID" },
      { name: "comment", type: z.string().max(128), required: false, description: "Comment for the creator of the suggested post (0-128 chars)" },
    ],
  },
];
