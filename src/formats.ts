import { RICH_MESSAGE_LIMITS } from "./method-registry.js";

/**
 * Structured parameters Telegram accepts only in one exact shape — rich messages,
 * InputMedia arrays, keyboards, poll options. The JSON Schema can say "object";
 * it cannot teach the syntax, so the server carries the reference itself and
 * hands it out through the `telegram_format` tool before anything is sent.
 */
export interface FormatDoc {
  /** Lookup key, also the name shown in listings */
  topic: string;
  /** Which tools/params this describes */
  applies: string;
  /** One-line summary */
  summary: string;
  /** Full reference, markdown */
  body: string;
}

const RICH_MESSAGE: FormatDoc = {
  topic: "rich_message",
  applies: "send_rich_message, send_rich_message_draft, edit_message_text (rich_message param)",
  summary: `Long-form post: up to ${RICH_MESSAGE_LIMITS.text} characters with headings, tables, lists and up to ${RICH_MESSAGE_LIMITS.media} images.`,
  body: `# rich_message (InputRichMessage)

Pass an OBJECT with **exactly one** of \`markdown\`, \`html\` or \`blocks\`. Anything else is rejected.

\`\`\`json
{
  "chat_id": "@mychannel",
  "rich_message": {
    "markdown": "# Heading\\n\\nParagraph with **bold**.\\n\\n![](https://host/pic.jpg \\"Caption\\")\\n\\n| A | B |\\n|:--|--:|\\n| 1 | 2 |"
  }
}
\`\`\`

Optional siblings: \`is_rtl\` (bool), \`skip_entity_detection\` (bool — turns off auto-linking of URLs, @mentions, #hashtags, phone numbers), \`media\` (array, only needed when markdown/html reference uploads via \`tg://photo?id=\`).

## Limits — validated before the request is sent
| Limit | Value |
|-------|------:|
| Text characters | ${RICH_MESSAGE_LIMITS.text} |
| Blocks (nested items, list items and table rows count) | ${RICH_MESSAGE_LIMITS.blocks} |
| Media attachments | ${RICH_MESSAGE_LIMITS.media} |
| Table columns | ${RICH_MESSAGE_LIMITS.tableColumns} |
| Nesting levels | ${RICH_MESSAGE_LIMITS.nesting} |

## Media — the rule people get wrong
Media lives in its **own block**, and the source must be an **HTTP(S) URL**. A \`file_id\` or a local
file path will NOT work inside markdown/html.

\`\`\`
![](https://host/photo.jpg "Photo caption")
![](https://host/video.mp4 "Video caption")
![](https://host/audio.mp3 "Audio caption")
![](https://host/animation.gif "Animation caption")
\`\`\`

Group several media without tying them to a paragraph:
\`\`\`
<tg-collage>

![](https://host/a.jpg)
![](https://host/b.jpg)

</tg-collage>
\`\`\`
\`<tg-slideshow>\` works the same way. To place a picture next to the text it illustrates, just put
its block right after that paragraph.

## Rich Markdown syntax
GitHub-flavored Markdown plus Telegram extensions. Inline:
\`\`\`
**bold** __bold__  *italic* _italic_  ~~strikethrough~~  ==marked==  ||spoiler||
\`inline code\`  $x^2 + y^2$  [link](https://t.me)  [mail](mailto:a@b.c)  [phone](tel:+123)
[user](tg://user?id=123456789)  ![](tg://emoji?id=5368324170671202286)
<u>underline</u> <ins>underline</ins> <sub>sub</sub> <sup>sup</sup>
\`\`\`
Blocks:
\`\`\`
# H1 … ###### H6          --- (divider)
- item  * item  + item    1. ordered
- [ ] task  - [x] done
> quote, continued on the next > line
\`\`\`python … \`\`\` (code block)
| Header | Header |
|:-------|-------:|
| left   |  right |
Text with a reference[^id]
[^id]: Footnote definition.
$$E = mc^2$$
\`\`\`
HTML-only features (no Markdown equivalent):
\`\`\`
<a name="chapter-1"></a>                       anchor
<aside>Pull quote<cite>The Author</cite></aside>
<details open><summary>Title</summary>…</details>
<tg-map lat="41.9" long="12.5" zoom="14"/>
<tg-collage> … </tg-collage>   <tg-slideshow> … </tg-slideshow>
<tg-thinking>…</tg-thinking>   (send_rich_message_draft only)
\`\`\`
Escape a literal \`#\` at the start of a line as \`\\#\`. Inside markdown you do NOT HTML-escape
\`&\`, \`<\`, \`>\` the way you must in a \`caption\`.

## Drafts
\`send_rich_message_draft\` streams a partial message as a temporary 30-second preview in a private
chat; it does not persist. Send the finished content with \`send_rich_message\` afterwards.`,
};

const CAPTION: FormatDoc = {
  topic: "caption",
  applies: "send_photo, send_video, send_audio, send_document, send_animation, send_voice, send_paid_media, send_live_photo, copy_message, edit_message_caption",
  summary: "Media caption: 1024 visible characters, HTML or Markdown. Use rich_message for anything longer.",
  body: `# caption

Telegram caps a media caption at **1024 characters counted after entity parsing** — HTML tags and the
URLs inside \`<a href="...">\` do not count, the visible text does. This server measures it the same way,
so rich HTML captions are not rejected for their markup.

With \`parse_mode: "HTML"\`:
\`\`\`
<b>bold</b> <i>italic</i> <u>underline</u> <s>strike</s> <code>mono</code>
<a href="https://t.me">link</a>  <pre language="python">block</pre>
<blockquote>quote</blockquote>  <tg-spoiler>spoiler</tg-spoiler>
\`\`\`
Escape \`&\` → \`&amp;\`, \`<\` → \`&lt;\`, \`>\` → \`&gt;\` in any text you did not write yourself.

**A post longer than 1024 characters does not belong in a caption.** Use \`send_rich_message\`
(${RICH_MESSAGE_LIMITS.text} characters, ${RICH_MESSAGE_LIMITS.media} images) — ask for the
\`rich_message\` format.`,
};

const MEDIA: FormatDoc = {
  topic: "media",
  applies: "send_media_group, edit_message_media, send_paid_media (media param)",
  summary: "Array of InputMedia objects; each needs a `type` and a `media` source.",
  body: `# media (InputMedia)

\`send_media_group\` takes an ARRAY of 2-10 items; \`edit_message_media\` takes a single object.

\`\`\`json
{
  "chat_id": "@mychannel",
  "media": [
    { "type": "photo", "media": "https://host/a.jpg", "caption": "Only the first caption shows", "parse_mode": "HTML" },
    { "type": "photo", "media": "C:\\\\path\\\\to\\\\local.jpg" },
    { "type": "video", "media": "AgACAgIAAx...file_id", "cover": "https://host/cover.jpg" }
  ]
}
\`\`\`

\`type\`: \`photo\` | \`video\` | \`audio\` | \`document\` | \`animation\`. An album may not mix photo/video
with audio or document.

Each \`media\` (and \`thumbnail\`, \`cover\`) accepts three sources, all handled for you:
- **file_id** — already on Telegram's servers, cheapest.
- **HTTP(S) URL** — this server downloads it and uploads the bytes, so the 5 MB photo / 20 MB
  other-file ceiling on Telegram's own URL fetching does not apply. Failures are reported with the
  HTTP status or the real file size, never silently swapped for something else.
- **Absolute local path** — uploaded as multipart and referenced as \`attach://\`.

Upload ceiling is 10 MB for photos and 50 MB for other files. Captions follow the \`caption\` rules.`,
};

const REPLY_MARKUP: FormatDoc = {
  topic: "reply_markup",
  applies: "every send_* and edit_message_* tool",
  summary: "Keyboards: inline_keyboard (buttons under the message) or keyboard (replaces the user's keyboard).",
  body: `# reply_markup

Inline keyboard — an array of ROWS, each row an array of buttons:
\`\`\`json
{
  "reply_markup": {
    "inline_keyboard": [
      [{ "text": "Open", "url": "https://example.com" }],
      [{ "text": "Yes", "callback_data": "yes" }, { "text": "No", "callback_data": "no" }]
    ]
  }
}
\`\`\`
A button carries exactly one action: \`url\`, \`callback_data\` (≤64 bytes), \`web_app\`, \`login_url\`,
\`switch_inline_query\`, \`switch_inline_query_current_chat\`, \`copy_text\`, \`pay\`.

Reply keyboard (custom keyboard for the user):
\`\`\`json
{ "reply_markup": { "keyboard": [[{ "text": "Menu" }]], "resize_keyboard": true, "one_time_keyboard": true } }
\`\`\`
Remove it with \`{ "remove_keyboard": true }\`, force a reply with \`{ "force_reply": true }\`.

Channels support inline keyboards only.`,
};

const POLL: FormatDoc = {
  topic: "poll",
  applies: "send_poll (options, media, explanation_media)",
  summary: "Options are objects, not strings; quizzes use correct_option_ids (an array).",
  body: `# send_poll

\`options\` is an array of OBJECTS (1-12), not plain strings:
\`\`\`json
{
  "chat_id": "@mychannel",
  "question": "Which model?",
  "options": [
    { "text": "Opus" },
    { "text": "Sonnet", "text_parse_mode": "HTML" }
  ],
  "type": "quiz",
  "correct_option_ids": [0]
}
\`\`\`
\`correct_option_ids\` is an ARRAY — the old singular \`correct_option_id\` is gone.

Question ≤300 chars, explanation ≤200 chars, options 1-12.
Extras: \`allows_revoting\`, \`shuffle_options\`, \`allow_adding_options\`, \`hide_results_until_closes\`,
\`is_closed\` (useful for previews), \`open_period\` (5-2628000 s) or \`close_date\`.
Channel-only: \`members_only\`, \`country_codes\` (0-12 ISO 3166-1 alpha-2 codes).
\`media\` and \`explanation_media\` take an InputPollMedia object to illustrate the poll or the answer.`,
};

const CHECKLIST: FormatDoc = {
  topic: "checklist",
  applies: "send_checklist, edit_message_checklist",
  summary: "Interactive checklist; requires a business connection.",
  body: `# checklist (InputChecklist)

\`\`\`json
{
  "business_connection_id": "…",
  "chat_id": 123,
  "checklist": {
    "title": "Release",
    "parse_mode": "HTML",
    "tasks": [
      { "id": 1, "text": "Write the changelog" },
      { "id": 2, "text": "Tag the build" }
    ],
    "others_can_add_tasks": false,
    "others_can_mark_tasks_as_done": true
  }
}
\`\`\`
Every task needs a unique \`id\`. \`business_connection_id\` is REQUIRED for both tools.`,
};

const REPLY_PARAMETERS: FormatDoc = {
  topic: "reply_parameters",
  applies: "every send_* tool",
  summary: "Reply to a message, optionally quoting part of it or replying across chats.",
  body: `# reply_parameters

\`\`\`json
{ "reply_parameters": { "message_id": 42 } }
\`\`\`
Fields: \`message_id\` (required unless \`ephemeral_message_id\` is used), \`chat_id\` (reply to a message
in a different chat), \`quote\` (0-1024 chars, must be an EXACT substring of the original after entity
parsing), \`quote_parse_mode\`, \`quote_position\`, \`allow_sending_without_reply\`,
\`checklist_task_id\`, \`ephemeral_message_id\`.`,
};

const LINK_PREVIEW: FormatDoc = {
  topic: "link_preview_options",
  applies: "send_message, edit_message_text",
  summary: "Control the link preview — disable it, enlarge it, or move it above the text.",
  body: `# link_preview_options

\`\`\`json
{ "link_preview_options": { "url": "https://example.com", "prefer_large_media": true, "show_above_text": true } }
\`\`\`
Fields: \`is_disabled\`, \`url\` (preview a link other than the first one in the text),
\`prefer_large_media\`, \`prefer_small_media\`, \`show_above_text\`.

This used to be the trick for "a big picture above a long text". \`send_rich_message\` does that
properly now, with real images instead of a scraped preview.`,
};

const SUGGESTED_POST: FormatDoc = {
  topic: "suggested_post_parameters",
  applies: "send_* tools posting into a direct messages chat",
  summary: "Propose a paid or scheduled post in a channel's direct messages chat.",
  body: `# suggested_post_parameters

\`\`\`json
{ "suggested_post_parameters": { "price": { "currency": "XTR", "amount": 100 }, "send_date": 1760000000 } }
\`\`\`
\`price\`: \`currency\` is \`XTR\` (Telegram Stars) or \`TON\`, with \`amount\` in the smallest unit.
\`send_date\` is a Unix timestamp within 2678400 seconds (30 days) of now.
Resolve an incoming suggestion with \`approve_suggested_post\` / \`decline_suggested_post\`.`,
};

export const FORMATS: FormatDoc[] = [
  RICH_MESSAGE,
  CAPTION,
  MEDIA,
  REPLY_MARKUP,
  POLL,
  CHECKLIST,
  REPLY_PARAMETERS,
  LINK_PREVIEW,
  SUGGESTED_POST,
];

/**
 * Aliases so a caller can ask by tool name, parameter name or plain wording.
 * Russian is included because agents ask in the language of the conversation.
 */
const ALIASES: Record<string, string> = {
  // ru
  длинный_пост: "rich_message",
  большой_пост: "rich_message",
  рич: "rich_message",
  рич_пост: "rich_message",
  рич_сообщение: "rich_message",
  пост: "rich_message",
  лонгрид: "rich_message",
  статья: "rich_message",
  таблица: "rich_message",
  разметка: "rich_message",
  подпись: "caption",
  подпись_к_картинке: "caption",
  медиа: "media",
  картинки: "media",
  альбом: "media",
  видео: "media",
  файл: "media",
  кнопки: "reply_markup",
  клавиатура: "reply_markup",
  опрос: "poll",
  голосование: "poll",
  чеклист: "checklist",
  ответ: "reply_parameters",
  цитата: "reply_parameters",
  превью: "link_preview_options",
  предложка: "suggested_post_parameters",
  // en
  rich: "rich_message",
  richmessage: "rich_message",
  sendrichmessage: "rich_message",
  send_rich_message: "rich_message",
  send_rich_message_draft: "rich_message",
  longpost: "rich_message",
  long_post: "rich_message",
  post: "rich_message",
  article: "rich_message",
  table: "rich_message",
  markdown: "rich_message",
  html: "rich_message",
  photo: "caption",
  send_photo: "caption",
  captions: "caption",
  album: "media",
  mediagroup: "media",
  send_media_group: "media",
  inputmedia: "media",
  video: "media",
  upload: "media",
  file: "media",
  keyboard: "reply_markup",
  button: "reply_markup",
  buttons: "reply_markup",
  inline_keyboard: "reply_markup",
  send_poll: "poll",
  options: "poll",
  quiz: "poll",
  send_checklist: "checklist",
  reply: "reply_parameters",
  quote: "reply_parameters",
  preview: "link_preview_options",
  link_preview: "link_preview_options",
  suggested_post: "suggested_post_parameters",
};

export function findFormat(query: string): FormatDoc | undefined {
  const key = query.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const topic = ALIASES[key] ?? ALIASES[key.replace(/_/g, "")] ?? key;
  return (
    FORMATS.find((f) => f.topic === topic) ??
    FORMATS.find((f) => f.topic.includes(topic) || f.applies.toLowerCase().includes(topic))
  );
}

/** Listing shown when no topic is given, or when the topic is not recognised. */
export function formatIndex(): string {
  return [
    "Formats this server can explain before you send anything — call telegram_format with one of these topics:",
    "",
    ...FORMATS.map((f) => `- **${f.topic}** — ${f.summary}\n  applies to: ${f.applies}`),
    "",
    "Posting something longer than a 1024-character caption? Ask for `rich_message`.",
  ].join("\n");
}
