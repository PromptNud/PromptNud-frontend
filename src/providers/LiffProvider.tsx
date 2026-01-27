"use client";

import { createContext, useEffect, useState } from "react";
import liff from "@line/liff";

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

        // Get user profile from LIFF
        const profile = await liff.getProfile();

        console.log("User profile:", profile);

        // Set user context
        setUser({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });

        setIsInitialized(true);
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

  const logout = () => {
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
