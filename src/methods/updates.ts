import { z } from "zod";
import { MethodDef, BooleanFlag ,  ANNOTATIONS } from "../method-registry.js";

export const updateMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getUpdates", toolName: "get_updates",
    description: "Receive incoming updates via long polling.", category: "updates",
    needsChatId: false, canUploadFiles: false, returns: "Array of Update",
    params: [
      { name: "offset", type: z.number().int(), required: false, description: "First update ID to return" },
      { name: "limit", type: z.number().int().min(1).max(100), required: false, description: "Max updates (1-100, default: 100)" },
      { name: "timeout", type: z.number().int(), required: false, description: "Long polling timeout in seconds" },
      { name: "allowed_updates", type: z.array(z.string()), required: false, description: "Update types to receive" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setWebhook", toolName: "set_webhook",
    description: "Set a webhook URL for receiving updates.", category: "updates",
    needsChatId: false, canUploadFiles: true, returns: "true",
    params: [
      { name: "url", type: z.string(), required: true, description: "HTTPS URL for webhook" },
      { name: "certificate", type: z.string(), required: false, description: "Public key certificate file" },
      { name: "ip_address", type: z.string(), required: false, description: "Fixed IP for webhook" },
      { name: "max_connections", type: z.number().int().min(1).max(100), required: false, description: "Max simultaneous connections (1-100)" },
      { name: "allowed_updates", type: z.array(z.string()), required: false, description: "Update types to receive" },
      { name: "drop_pending_updates", type: BooleanFlag, required: false, description: "Drop pending updates" },
      { name: "secret_token", type: z.string().max(256), required: false, description: "Secret token for verification (1-256 chars)" },
    ],
  },
  {
    annotations: ANNOTATIONS.destructive,
    apiMethod: "deleteWebhook", toolName: "delete_webhook",
    description: "Remove webhook integration and switch back to getUpdates.", category: "updates",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "drop_pending_updates", type: BooleanFlag, required: false, description: "Drop pending updates" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getWebhookInfo", toolName: "get_webhook_info",
    description: "Get current webhook status.", category: "updates",
    needsChatId: false, canUploadFiles: false, returns: "WebhookInfo",
    params: [],
  },
];
