import { z } from "zod";
import { MethodDef, ChatId } from "../method-registry.js";

export const storyMethods: MethodDef[] = [
  {
    apiMethod: "postStory", toolName: "post_story",
    description: "Post a story on behalf of a business account (v9.0).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "Story",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "content", type: z.any(), required: true, description: "InputStoryContent (photo or video)" },
      { name: "active_period", type: z.number().int(), required: true, description: "Story active period in seconds" },
      { name: "caption", type: z.string(), required: false, description: "Story caption" },
      { name: "parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Caption formatting" },
      { name: "caption_entities", type: z.any(), required: false, description: "Caption entities" },
      { name: "areas", type: z.any(), required: false, description: "Array of StoryArea" },
      { name: "protect_content", type: z.boolean(), required: false, description: "Protect from forwarding" },
    ],
  },
  {
    apiMethod: "editStory", toolName: "edit_story",
    description: "Edit a posted story (v9.0).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "Story",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "story_id", type: z.number().int(), required: true, description: "Story ID" },
      { name: "content", type: z.any(), required: false, description: "New InputStoryContent" },
      { name: "caption", type: z.string(), required: false, description: "New caption" },
      { name: "parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Caption formatting" },
      { name: "caption_entities", type: z.any(), required: false, description: "Caption entities" },
      { name: "areas", type: z.any(), required: false, description: "Array of StoryArea" },
    ],
  },
  {
    apiMethod: "deleteStory", toolName: "delete_story",
    description: "Delete a story (v9.0).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "story_id", type: z.number().int(), required: true, description: "Story ID" },
    ],
  },
  {
    apiMethod: "repostStory", toolName: "repost_story",
    description: "Repost a story to another chat (v9.3).", category: "stories",
    needsChatId: true, canUploadFiles: false, returns: "Story",
    params: [
      { name: "chat_id", type: ChatId, required: true, description: "Target chat ID" },
      { name: "story_sender_chat_id", type: z.number().int(), required: true, description: "Original story sender chat ID" },
      { name: "story_id", type: z.number().int(), required: true, description: "Story ID to repost" },
    ],
  },
];
