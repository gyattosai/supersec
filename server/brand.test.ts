import { describe, expect, it } from "vitest";

describe("project brand configuration", () => {
  it("uses the requested supersec application title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("supersec — a class secretary management system");
  });
});
