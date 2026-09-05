import { describe, expect, it } from "vitest";
import {
  markdownToHtml,
  htmlToMarkdown,
  inlineMarkdownToHtml,
} from "../shared/richTextEngine";

describe("WYSIWYG Rich Text Engine", () => {
  it("converts inline formatting correctly", () => {
    const md = "This has **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `code`, and [link](https://example.com).";
    const html = inlineMarkdownToHtml(md);

    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underline</u>");
    expect(html).toContain("<del>strikethrough</del>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noreferrer">link</a>');
  });

  it("converts headings H1, H2, H3 to HTML and back to markdown", () => {
    const md = "# Title 1\n\n## Subtitle 2\n\n### Section 3";
    const html = markdownToHtml(md);

    expect(html).toContain("<h1>Title 1</h1>");
    expect(html).toContain("<h2>Subtitle 2</h2>");
    expect(html).toContain("<h3>Section 3</h3>");

    const backToMd = htmlToMarkdown(html);
    expect(backToMd).toContain("# Title 1");
    expect(backToMd).toContain("## Subtitle 2");
    expect(backToMd).toContain("### Section 3");
  });

  it("groups unordered and ordered lists into single list elements", () => {
    const ulMd = "- First item\n- Second item\n- Third item";
    const ulHtml = markdownToHtml(ulMd);

    // Ensure it's grouped into ONE <ul>, not three separate <ul> tags
    expect(ulHtml).toBe("<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>");

    const olMd = "1. Step one\n2. Step two\n3. Step three";
    const olHtml = markdownToHtml(olMd);
    expect(olHtml).toBe("<ol><li>Step one</li><li>Step two</li><li>Step three</li></ol>");

    const backToUl = htmlToMarkdown(ulHtml);
    expect(backToUl).toContain("- First item");
    expect(backToUl).toContain("- Second item");

    const backToOl = htmlToMarkdown(olHtml);
    expect(backToOl).toContain("1. Step one");
    expect(backToOl).toContain("2. Step two");
  });

  it("handles task checklists with checked/unchecked states", () => {
    const taskMd = "- [ ] Pending item\n- [x] Completed item";
    const taskHtml = markdownToHtml(taskMd);

    expect(taskHtml).toContain('data-task="false"');
    expect(taskHtml).toContain('data-task="true"');
    expect(taskHtml).toContain("checked");

    const backToMd = htmlToMarkdown(taskHtml);
    expect(backToMd).toContain("- [ ] Pending item");
    expect(backToMd).toContain("- [x] Completed item");
  });

  it("converts blockquotes and code blocks faithfully", () => {
    const quoteMd = "> Knowledge is power\n> Continuous improvement";
    const quoteHtml = markdownToHtml(quoteMd);
    expect(quoteHtml).toContain("<blockquote>");
    expect(quoteHtml).toContain("Knowledge is power");

    const codeMd = "```typescript\nconst x = 42;\nconsole.log(x);\n```";
    const codeHtml = markdownToHtml(codeMd);
    expect(codeHtml).toContain('<pre><code class="language-typescript">const x = 42;\nconsole.log(x);</code></pre>');

    const backToQuote = htmlToMarkdown(quoteHtml);
    expect(backToQuote).toContain("> Knowledge is power");

    const backToCode = htmlToMarkdown(codeHtml);
    expect(backToCode).toContain("```");
    expect(backToCode).toContain("const x = 42;");
  });

  it("handles horizontal rules and empty content cleanly", () => {
    expect(markdownToHtml("")).toBe("");
    expect(htmlToMarkdown("")).toBe("");

    const hrHtml = markdownToHtml("---");
    expect(hrHtml).toBe("<hr>");
    expect(htmlToMarkdown(hrHtml)).toBe("---");
  });
});
