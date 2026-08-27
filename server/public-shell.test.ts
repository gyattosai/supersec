import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { ThemeProvider } from "../client/src/contexts/ThemeContext";
import { PublicShell } from "../client/src/pages/PublicPages";

describe("shared reader frame", () => {
  it("clearly identifies shared pages as view-only without rendering private workspace language", () => {
    const tree = createElement(
      ThemeProvider,
      { defaultTheme: "dark", switchable: true },
      createElement(Router, { ssrPath: "/" }, createElement(PublicShell, null, createElement("p", null, "Shared content"))),
    );
    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain("VIEW ONLY");
    expect(markup).toContain("Shared class page");
    expect(markup).not.toContain("Secretary workspace");
  });
});
