import { z } from "zod";
import { MethodDef, ChatId, Caption, BooleanFlag, SuggestedPostParameters ,  ANNOTATIONS } from "../method-registry.js";

/** Both forward* and copy* target a chat the same way. */
function target() {
  return [
    { name: "chat_id", type: ChatId, required: true, description: "Target chat ID" },
    { name: "from_chat_id", type: ChatId, required: true, description: "Source chat ID" },
    { name: "message_thread_id", type: z.number().int(), required: false, description: "Forum topic thread ID" },
    { name: "direct_messages_topic_id", type: z.number().int(), required: false, description: "Direct messages topic ID; required when sending to a direct messages chat" },
  ];
}

export const forwardingMethods: MethodDef[] = [
  {
    apiMethod: "forwardMessage",
    annotations: ANNOTATIONS.send,
    toolName: "forward_message",
    description: "Forward a message from one chat to another.",
    category: "forwarding",
    needsChatId: true,
    canUploadFiles: false,
    returns: "Message",
    params: [
      ...target(),
      { name: "message_id", type: z.number().int(), required: true, description: "Message ID to forward" },
      { name: "video_start_timestamp", type: z.number().int(), required: false, description: "New start timestamp for the forwarded video" },
      { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
      { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding" },
      { name: "message_effect_id", type: z.string(), required: false, description: "Message effect ID; private chats only" },
      { name: "suggested_post_parameters", type: SuggestedPostParameters, required: false, description: "Suggested post parameters; direct messages chats only" },
    ],
  },
  {
    apiMethod: "forwardMessages",
    annotations: ANNOTATIONS.send,
    toolName: "forward_messages",
    description: "Forward multiple messages at once (maintains album grouping).",
    category: "forwarding",
    needsChatId: true,
    canUploadFiles: false,
    returns: "Array of MessageId",
    params: [
      ...target(),
      { name: "message_ids", type: z.array(z.number().int()), required: true, description: "Message IDs to forward" },
      { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
      { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding" },
    ],
  },
  {
    apiMethod: "copyMessage",
    annotations: ANNOTATIONS.send,
    toolName: "copy_message",
    description: "Copy a message (sends without 'Forwarded from' header). Can change caption.",
    category: "forwarding",
    needsChatId: true,
    canUploadFiles: false,
    returns: "MessageId",
    params: [
      ...target(),
      { name: "message_id", type: z.number().int(), required: true, description: "Message ID to copy" },
      { name: "video_start_timestamp", type: z.number().int(), required: false, description: "New start timestamp for the copied video" },
      { name: "caption", type: Caption, required: false, description: "New caption (0-1024 visible chars)" },
      { name: "parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Caption formatting" },
      { name: "caption_entities", type: z.any(), required: false, description: "Caption entities" },
      { name: "show_caption_above_media", type: BooleanFlag, required: false, description: "Show caption above media" },
      { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
      { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding" },
      { name: "allow_paid_broadcast", type: BooleanFlag, required: false, description: "Allow paid broadcast (up to 1000 msg/s for 0.1 Stars each)" },
      { name: "message_effect_id", type: z.string(), required: false, description: "Message effect ID; private chats only" },
      { name: "suggested_post_parameters", type: SuggestedPostParameters, required: false, description: "Suggested post parameters; direct messages chats only" },
      { name: "reply_parameters", type: z.any(), required: false, description: "Reply settings" },
      { name: "reply_markup", type: z.any(), required: false, description: "Keyboard markup" },
    ],
  },
  {
    apiMethod: "copyMessages",
    annotations: ANNOTATIONS.send,
    toolName: "copy_messages",
    description: "Copy multiple messages at once.",
    category: "forwarding",
    needsChatId: true,
    canUploadFiles: false,
    returns: "Array of MessageId",
    params: [
      ...target(),
      { name: "message_ids", type: z.array(z.number().int()), required: true, description: "Message IDs to copy" },
      { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
      { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding" },
      { name: "remove_caption", type: BooleanFlag, required: false, description: "Remove captions" },
    ],
  },
];
