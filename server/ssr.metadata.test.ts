import { describe, expect, it } from "vitest";
import { messengerPostTitle } from "../client/src/ssr/prefetch";

describe("Messenger-ready post metadata", () => {
  it("includes the published post title and its current version", () => {
    expect(messengerPostTitle("Room change for Friday", 4)).toBe("Room change for Friday · Version 4 · supersec");
  });

  it("keeps both the title and version within the social-title boundary", () => {
    const title = messengerPostTitle("A very long class announcement title that would otherwise overflow the social preview title length", 12);
    expect(title).toContain("Version 12");
    expect(title).toContain("supersec");
    expect(title.length).toBeLessThanOrEqual(70);
  });
});
