import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type SetCookieCall = {
  name: string;
  val: string;
  options: Record<string, unknown>;
};

function createUnauthContext(): { ctx: TrpcContext; setCookies: SetCookieCall[] } {
  const setCookies: SetCookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        setCookies.push({ name, val, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth registration and login", () => {
  it("registers a new secretary account and issues a session cookie", async () => {
    const { ctx, setCookies } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const testEmail = `sec_${Date.now()}@example.com`;
    const result = await caller.auth.register({
      name: "Alex Secretary",
      email: testEmail,
      password: "strongpassword123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe("Alex Secretary");
    expect(setCookies.length).toBeGreaterThan(0);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("logs in with valid credentials and sets session cookie", async () => {
    const { ctx, setCookies } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const testEmail = `login_${Date.now()}@example.com`;
    const result = await caller.auth.login({
      email: testEmail,
      password: "mypassword123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(setCookies.length).toBeGreaterThan(0);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
  });
});
