import { describe, it, expect } from "vitest";
import { FORMATS, findFormat, formatIndex } from "../src/formats.js";
import { RICH_MESSAGE_LIMITS } from "../src/method-registry.js";

describe("formats", () => {
  it("resolves every topic by its own name", () => {
    for (const doc of FORMATS) {
      expect(findFormat(doc.topic)?.topic, doc.topic).toBe(doc.topic);
    }
  });

  it("resolves the wording an agent actually uses", () => {
    const expectations: [string, string][] = [
      ["send_rich_message", "rich_message"],
      ["long post", "rich_message"],
      ["table", "rich_message"],
      ["длинный пост", "rich_message"],
      ["рич пост", "rich_message"],
      ["лонгрид", "rich_message"],
      ["album", "media"],
      ["альбом", "media"],
      ["send_media_group", "media"],
      ["buttons", "reply_markup"],
      ["кнопки", "reply_markup"],
      ["quiz", "poll"],
      ["опрос", "poll"],
      ["подпись", "caption"],
      ["send_photo", "caption"],
    ];
    for (const [query, topic] of expectations) {
      expect(findFormat(query)?.topic, query).toBe(topic);
    }
  });

  it("returns nothing for an unknown topic so the caller gets the index", () => {
    expect(findFormat("kubernetes")).toBeUndefined();
  });

  it("documents the rules that are easy to get wrong", () => {
    const rich = findFormat("rich_message")!;
    expect(rich.body).toContain("exactly one");
    expect(rich.body).toContain("HTTP(S) URL");
    expect(rich.body).toContain("<tg-collage>");
    expect(rich.body).toContain(String(RICH_MESSAGE_LIMITS.text));
    expect(rich.body).toContain(String(RICH_MESSAGE_LIMITS.media));

    // The caption doc must point at rich messages rather than suggest truncating.
    expect(findFormat("caption")!.body).toContain("send_rich_message");
    // Poll options are objects, the classic mistake.
    expect(findFormat("poll")!.body).toContain("correct_option_ids");
  });

  it("lists every format in the index", () => {
    const index = formatIndex();
    for (const doc of FORMATS) {
      expect(index).toContain(doc.topic);
    }
  });
});
