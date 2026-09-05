import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import { isWorkspaceOwner } from "./routers/guards";
import type { TrpcContext } from "./_core/context";
import {
  formatDateTime12Hour,
  formatTime12Hour,
  formatTimeRange12Hour,
  time12PartsTo24,
  time24To12Parts,
} from "../client/src/lib/time";

function makeContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function makeSecretaryUser(openId: string, role: "user" | "admin" = "admin"): NonNullable<TrpcContext["user"]> {
  return {
    id: 1,
    openId,
    name: "Class Secretary",
    email: "secretary@example.com",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("Authorization guards & workspace boundaries", () => {
  it("rejects unauthenticated requests to owner procedures with UNAUTHORIZED", async () => {
    const unauthenticatedCaller = appRouter.createCaller(makeContext(null));
    await expect(unauthenticatedCaller.foundation.owner.getContext()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(unauthenticatedCaller.subjects.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(unauthenticatedCaller.reports.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(unauthenticatedCaller.content.archiveList()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects non-owner users from mutating or viewing secretary private desks with FORBIDDEN", async () => {
    const regularUser = makeSecretaryUser("regular-student-openid", "user");
    const regularCaller = appRouter.createCaller(makeContext(regularUser));

    await expect(regularCaller.foundation.owner.getContext()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the class secretary can manage this workspace.",
    });
    await expect(regularCaller.subjects.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(regularCaller.subjects.create({
      name: "Software Engineering",
      code: "CS 302",
      professorName: "Dr. Santos",
      meetingDays: [{ weekday: 1, startTime: "09:00", endTime: "11:00" }],
    })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(regularCaller.attendance.list({ sessionId: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(regularCaller.reports.allSubjectAttendance()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("authenticates configured owner or admin role correctly in isWorkspaceOwner", () => {
    expect(isWorkspaceOwner(null)).toBe(false);
    expect(isWorkspaceOwner(undefined)).toBe(false);
    expect(isWorkspaceOwner({ openId: "random-user", role: "user" })).toBe(false);
    expect(isWorkspaceOwner({ openId: ENV.ownerOpenId, role: "user" })).toBe(true);
    expect(isWorkspaceOwner({ openId: `  ${ENV.ownerOpenId}  `, role: "user" })).toBe(true);
    expect(isWorkspaceOwner({ openId: "any-admin-user", role: "admin" })).toBe(true);
  });

  it("returns null for auth.me when unauthenticated, and sanitized user object when authenticated", async () => {
    const unauthedCaller = appRouter.createCaller(makeContext(null));
    await expect(unauthedCaller.auth.me()).resolves.toBeNull();

    const authedUser = makeSecretaryUser("test-owner", "admin");
    const authedCaller = appRouter.createCaller(makeContext(authedUser));
    const me = await authedCaller.auth.me();
    expect(me).not.toBeNull();
    expect(me?.email).toBe("secretary@example.com");
    expect(me?.name).toBe("Class Secretary");
    expect(me?.role).toBe("admin");
  });
});

describe("12-Hour Time Controls & Edge Conversions", () => {
  it("accurately breaks down 24h into 12h parts across boundary timestamps", () => {
    // Midnight
    expect(time24To12Parts("00:00")).toEqual({ hour: "12", minute: "00", period: "AM" });
    expect(time24To12Parts("00:01")).toEqual({ hour: "12", minute: "01", period: "AM" });
    expect(time24To12Parts("00:59")).toEqual({ hour: "12", minute: "59", period: "AM" });

    // Morning
    expect(time24To12Parts("07:30")).toEqual({ hour: "7", minute: "30", period: "AM" });
    expect(time24To12Parts("11:59")).toEqual({ hour: "11", minute: "59", period: "AM" });

    // Noon
    expect(time24To12Parts("12:00")).toEqual({ hour: "12", minute: "00", period: "PM" });
    expect(time24To12Parts("12:30")).toEqual({ hour: "12", minute: "30", period: "PM" });

    // Afternoon & Night
    expect(time24To12Parts("13:00")).toEqual({ hour: "1", minute: "00", period: "PM" });
    expect(time24To12Parts("20:45")).toEqual({ hour: "8", minute: "45", period: "PM" });
    expect(time24To12Parts("23:59")).toEqual({ hour: "11", minute: "59", period: "PM" });

    // Returns null on invalid/empty
    expect(time24To12Parts("")).toBeNull();
    expect(time24To12Parts("invalid")).toBeNull();
    expect(time24To12Parts(null)).toBeNull();
    expect(time24To12Parts(undefined)).toBeNull();
  });

  it("accurately converts 12h parts back to 24h strings", () => {
    expect(time12PartsTo24({ hour: "12", minute: "00", period: "AM" })).toBe("00:00");
    expect(time12PartsTo24({ hour: "12", minute: "45", period: "AM" })).toBe("00:45");
    expect(time12PartsTo24({ hour: "1", minute: "15", period: "AM" })).toBe("01:15");
    expect(time12PartsTo24({ hour: "11", minute: "30", period: "AM" })).toBe("11:30");
    expect(time12PartsTo24({ hour: "12", minute: "00", period: "PM" })).toBe("12:00");
    expect(time12PartsTo24({ hour: "1", minute: "00", period: "PM" })).toBe("13:00");
    expect(time12PartsTo24({ hour: "11", minute: "59", period: "PM" })).toBe("23:59");
    expect(time12PartsTo24({})).toBe("");
  });

  it("formats single time and time ranges into readable 12-hour strings", () => {
    expect(formatTime12Hour("00:00")).toBe("12:00 AM");
    expect(formatTime12Hour("12:00")).toBe("12:00 PM");
    expect(formatTime12Hour("14:30")).toBe("2:30 PM");

    expect(formatTimeRange12Hour("08:00", "10:30")).toBe(" · 8:00 AM–10:30 AM");
    expect(formatTimeRange12Hour("13:00", "17:00")).toBe(" · 1:00 PM–5:00 PM");
    expect(formatTimeRange12Hour("09:00", null)).toBe(" · 9:00 AM");
    expect(formatTimeRange12Hour(null, "11:00")).toBe("");
    expect(formatTimeRange12Hour(null, null)).toBe("");
  });

  it("formats date-time objects and strings consistently without 24h bleeding", () => {
    const testDate = new Date(2026, 7, 28, 14, 5); // Aug 28, 2026 2:05 PM
    const formatted = formatDateTime12Hour(testDate);
    expect(formatted).toMatch(/2:05\sPM/i);
    expect(formatted).not.toMatch(/14:05/);

    const midnightDate = new Date(2026, 7, 28, 0, 0);
    const formattedMidnight = formatDateTime12Hour(midnightDate);
    expect(formattedMidnight).toMatch(/12:00\sAM/i);
  });
});

describe("Public view-only routes & security isolation", () => {
  it("does not expose private draft subjects to public queries", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));
    const result = await publicCaller.foundation.publicSubject({ publicId: "non-existent-or-private" });
    expect(result).toEqual({ available: false });
  });

  it("does not expose unverified attendance sessions to public queries", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));
    const result = await publicCaller.foundation.publicAttendance({ publicId: "unknown-session-id" });
    expect(result).toEqual({ available: false });
  });

  it("does not expose unverified public items or history to public queries", async () => {
    const publicCaller = appRouter.createCaller(makeContext(null));
    const itemResult = await publicCaller.foundation.publicItem({ kind: "announcement", publicId: "unknown-id" });
    expect(itemResult).toEqual({ available: false });
    const historyResult = await publicCaller.foundation.publicHistory({ kind: "announcement", publicId: "unknown-id" });
    expect(historyResult).toEqual({ available: false });
  });
});
