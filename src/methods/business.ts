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
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "removeBusinessAccountProfilePhoto", toolName: "remove_business_account_profile_photo",
    description: "Remove a business account profile photo.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "photo_id", type: z.string(), required: false, description: "Photo ID to remove" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setBusinessAccountGiftSettings", toolName: "set_business_account_gift_settings",
    description: "Configure gift settings for a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "show_gift_button", type: BooleanFlag, required: false, description: "Show gift button" },
      { name: "accepted_gift_types", type: z.any(), required: false, description: "AcceptedGiftTypes object" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getBusinessAccountGifts", toolName: "get_business_account_gifts",
    description: "Get gifts received by a business account.", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "BusinessAccountGifts",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "exclude_from_blockchain", type: BooleanFlag, required: false, description: "Exclude blockchain gifts" },
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
    description: "Approve a suggested post for a channel (v9.2).", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "message_id", type: z.number().int(), required: true, description: "Suggested post message ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "declineSuggestedPost", toolName: "decline_suggested_post",
    description: "Decline a suggested post for a channel (v9.2).", category: "business",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "message_id", type: z.number().int(), required: true, description: "Suggested post message ID" },
    ],
  },
];
