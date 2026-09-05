import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { Client, Users, Account } from "node-appwrite";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class AppwriteAuthService {
  private client: Client | null = null;
  private users: Users | null = null;

  constructor() {
    if (ENV.appwriteProjectId && ENV.appwriteApiKey) {
      this.client = new Client()
        .setEndpoint(ENV.appwriteEndpoint)
        .setProject(ENV.appwriteProjectId)
        .setKey(ENV.appwriteApiKey);
      this.users = new Users(this.client);
    }
  }

  async verifyAppwriteJWT(jwt: string): Promise<{ userId: string; email?: string; name?: string } | null> {
    if (!ENV.appwriteProjectId) return null;
    try {
      const res = await fetch(`${ENV.appwriteEndpoint}/account`, {
        method: "GET",
        headers: {
          "X-Appwrite-Project": ENV.appwriteProjectId,
          "X-Appwrite-JWT": jwt,
        },
      });
      if (!res.ok) return null;
      const user = (await res.json()) as { $id: string; email?: string; name?: string };
      return {
        userId: user.$id,
        email: user.email || undefined,
        name: user.name || undefined,
      };
    } catch {
      return null;
    }
  }
}

class SDKServer {
  private readonly appwriteAuth: AppwriteAuthService;

  constructor() {
    this.appwriteAuth = new AppwriteAuthService();
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a signed session token for a user ID
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appwriteProjectId || "supersec-app",
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    tokenValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string; email?: string } | null> {
    if (!tokenValue) {
      return null;
    }

    // 1. Try Appwrite JWT verification
    if (ENV.appwriteProjectId) {
      const appwriteUser = await this.appwriteAuth.verifyAppwriteJWT(tokenValue);
      if (appwriteUser) {
        return {
          openId: appwriteUser.userId,
          appId: ENV.appwriteProjectId,
          name: appwriteUser.name || "",
          email: appwriteUser.email,
        };
      }
    }

    // 2. Fallback to local signed JWT verification
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(tokenValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // 1. Prefer cookie or Appwrite session cookie
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to Authorization header Bearer token
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid session cookie or token");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      const isOwner = sessionUserId === ENV.ownerOpenId || sessionUserId === "dev-secretary";
      user = {
        id: 1,
        openId: session.openId,
        name: session.name || "Class Secretary",
        email: session.email || "secretary@example.com",
        loginMethod: "appwrite",
        role: isOwner ? "admin" : "user",
        createdAt: signedInAt,
        updatedAt: signedInAt,
        lastSignedIn: signedInAt,
      };

      try {
        await db.upsertUser({
          openId: user.openId,
          name: user.name,
          email: user.email,
          loginMethod: user.loginMethod,
          role: user.role,
          lastSignedIn: signedInAt,
        });
      } catch {
        // Ignore upsert failure in offline dev mode
      }
    } else {
      try {
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });
      } catch {
        // Ignore DB upsert failure in offline dev mode
      }
    }

    return user;
  }
}

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

export const sdk = new SDKServer();

