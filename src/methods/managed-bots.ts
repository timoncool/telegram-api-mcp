import { z } from "zod";
import { MethodDef, UserId ,  ANNOTATIONS } from "../method-registry.js";

export const managedBotMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getManagedBotToken", toolName: "get_managed_bot_token",
    description: "Get the token of a managed bot (v9.6).", category: "managed_bots",
    needsChatId: false, canUploadFiles: false, returns: "ManagedBotToken",
    params: [
      { name: "user_id", type: UserId, required: true, description: "Managed bot user ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "replaceManagedBotToken", toolName: "replace_managed_bot_token",
    description: "Replace the token of a managed bot (v9.6).", category: "managed_bots",
    needsChatId: false, canUploadFiles: false, returns: "ManagedBotToken",
    params: [
      { name: "user_id", type: UserId, required: true, description: "Managed bot user ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "savePreparedKeyboardButton", toolName: "save_prepared_keyboard_button",
    description: "Save a prepared keyboard button for later use (v9.6).", category: "managed_bots",
    needsChatId: false, canUploadFiles: false, returns: "PreparedKeyboardButton",
    params: [
      { name: "user_id", type: UserId, required: true, description: "User ID" },
      { name: "button", type: z.any(), required: true, description: "PreparedKeyboardButton object" },
    ],
  },
];
