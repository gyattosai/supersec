import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const userId = getQueryParam(req, "userId") || getQueryParam(req, "id");
    const secret = getQueryParam(req, "secret");

    if (userId) {
      const signedInAt = new Date();
      await db.upsertUser({
        openId: userId,
        name: "Appwrite User",
        loginMethod: "appwrite_oauth",
        lastSignedIn: signedInAt,
      });

      const sessionToken = await sdk.createSessionToken(userId, {
        name: "Appwrite User",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    }

    res.redirect(302, "/app");
  });
}

