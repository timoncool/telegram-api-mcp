import { MethodDef } from "../method-registry.js";
import { messageMethods } from "./messages.js";
import { forwardingMethods } from "./forwarding.js";
import { editingMethods } from "./editing.js";
import { chatMethods } from "./chat.js";
import { botMethods } from "./bot.js";
import { forumMethods } from "./forum.js";
import { stickerMethods } from "./stickers.js";
import { paymentMethods } from "./payments.js";
import { businessMethods } from "./business.js";
import { storyMethods } from "./stories.js";
import { giftMethods } from "./gifts.js";
import { gameMethods } from "./games.js";
import { inlineMethods } from "./inline.js";
import { managedBotMethods } from "./managed-bots.js";
import { updateMethods } from "./updates.js";
import { passportMethods } from "./passport.js";
import { otherMethods } from "./other.js";

/**
 * Complete registry of ALL Telegram Bot API 9.6 methods.
 * Each method is defined declaratively �� no handler code, just data.
 */
export const allMethods: MethodDef[] = [
  ...messageMethods,
  ...forwardingMethods,
  ...editingMethods,
  ...chatMethods,
  ...botMethods,
  ...forumMethods,
  ...stickerMethods,
  ...paymentMethods,
  ...businessMethods,
  ...storyMethods,
  ...giftMethods,
  ...gameMethods,
  ...inlineMethods,
  ...managedBotMethods,
  ...updateMethods,
  ...passportMethods,
  ...otherMethods,
];

/** Lookup method by tool name */
export function findMethodByToolName(toolName: string): MethodDef | undefined {
  return allMethods.find((m) => m.toolName === toolName);
}

/** Lookup method by API method name */
export function findMethodByApiName(apiMethod: string): MethodDef | undefined {
  return allMethods.find((m) => m.apiMethod === apiMethod);
}

/** Search methods by keyword (for meta-mode) */
export function searchMethods(query: string): MethodDef[] {
  const q = query.toLowerCase();
  return allMethods.filter(
    (m) =>
      m.toolName.includes(q) ||
      m.apiMethod.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.includes(q)
  );
}
