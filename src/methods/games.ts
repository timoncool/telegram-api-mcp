import { z } from "zod";
import { MethodDef, BooleanFlag, commonSendParams ,  ANNOTATIONS } from "../method-registry.js";

export const gameMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.send,
    apiMethod: "sendGame", toolName: "send_game",
    description: "Send a game.", category: "games",
    needsChatId: true, canUploadFiles: false, returns: "Message",
    params: [
      { name: "chat_id", type: z.number().int(), required: true, description: "Target chat ID (integer only)" },
      { name: "game_short_name", type: z.string(), required: true, description: "Short name of the game" },
      ...commonSendParams(),
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "setGameScore", toolName: "set_game_score",
    description: "Set the score of a user in a game.", category: "games",
    needsChatId: false, canUploadFiles: false, returns: "Message or true",
    params: [
      { name: "user_id", type: z.number().int(), required: true, description: "User ID" },
      { name: "score", type: z.number().int().min(0), required: true, description: "New score (non-negative)" },
      { name: "force", type: BooleanFlag, required: false, description: "Set even if new score < old" },
      { name: "disable_edit_message", type: BooleanFlag, required: false, description: "Don't edit the game message" },
      { name: "chat_id", type: z.number().int(), required: false, description: "Chat ID" },
      { name: "message_id", type: z.number().int(), required: false, description: "Message ID" },
      { name: "inline_message_id", type: z.string(), required: false, description: "Inline message ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.readOnly,
    apiMethod: "getGameHighScores", toolName: "get_game_high_scores",
    description: "Get high scores for a game.", category: "games",
    needsChatId: false, canUploadFiles: false, returns: "Array of GameHighScore",
    params: [
      { name: "user_id", type: z.number().int(), required: true, description: "User ID" },
      { name: "chat_id", type: z.number().int(), required: false, description: "Chat ID" },
      { name: "message_id", type: z.number().int(), required: false, description: "Message ID" },
      { name: "inline_message_id", type: z.string(), required: false, description: "Inline message ID" },
    ],
  },
];
