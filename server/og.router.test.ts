import { describe, expect, it } from "vitest";
import { generateShareHtml, parseTargetPathFromRequest } from "./_core/shareRouter";
import { getSocialShareUrl, normalizeSharePath } from "../shared/shareUrl";
import type { Request } from "express";

describe("Social Share Router & URL Generator", () => {
  describe("normalizeSharePath", () => {
    it("normalizes path with leading slash and removes trailing slash", () => {
      expect(normalizeSharePath("a/12345")).toBe("/a/12345");
      expect(normalizeSharePath("/a/12345/")).toBe("/a/12345");
      expect(normalizeSharePath("https://supersec.mjbalubar.tech/s/cs101")).toBe("/s/cs101");
      expect(normalizeSharePath("")).toBe("/");
    });
  });

  describe("getSocialShareUrl", () => {
    it("generates /share link with target param", () => {
      const url = getSocialShareUrl("/a/k39df2", { origin: "https://supersec.mjbalubar.tech" });
      expect(url).toBe("https://supersec.mjbalubar.tech/share?target=%2Fa%2Fk39df2");
    });

    it("appends version query parameter", () => {
      const url = getSocialShareUrl("/a/k39df2", {
        origin: "https://supersec.mjbalubar.tech",
        version: 3,
      });
      expect(url).toBe("https://supersec.mjbalubar.tech/share?target=%2Fa%2Fk39df2&v=3");
    });

    it("appends fastCacheBust timestamp and version", () => {
      const url = getSocialShareUrl("/a/k39df2", {
        origin: "https://supersec.mjbalubar.tech",
        fastCacheBust: true,
        version: 2,
      });
      expect(url).toContain("https://supersec.mjbalubar.tech/share?target=%2Fa%2Fk39df2");
      expect(url).toContain("&t=");
      expect(url).toContain("&v=2");
    });
  });

  describe("parseTargetPathFromRequest", () => {
    it("extracts target parameter from query", () => {
      const req = {
        query: { target: "/a/abc123" },
        path: "/share",
      } as unknown as Request;
      expect(parseTargetPathFromRequest(req)).toBe("/a/abc123");
    });

    it("extracts path parameter from query", () => {
      const req = {
        query: { path: "/r/xyz789" },
        path: "/share",
      } as unknown as Request;
      expect(parseTargetPathFromRequest(req)).toBe("/r/xyz789");
    });

    it("extracts url parameter from query", () => {
      const req = {
        query: { url: "https://supersec.mjbalubar.tech/s/subject1" },
        path: "/share",
      } as unknown as Request;
      expect(parseTargetPathFromRequest(req)).toBe("/s/subject1");
    });

    it("extracts path from path parameter /share/a/123", () => {
      const req = {
        query: {},
        path: "/share/a/123",
      } as unknown as Request;
      expect(parseTargetPathFromRequest(req)).toBe("/a/123");
    });

    it("handles legacy ?type=a&id=123", () => {
      const req = {
        query: { type: "a", id: "sample123" },
        path: "/",
      } as unknown as Request;
      expect(parseTargetPathFromRequest(req)).toBe("/a/sample123");
    });
  });

  describe("generateShareHtml", () => {
    it("generates resilient fallback HTML with 1200x630 OG metadata and redirect script", async () => {
      const req = {
        query: { target: "/a/nonexistent_id" },
        path: "/share",
      } as unknown as Request;

      const result = await generateShareHtml(req);

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain('<meta property="og:type" content="website">');
      expect(result.html).toContain('<meta property="og:image:width" content="1200">');
      expect(result.html).toContain('<meta property="og:image:height" content="630">');
      expect(result.html).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(result.html).toContain("window.location.replace");
      expect(result.html).toContain('<meta http-equiv="refresh"');
      expect(result.imageUrl).toContain("og-cover.png");
      expect(result.redirectTargetUrl).toContain("/a/nonexistent_id");
    });

    it("generates valid metadata for root path fallback", async () => {
      const req = {
        query: {},
        path: "/share",
      } as unknown as Request;

      const result = await generateShareHtml(req);

      expect(result.html).toContain("supersec");
      expect(result.imageUrl).toContain("og-cover.png");
      expect(result.redirectTargetUrl).toBe("https://supersec.mjbalubar.tech/");
    });
  });
});
