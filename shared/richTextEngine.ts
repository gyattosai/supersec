/**
 * High-fidelity bidirectional converter between Markdown and HTML for WYSIWYG editing.
 * Handles headings, bold, italic, underline, strikethrough, lists (bullet, ordered, task),
 * code blocks, inline code, blockquotes, links, images, and horizontal rules.
 */

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function inlineMarkdownToHtml(text: string): string {
  if (!text) return "";

  // 1. Inline code (protect from other replacements)
  const codeMatches: string[] = [];
  let processed = text.replace(/`([^`]+)`/g, (_match, code) => {
    codeMatches.push(`<code>${escapeHtml(code)}</code>`);
    return `__CODE_${codeMatches.length - 1}__`;
  });

  // 2. Images: ![alt](url)
  processed = processed.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, (_match, alt, src) => {
    return `<img src="${src}" alt="${escapeHtml(alt)}" />`;
  });

  // 3. Links: [title](url)
  processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, (_match, title, url) => {
    return `<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>`;
  });

  // 4. Bold: **text** or __text__
  processed = processed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 5. Italic: *text* or _text_
  processed = processed.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
  processed = processed.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, "$1<em>$2</em>$3");

  // 6. Strikethrough: ~~text~~
  processed = processed.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // 7. Underline: <u>text</u> or <ins>text</ins>
  processed = processed.replace(/<u>([^<]+)<\/u>/gi, "<u>$1</u>");
  processed = processed.replace(/<ins>([^<]+)<\/ins>/gi, "<u>$1</u>");

  // Restore inline code
  processed = processed.replace(/__CODE_(\d+)__/g, (_match, index) => codeMatches[Number(index)] || "");

  return processed;
}

export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return "";

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced code block (``` ... ```)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      if (i < lines.length && lines[i].startsWith("```")) {
        i++; // skip closing ```
      }
      htmlBlocks.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ""}>${codeLines.join("\n")}</code></pre>`
      );
      continue;
    }

    // 3. Headings (#, ##, ###)
    if (line.startsWith("# ")) {
      htmlBlocks.push(`<h1>${inlineMarkdownToHtml(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      htmlBlocks.push(`<h2>${inlineMarkdownToHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      htmlBlocks.push(`<h3>${inlineMarkdownToHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    // 4. Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      htmlBlocks.push("<hr>");
      i++;
      continue;
    }

    // 5. Blockquote (> line)
    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        quoteLines.push(lines[i].startsWith("> ") ? lines[i].slice(2) : "");
        i++;
      }
      htmlBlocks.push(`<blockquote><p>${quoteLines.map(inlineMarkdownToHtml).join("<br>")}</p></blockquote>`);
      continue;
    }

    // 6. Task List (- [ ] or - [x])
    if (/^-\s*\[([ xX])\]\s+(.+)$/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const taskMatch = lines[i].trim().match(/^-\s*\[([ xX])\]\s+(.+)$/);
        if (!taskMatch) break;
        const checked = taskMatch[1].toLowerCase() === "x";
        const content = inlineMarkdownToHtml(taskMatch[2]);
        items.push(
          `<li data-task="${checked}"><input type="checkbox" ${checked ? "checked " : ""}disabled /> ${content}</li>`
        );
        i++;
      }
      htmlBlocks.push(`<ul class="task-list">${items.join("")}</ul>`);
      continue;
    }

    // 7. Unordered List (- or *)
    if (/^[-*]\s+(.+)$/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listMatch = lines[i].trim().match(/^[-*]\s+(.+)$/);
        if (!listMatch || /^-\s*\[([ xX])\]/.test(lines[i].trim())) break;
        items.push(`<li>${inlineMarkdownToHtml(listMatch[1])}</li>`);
        i++;
      }
      htmlBlocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // 8. Ordered List (1. 2. ...)
    if (/^\d+\.\s+(.+)$/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const ordMatch = lines[i].trim().match(/^\d+\.\s+(.+)$/);
        if (!ordMatch) break;
        items.push(`<li>${inlineMarkdownToHtml(ordMatch[1])}</li>`);
        i++;
      }
      htmlBlocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // 9. Standard Paragraph (accumulate consecutive non-block lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      lines[i].trim() !== "---" &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      pLines.push(inlineMarkdownToHtml(lines[i]));
      i++;
    }

    if (pLines.length > 0) {
      htmlBlocks.push(`<p>${pLines.join("<br>")}</p>`);
    }
  }

  return htmlBlocks.join("");
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return "";

  // If in browser, use DOM parser for 100% exact semantic extraction
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return domToMarkdown(div).trim();
  }

  // Node.js fallback (for SSR / server-side tests)
  return fallbackHtmlToMarkdown(html);
}

function domToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(domToMarkdown).join("");

  switch (tag) {
    case "h1":
      return `\n# ${children.trim()}\n\n`;
    case "h2":
      return `\n## ${children.trim()}\n\n`;
    case "h3":
      return `\n### ${children.trim()}\n\n`;
    case "p":
      return `\n${children.trim()}\n\n`;
    case "br":
      return "\n";
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "u":
    case "ins":
      return `<u>${children}</u>`;
    case "del":
    case "s":
    case "strike":
      return `~~${children}~~`;
    case "pre": {
      const codeEl = el.querySelector("code");
      const codeText = codeEl ? codeEl.textContent || "" : children;
      return `\n\`\`\`\n${codeText.trim()}\n\`\`\`\n\n`;
    }
    case "code":
      if (el.parentElement?.tagName.toLowerCase() === "pre") {
        return children;
      }
      return `\`${children}\``;
    case "blockquote": {
      const quoteText = children.trim().split("\n").filter(Boolean).map(line => `> ${line.trim()}`).join("\n");
      return `\n${quoteText}\n\n`;
    }
    case "ul": {
      const isTaskList = el.classList.contains("task-list") || Array.from(el.children).some(c => c.hasAttribute("data-task"));
      const items = Array.from(el.children).map(li => {
        if (isTaskList) {
          const checked = li.getAttribute("data-task") === "true" || (li.querySelector("input[type='checkbox']") as HTMLInputElement)?.checked;
          const liText = Array.from(li.childNodes)
            .filter(n => n.nodeName.toLowerCase() !== "input")
            .map(domToMarkdown)
            .join("")
            .trim();
          return `- [${checked ? "x" : " "}] ${liText}`;
        }
        return `- ${domToMarkdown(li).trim()}`;
      });
      return `\n${items.join("\n")}\n\n`;
    }
    case "ol": {
      const items = Array.from(el.children).map((li, index) => `${index + 1}. ${domToMarkdown(li).trim()}`);
      return `\n${items.join("\n")}\n\n`;
    }
    case "li":
      return children;
    case "hr":
      return "\n---\n\n";
    case "a": {
      const href = el.getAttribute("href") || "";
      return `[${children.trim()}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "";
      return `![${alt}](${src})`;
    }
    case "div":
      return `${children}\n`;
    default:
      return children;
  }
}

/**
 * Regex-based HTML to Markdown converter for SSR / Node tests when `document` is unavailable.
 */
function fallbackHtmlToMarkdown(html: string): string {
  let md = html;

  // Code blocks
  md = md.replace(/<pre><code(?:\s+class="language-[^"]*")?>([\s\S]*?)<\/code><\/pre>/gi, (_match, code) => {
    return `\n\`\`\`\n${unescapeHtml(code).trim()}\n\`\`\`\n\n`;
  });

  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/gi, (_match, code) => `\`${unescapeHtml(code)}\``);

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_match, h) => `\n# ${h.trim()}\n\n`);
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_match, h) => `\n## ${h.trim()}\n\n`);
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_match, h) => `\n### ${h.trim()}\n\n`);

  // Bold & Italic & Underline & Strikethrough
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "<u>$1</u>");
  md = md.replace(/<ins[^>]*>(.*?)<\/ins>/gi, "<u>$1</u>");
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, "~~$1~~");
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~");

  // Links & Images
  md = md.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<img\s+[^>]*src="([^"]*)"(?:\s+alt="([^"]*)")?[^>]*\/?>(?:<\/img>)?/gi, "![${alt || ''}]($1)");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, inner) => {
    const text = inner.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n").trim();
    const lines = text.split("\n").filter(Boolean).map((l: string) => `> ${l.trim()}`).join("\n");
    return `\n${lines}\n\n`;
  });

  // Task lists
  md = md.replace(/<li[^>]*data-task="true"[^>]*>[\s\S]*?<input[^>]*>\s*([\s\S]*?)<\/li>/gi, "- [x] $1\n");
  md = md.replace(/<li[^>]*data-task="false"[^>]*>[\s\S]*?<input[^>]*>\s*([\s\S]*?)<\/li>/gi, "- [ ] $1\n");

  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner) => {
    const items = inner.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
    return `\n${items.trim()}\n\n`;
  });

  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner) => {
    let index = 1;
    const items = inner.replace(/<li[^>]*>(.*?)<\/li>/gi, (_m: string, text: string) => {
      const res = `${index}. ${text.trim()}\n`;
      index++;
      return res;
    });
    return `\n${items.trim()}\n\n`;
  });

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, "\n---\n\n");

  // Paragraphs & line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n\n");

  // Clean tags & whitespace
  md = md.replace(/<[^>]+>/g, "");
  md = unescapeHtml(md);
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function unescapeHtml(str: string): string {
  return (str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
