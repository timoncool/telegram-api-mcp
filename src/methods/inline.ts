import { z } from "zod";
import { MethodDef, BooleanFlag } from "../method-registry.js";

export const inlineMethods: MethodDef[] = [
  {
    apiMethod: "answerInlineQuery", toolName: "answer_inline_query",
    description: "Send answers to an inline query. Max 50 results per query.", category: "inline",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "inline_query_id", type: z.string(), required: true, description: "Inline query ID" },
      { name: "results", type: z.any(), required: true, description: "Array of InlineQueryResult (max 50)" },
      { name: "cache_time", type: z.number().int(), required: false, description: "Cache time in seconds (default: 300)" },
      { name: "is_personal", type: BooleanFlag, required: false, description: "Results personal to user" },
      { name: "next_offset", type: z.string(), required: false, description: "Offset for pagination" },
      { name: "button", type: z.any(), required: false, description: "InlineQueryResultsButton" },
    ],
  },
  {
    apiMethod: "answerCallbackQuery", toolName: "answer_callback_query",
    description: "Answer a callback query from an inline keyboard button.", category: "inline",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "callback_query_id", type: z.string(), required: true, description: "Callback query ID" },
      { name: "text", type: z.string(), required: false, description: "Notification text" },
      { name: "show_alert", type: BooleanFlag, required: false, description: "Show alert instead of notification" },
      { name: "url", type: z.string(), required: false, description: "URL to open" },
      { name: "cache_time", type: z.number().int(), required: false, description: "Cache time in seconds" },
    ],
  },
];
