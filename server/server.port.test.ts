import { describe, expect, it } from "vitest";
import { resolveServerPort } from "./_core/port";

describe("managed server port", () => {
  it("uses the configured managed port and falls back only to 3000", () => {
    expect(resolveServerPort("4173")).toBe(4173);
    expect(resolveServerPort(undefined)).toBe(3000);
  });

  it("rejects malformed port values instead of silently binding a different port", () => {
    expect(() => resolveServerPort("not-a-port")).toThrow("PORT must be a valid TCP port number");
    expect(() => resolveServerPort("70000")).toThrow("PORT must be a valid TCP port number");
  });
});
