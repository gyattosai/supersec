import { AnnouncementPreview } from "../client/src/components/AnnouncementPreview";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("rich-text Q&A rendering", () => {
  it("renders supported markdown-like formatting while escaping raw markup", () => {
    const markup = renderToStaticMarkup(createElement(AnnouncementPreview, {
      body: "## Before class\n- **Bring your ID**\n[Open the guide](https://example.edu/guide)\n<script>unsafe()</script>",
    }));

    expect(markup).toContain("<h2");
    expect(markup).toContain("<strong>Bring your ID</strong>");
    expect(markup).toContain('href="https://example.edu/guide"');
    expect(markup).toContain("&lt;script&gt;unsafe()&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
  });
});
