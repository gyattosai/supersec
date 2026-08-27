import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicResourceAttachments } from "../client/src/components/PublicResourceAttachments";
import { formatFileSize, isPublicImageMimeType, isSupportedPublicUploadMimeType, isSupportedResourceFileMimeType, MAX_PUBLIC_UPLOAD_BYTES } from "../shared/mediaPolicy";

describe("public attachment policy", () => {
  it("allows only the intended public images and class file formats within the fixed size boundary", () => {
    expect(isPublicImageMimeType("image/png")).toBe(true);
    expect(isSupportedResourceFileMimeType("application/pdf")).toBe(true);
    expect(isSupportedResourceFileMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
    expect(isSupportedPublicUploadMimeType("application/pdf")).toBe(true);
    expect(isSupportedPublicUploadMimeType("application/zip")).toBe(false);
    expect(isSupportedPublicUploadMimeType("text/html")).toBe(false);
    expect(MAX_PUBLIC_UPLOAD_BYTES).toBe(8_000_000);
    expect(formatFileSize(1536)).toBe("2 KB");
  });

  it("renders safe public metadata for attached course files without any private record data", () => {
    const html = renderToStaticMarkup(createElement(PublicResourceAttachments, { attachments: [
      { id: 7, url: "/manus-storage/class-guide.pdf", originalName: "class-guide.pdf", mimeType: "application/pdf", byteSize: 1400, altText: null },
      { id: 8, url: "/manus-storage/topic-map.png", originalName: "topic-map.png", mimeType: "image/png", byteSize: 2048, altText: "Topic map" },
    ] }));
    expect(html).toContain("Attached course files");
    expect(html).toContain("class-guide.pdf");
    expect(html).toContain("Download file");
    expect(html).toContain("topic-map.png");
    expect(html).toContain("Open image");
    expect(html).not.toContain("ownerId");
    expect(html).not.toContain("storageKey");
  });
});
