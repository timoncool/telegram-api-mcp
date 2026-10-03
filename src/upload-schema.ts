// Generated from the official Bot API by scripts/refresh-docs.mjs. Do not edit.
export const uploadSchema = {
  "methods": {
    "setWebhook": {
      "certificate": "file"
    },
    "sendPhoto": {
      "photo": "file"
    },
    "sendLivePhoto": {
      "live_photo": "file",
      "photo": "file"
    },
    "sendAudio": {
      "audio": "file",
      "thumbnail": "file"
    },
    "sendDocument": {
      "document": "file",
      "thumbnail": "file"
    },
    "sendVideo": {
      "video": "file",
      "thumbnail": "file",
      "cover": "file"
    },
    "sendAnimation": {
      "animation": "file",
      "thumbnail": "file"
    },
    "sendVoice": {
      "voice": "file"
    },
    "sendVideoNote": {
      "video_note": "file",
      "thumbnail": "file"
    },
    "sendPaidMedia": {
      "media": "Array of InputPaidMedia"
    },
    "sendMediaGroup": {
      "media": "Array of InputMediaAudio, InputMediaDocument, InputMediaLivePhoto, InputMediaPhoto and InputMediaVideo"
    },
    "sendPoll": {
      "options": "Array of InputPollOption",
      "explanation_media": "InputPollMedia",
      "media": "InputPollMedia"
    },
    "setChatPhoto": {
      "photo": "file"
    },
    "answerGuestQuery": {
      "result": "InlineQueryResult"
    },
    "setMyProfilePhoto": {
      "photo": "InputProfilePhoto"
    },
    "setBusinessAccountProfilePhoto": {
      "photo": "InputProfilePhoto"
    },
    "postStory": {
      "content": "InputStoryContent"
    },
    "editStory": {
      "content": "InputStoryContent"
    },
    "answerWebAppQuery": {
      "result": "InlineQueryResult"
    },
    "savePreparedInlineMessage": {
      "result": "InlineQueryResult"
    },
    "editMessageText": {
      "rich_message": "InputRichMessage"
    },
    "editMessageMedia": {
      "media": "InputMedia"
    },
    "editEphemeralMessageText": {
      "rich_message": "InputRichMessage"
    },
    "editEphemeralMessageMedia": {
      "media": "InputMedia"
    },
    "sendSticker": {
      "sticker": "file"
    },
    "uploadStickerFile": {
      "sticker": "file"
    },
    "createNewStickerSet": {
      "stickers": "Array of InputSticker"
    },
    "addStickerToSet": {
      "sticker": "InputSticker"
    },
    "replaceStickerInSet": {
      "sticker": "InputSticker"
    },
    "setStickerSetThumbnail": {
      "thumbnail": "file"
    },
    "sendRichMessage": {
      "rich_message": "InputRichMessage"
    },
    "sendRichMessageDraft": {
      "rich_message": "InputRichMessage"
    },
    "answerInlineQuery": {
      "results": "Array of InlineQueryResult"
    }
  },
  "types": {
    "InlineQueryResult": {
      "fields": {},
      "variants": [
        "InlineQueryResultCachedAudio",
        "InlineQueryResultCachedDocument",
        "InlineQueryResultCachedGif",
        "InlineQueryResultCachedMpeg4Gif",
        "InlineQueryResultCachedPhoto",
        "InlineQueryResultCachedSticker",
        "InlineQueryResultCachedVideo",
        "InlineQueryResultCachedVoice",
        "InlineQueryResultArticle",
        "InlineQueryResultAudio",
        "InlineQueryResultContact",
        "InlineQueryResultDocument",
        "InlineQueryResultGif",
        "InlineQueryResultLocation",
        "InlineQueryResultMpeg4Gif",
        "InlineQueryResultPhoto",
        "InlineQueryResultVenue",
        "InlineQueryResultVideo",
        "InlineQueryResultVoice"
      ]
    },
    "InlineQueryResultArticle": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultAudio": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedAudio": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedDocument": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedGif": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedMpeg4Gif": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedPhoto": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedSticker": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedVideo": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultCachedVoice": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultContact": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultDocument": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultGif": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultLocation": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultMpeg4Gif": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultPhoto": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultVenue": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultVideo": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InlineQueryResultVoice": {
      "fields": {
        "input_message_content": "InputMessageContent"
      },
      "variants": []
    },
    "InputMedia": {
      "fields": {},
      "variants": [
        "InputMediaAnimation",
        "InputMediaAudio",
        "InputMediaDocument",
        "InputMediaLivePhoto",
        "InputMediaPhoto",
        "InputMediaVideo"
      ]
    },
    "InputMediaAnimation": {
      "fields": {
        "media": "file",
        "thumbnail": "file"
      },
      "variants": []
    },
    "InputMediaAudio": {
      "fields": {
        "media": "file",
        "thumbnail": "file"
      },
      "variants": []
    },
    "InputMediaDocument": {
      "fields": {
        "media": "file",
        "thumbnail": "file"
      },
      "variants": []
    },
    "InputMediaLivePhoto": {
      "fields": {
        "media": "file",
        "photo": "file"
      },
      "variants": []
    },
    "InputMediaPhoto": {
      "fields": {
        "media": "file"
      },
      "variants": []
    },
    "InputMediaSticker": {
      "fields": {
        "media": "file"
      },
      "variants": []
    },
    "InputMediaVideo": {
      "fields": {
        "media": "file",
        "thumbnail": "file",
        "cover": "file"
      },
      "variants": []
    },
    "InputMediaVoiceNote": {
      "fields": {
        "media": "file"
      },
      "variants": []
    },
    "InputMessageContent": {
      "fields": {},
      "variants": [
        "InputRichMessageContent"
      ]
    },
    "InputPaidMedia": {
      "fields": {},
      "variants": [
        "InputPaidMediaLivePhoto",
        "InputPaidMediaPhoto",
        "InputPaidMediaVideo"
      ]
    },
    "InputPaidMediaLivePhoto": {
      "fields": {
        "media": "file",
        "photo": "file"
      },
      "variants": []
    },
    "InputPaidMediaPhoto": {
      "fields": {
        "media": "file"
      },
      "variants": []
    },
    "InputPaidMediaVideo": {
      "fields": {
        "media": "file",
        "thumbnail": "file",
        "cover": "file"
      },
      "variants": []
    },
    "InputPollMedia": {
      "fields": {},
      "variants": [
        "InputMediaAnimation",
        "InputMediaAudio",
        "InputMediaDocument",
        "InputMediaLivePhoto",
        "InputMediaPhoto",
        "InputMediaVideo"
      ]
    },
    "InputPollOption": {
      "fields": {
        "media": "InputPollOptionMedia"
      },
      "variants": []
    },
    "InputPollOptionMedia": {
      "fields": {},
      "variants": [
        "InputMediaAnimation",
        "InputMediaLivePhoto",
        "InputMediaPhoto",
        "InputMediaSticker",
        "InputMediaVideo"
      ]
    },
    "InputProfilePhoto": {
      "fields": {},
      "variants": [
        "InputProfilePhotoStatic",
        "InputProfilePhotoAnimated"
      ]
    },
    "InputProfilePhotoAnimated": {
      "fields": {
        "animation": "file"
      },
      "variants": []
    },
    "InputProfilePhotoStatic": {
      "fields": {
        "photo": "file"
      },
      "variants": []
    },
    "InputRichBlock": {
      "fields": {},
      "variants": [
        "InputRichBlockList",
        "InputRichBlockBlockQuotation",
        "InputRichBlockCollage",
        "InputRichBlockSlideshow",
        "InputRichBlockDetails",
        "InputRichBlockAnimation",
        "InputRichBlockAudio",
        "InputRichBlockDocument",
        "InputRichBlockPhoto",
        "InputRichBlockVideo",
        "InputRichBlockVoiceNote"
      ]
    },
    "InputRichBlockAnimation": {
      "fields": {
        "animation": "InputMediaAnimation"
      },
      "variants": []
    },
    "InputRichBlockAudio": {
      "fields": {
        "audio": "InputMediaAudio"
      },
      "variants": []
    },
    "InputRichBlockBlockQuotation": {
      "fields": {
        "blocks": "Array of InputRichBlock"
      },
      "variants": []
    },
    "InputRichBlockCollage": {
      "fields": {
        "blocks": "Array of InputRichBlock"
      },
      "variants": []
    },
    "InputRichBlockDetails": {
      "fields": {
        "blocks": "Array of InputRichBlock"
      },
      "variants": []
    },
    "InputRichBlockDocument": {
      "fields": {
        "document": "InputMediaDocument"
      },
      "variants": []
    },
    "InputRichBlockList": {
      "fields": {
        "items": "Array of InputRichBlockListItem"
      },
      "variants": []
    },
    "InputRichBlockListItem": {
      "fields": {
        "blocks": "Array of InputRichBlock"
      },
      "variants": []
    },
    "InputRichBlockPhoto": {
      "fields": {
        "photo": "InputMediaPhoto"
      },
      "variants": []
    },
    "InputRichBlockSlideshow": {
      "fields": {
        "blocks": "Array of InputRichBlock"
      },
      "variants": []
    },
    "InputRichBlockVideo": {
      "fields": {
        "video": "InputMediaVideo"
      },
      "variants": []
    },
    "InputRichBlockVoiceNote": {
      "fields": {
        "voice_note": "InputMediaVoiceNote"
      },
      "variants": []
    },
    "InputRichMessage": {
      "fields": {
        "blocks": "Array of InputRichBlock",
        "media": "Array of InputRichMessageMedia"
      },
      "variants": []
    },
    "InputRichMessageContent": {
      "fields": {
        "rich_message": "InputRichMessage"
      },
      "variants": []
    },
    "InputRichMessageMedia": {
      "fields": {
        "media": "InputMediaAnimation or InputMediaAudio or InputMediaDocument or InputMediaPhoto or InputMediaVideo or InputMediaVoiceNote"
      },
      "variants": []
    },
    "InputSticker": {
      "fields": {
        "sticker": "file"
      },
      "variants": []
    },
    "InputStoryContent": {
      "fields": {},
      "variants": [
        "InputStoryContentPhoto",
        "InputStoryContentVideo"
      ]
    },
    "InputStoryContentPhoto": {
      "fields": {
        "photo": "file"
      },
      "variants": []
    },
    "InputStoryContentVideo": {
      "fields": {
        "video": "file"
      },
      "variants": []
    }
  }
};
