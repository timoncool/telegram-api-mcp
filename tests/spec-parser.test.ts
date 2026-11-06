import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseBotApi, uploadSchemaSource } from "../scripts/bot-api-spec.mjs";

describe("Official documentation parser", () => {
  const html = readFileSync(new URL("../docs/raw-api.html", import.meta.url), "utf8");
  it("recognizes methods, no-parameter methods, nested types and unions", () => {
    const spec = parseBotApi(html);
    expect(spec.methods.getMe.params).toEqual([]);
    expect(spec.types.InputProfilePhoto.variants).toContain("InputProfilePhotoAnimated");
    expect(spec.types.InputRichBlock.variants).toContain("InputRichBlockDocument");
    expect(spec.methods.sendMessage.params.find((p) => p.name === "ephemeral_message_parameters").type)
      .toBe("EphemeralMessageParameters");
  });
  it("does not treat an error page or a partial page as an empty API", () => {
    expect(() => parseBotApi("<html>Try again later</html>")).toThrow();
  });
  it("keeps the checked-in upload graph synchronized with the official snapshot", () => {
    expect(uploadSchemaSource(parseBotApi(html)))
      .toBe(readFileSync(new URL("../src/upload-schema.ts", import.meta.url), "utf8"));
  });
});
