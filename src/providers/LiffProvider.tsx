"use client";

import { createContext, useEffect, useState } from "react";
import liff from "@line/liff";
import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";

type LiffContextType = {
  user: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
  isInitialized: boolean;
  isInClient: boolean;
  logout: () => void;
};

export const LiffContext = createContext<LiffContextType | undefined>(
  undefined
);

export default function LiffProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInClient, setIsInClient] = useState<boolean>(false);

  useEffect(() => {
    const initLiff = async () => {
      try {
        // Check if LIFF ID is configured
        if (!process.env.NEXT_PUBLIC_LIFF_ID) {
          console.warn("LIFF ID is not configured. Please set NEXT_PUBLIC_LIFF_ID in .env.local");
          setIsInitialized(true);
          return;
        }

        console.log("Initializing LIFF...");

        // Initialize LIFF
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID as string });

        console.log("LIFF initialized successfully");
        console.log("Is logged in:", liff.isLoggedIn());
        console.log("Is in client:", liff.isInClient());

        // Check if running in LINE app
        setIsInClient(liff.isInClient());

        // Check if user is logged in
        if (!liff.isLoggedIn()) {
          console.log("User not logged in, redirecting to login...");
          liff.login();
          return;
        }

        // Get LIFF access token
        const liffAccessToken = liff.getAccessToken();
        if (!liffAccessToken) {
          throw new Error("Failed to get LIFF Access Token");
        }

        console.log("Got LIFF access token");

        // Check if backend API is configured
        const apiBaseUrl = getApiBaseUrl();
        if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
          console.warn("Backend API not configured. Using LIFF-only mode.");
          // Fallback to LIFF profile only
          const profile = await liff.getProfile();
          setUser({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          });
          setIsInitialized(true);
          return;
        }

        // Exchange LIFF token for backend JWT token
        console.log("Exchanging LIFF token for JWT...");

        const authResponse = await fetch(`${apiBaseUrl}/users/auth/line-login`, {
          method: "POST",
          headers: createApiHeaders(),
          credentials: "include",
          body: JSON.stringify({
            access_token: liffAccessToken,
            channel_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID as string,
          }),
        });

        if (!authResponse.ok) {
          const errorData = await authResponse.json().catch(() => ({}));
          throw new Error(`Authentication failed: ${errorData.message || authResponse.statusText}`);
        }

        // The backend sets the JWT as an HttpOnly cookie in the response
        console.log("Got JWT cookie from backend");

        // Fetch user profile from backend (cookie is sent automatically)
        console.log("Fetching user profile from backend...");

        const userResponse = await fetch(`${apiBaseUrl}/users/me`, {
          method: "GET",
          headers: createApiHeaders(),
          credentials: "include",
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user profile from backend");
        }

        const userData = await userResponse.json();

        console.log("User profile from backend:", userData.data);

        // Set user context
        setUser({
          userId: userData.data.line_user_id,
          displayName: userData.data.line_display_name,
          pictureUrl: userData.data.picture,
        });

        setIsInitialized(true);
        console.log("✓ Authentication complete!");

      } catch (err) {
        console.error("LIFF initialization failed:", err);
        // Still mark as initialized to show error state
        setIsInitialized(true);
      }
    };

    // Only run on client side
    if (typeof window !== "undefined") {
      initLiff();
    }
  }, []);

  const logout = async () => {
    // Clear the HttpOnly cookie via backend logout endpoint
    const apiBaseUrl = getApiBaseUrl();
    await fetch(`${apiBaseUrl}/users/auth/logout`, {
      method: "POST",
      headers: createApiHeaders(),
      credentials: "include",
    }).catch(() => {});

    if (liff.isLoggedIn()) {
      liff.logout();
    }
    setUser(null);
    window.location.reload();
  };

  return (
    <LiffContext.Provider value={{ user, isInitialized, isInClient, logout }}>
      {children}
    </LiffContext.Provider>
  );
}
