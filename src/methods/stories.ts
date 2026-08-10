import { z } from "zod";
import { MethodDef ,  ANNOTATIONS } from "../method-registry.js";

export const storyMethods: MethodDef[] = [
  {
    annotations: ANNOTATIONS.send,
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
      { name: "post_to_chat_page", type: z.boolean(), required: false, description: "Post story to the chat page" },
    ],
  },
  {
    annotations: ANNOTATIONS.modify,
    apiMethod: "editStory", toolName: "edit_story",
    description: "Edit a posted story (v9.0).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "Story",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "story_id", type: z.number().int(), required: true, description: "Story ID" },
      { name: "content", type: z.any(), required: true, description: "New InputStoryContent" },
      { name: "caption", type: z.string(), required: false, description: "New caption" },
      { name: "parse_mode", type: z.enum(["HTML", "Markdown", "MarkdownV2"]), required: false, description: "Caption formatting" },
      { name: "caption_entities", type: z.any(), required: false, description: "Caption entities" },
      { name: "areas", type: z.any(), required: false, description: "Array of StoryArea" },
    ],
  },
  {
    annotations: ANNOTATIONS.destructive,
    apiMethod: "deleteStory", toolName: "delete_story",
    description: "Delete a story (v9.0).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "true",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "story_id", type: z.number().int(), required: true, description: "Story ID" },
    ],
  },
  {
    annotations: ANNOTATIONS.send,
    apiMethod: "repostStory", toolName: "repost_story",
    description: "Repost a story on behalf of a managed business account (v9.3).", category: "stories",
    needsChatId: false, canUploadFiles: false, returns: "Story",
    params: [
      { name: "business_connection_id", type: z.string(), required: true, description: "Business connection ID" },
      { name: "from_chat_id", type: z.number().int(), required: true, description: "Chat that posted the original story" },
      { name: "from_story_id", type: z.number().int(), required: true, description: "Original story ID" },
      { name: "active_period", type: z.number().int(), required: true, description: "Active period in seconds: 6*3600, 12*3600, 86400 or 2*86400" },
      { name: "post_to_chat_page", type: z.boolean(), required: false, description: "Keep the story on the chat page after it expires" },
      { name: "protect_content", type: z.boolean(), required: false, description: "Protect from forwarding and screenshotting" },
    ],
  },
];
