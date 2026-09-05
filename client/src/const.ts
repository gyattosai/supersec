import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { OAuthProvider } from "appwrite";
import { appwriteAccount } from "./lib/appwrite";

export { COOKIE_NAME, ONE_YEAR_MS };

export const startDevLogin = async () => {
  try {
    const res = await fetch("/api/trpc/auth.devLogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      window.location.href = "/app";
    } else {
      console.error("Dev login failed", await res.text());
    }
  } catch (err) {
    console.error("Dev login error", err);
  }
};

/**
 * Start Authentication
 * Navigates to the login/registration page.
 */
export const startLogin = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};


