# Meeting Scheduler Frontend - Setup Guide

Complete step-by-step guide to initialize the frontend project from scratch.

---

## Step 1: Create Next.js Project

```bash
# Create a new directory for the frontend
npx create-next-app@latest meeting-scheduler-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Navigate into the project
cd meeting-scheduler-frontend
```

When prompted, choose:
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ `src/` directory
- ✅ App Router
- ✅ Import alias (`@/*`)
- ❌ Turbopack (optional)

---

## Step 2: Install Dependencies

```bash
# Core dependencies
npm install @line/liff @tanstack/react-query zustand date-fns js-cookie

# Dev dependencies
npm install -D @types/js-cookie
```

---

## Step 3: Update Next.js Configuration

Replace the contents of `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // CRITICAL: Handle LIFF SDK which requires client-side only
  transpilePackages: ['@line/liff'],

  // Image configuration for remote images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow LIFF to be embedded in LINE
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Step 4: Create Project Structure

```bash
# Create directory structure
mkdir -p src/providers
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/components/common
mkdir -p src/components/meeting
mkdir -p src/components/availability
mkdir -p src/app/create
mkdir -p src/app/meeting/[id]
mkdir -p src/app/meeting/[id]/availability
mkdir -p src/app/meeting/[id]/results
mkdir -p src/app/callback/google
```

---

## Step 5: Create Environment File

Create `.env.local` in the project root:

```bash
# LIFF Configuration
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1

# Google OAuth (optional for Phase 1)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Step 6: Create Core Files

### 6.1 API Headers Utility

Create `src/utils/apiHeaders.ts`:

```typescript
/**
 * Utility functions for API requests
 */

/**
 * Creates headers for API requests with authentication
 * @param accessToken The access token for authorization (optional - will read from storage if not provided)
 * @returns Headers object with appropriate values
 */
export const createApiHeaders = (accessToken?: string | null) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const isNgrok = apiBaseUrl.includes('ngrok');

  // Get token from parameter, localStorage, or cookies
  const token = accessToken ||
    (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add ngrok skip header for development
  if (isNgrok) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

/**
 * Gets the API base URL
 */
export const getApiBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
};
```

### 6.2 LIFF Provider

Create `src/providers/LiffProvider.tsx`:

```typescript
"use client";

import { createContext, useEffect, useState } from "react";
import liff from "@line/liff";
import Cookies from "js-cookie";
import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";

type LiffContextType = {
  user: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
  isInitialized: boolean;
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

  useEffect(() => {
    const initLiff = async () => {
      try {
        // Initialize LIFF
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID as string });

        // Check if user is logged in
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // Get LIFF access token
        const liffAccessToken = liff.getAccessToken();
        if (!liffAccessToken) throw new Error("Failed to get LIFF Access Token");

        // Exchange LIFF token for backend JWT token
        const apiBaseUrl = getApiBaseUrl();

        const authResponse = await fetch(`${apiBaseUrl}/users/auth/line-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: liffAccessToken,
            channel_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID as string,
          }),
        });

        if (!authResponse.ok) {
          throw new Error("Authentication failed");
        }

        const authData = await authResponse.json();
        const backendToken = authData.data.access_token;

        // Store token in both cookies and localStorage for reliability
        Cookies.set("access_token", backendToken, {
          expires: 1 / 24, // 1 hour
          secure: true,
          sameSite: "Lax",
        });
        localStorage.setItem("access_token", backendToken);

        // Fetch user profile from backend
        const userResponse = await fetch(`${apiBaseUrl}/users/me`, {
          method: "GET",
          headers: createApiHeaders(backendToken),
          credentials: "include",
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const userData = await userResponse.json();

        // Set user context
        setUser({
          userId: userData.data.line_user_id,
          displayName: userData.data.line_display_name,
          pictureUrl: userData.data.picture,
        });

        setIsInitialized(true);
      } catch (err) {
        console.error("LIFF initialization failed", err);
      }
    };

    // Only run on client side
    if (typeof window !== "undefined") {
      initLiff();
    }
  }, []);

  const logout = () => {
    liff.logout();
    setUser(null);
    Cookies.remove("access_token");
    localStorage.removeItem("access_token");
    window.location.reload();
  };

  return (
    <LiffContext.Provider value={{ user, isInitialized, logout }}>
      {children}
    </LiffContext.Provider>
  );
}
```

### 6.3 Custom Hook

Create `src/hooks/useLiff.ts`:

```typescript
"use client";

import { useContext } from "react";
import { LiffContext } from "@/providers/LiffProvider";

export function useLiff() {
  const context = useContext(LiffContext);

  if (context === undefined) {
    throw new Error("useLiff must be used within a LiffProvider");
  }

  return context;
}
```

### 6.4 Query Provider

Create `src/app/providers.tsx`:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 6.5 Root Layout

Update `src/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LiffProvider from "@/providers/LiffProvider";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meeting Scheduler",
  description: "AI-powered meeting scheduler for LINE groups",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LiffProvider>
          <Providers>{children}</Providers>
        </LiffProvider>
      </body>
    </html>
  );
}
```

### 6.6 Home Page

Update `src/app/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import liff from "@line/liff";
import { useLiff } from "@/hooks/useLiff";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useLiff();
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) return;

    // Get groupId from URL params or LIFF context
    const urlGroupId = searchParams.get("groupId");
    const context = liff.getContext();

    setGroupId(urlGroupId || context?.groupId || null);

    // Handle action param
    const action = searchParams.get("action");
    if (action === "create") {
      router.push("/create");
    }
  }, [searchParams, router, isInitialized]);

  const handleCreateMeeting = () => {
    router.push(`/create${groupId ? `?groupId=${groupId}` : ""}`);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto p-4">
        <header className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            📅 Meeting Scheduler
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user?.displayName || "Guest"}
          </p>
        </header>

        <button
          onClick={handleCreateMeeting}
          className="w-full mb-6 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          + Create New Meeting
        </button>

        {groupId ? (
          <div className="text-center text-gray-600">
            <p>Group ID: {groupId}</p>
            <p className="mt-2 text-sm">Meetings will be listed here</p>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>Open this app from a LINE group chat to see meetings</p>
          </div>
        )}
      </div>
    </main>
  );
}
```

### 6.7 TypeScript Types

Create `src/types/meeting.ts`:

```typescript
export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  hasGoogleCalendar: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  type: "meals" | "cafe" | "sports" | "others";
  durationMinutes: number;
  location?: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  status: "collecting" | "voting" | "confirmed" | "cancelled";
  organizer: {
    id: string;
    displayName: string;
    pictureUrl?: string;
  };
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  type: string;
  durationMinutes: number;
  location?: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredDays: string[];
  preferredTimes: string[];
  notes?: string;
  groupId?: string;
}
```

### 6.8 API Client

Create `src/lib/api.ts`:

```typescript
import { createApiHeaders, getApiBaseUrl } from "@/utils/apiHeaders";
import type { Meeting, CreateMeetingRequest } from "@/types/meeting";

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...createApiHeaders(),
        ...options.headers,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // User
  async getMe() {
    return this.fetch<{
      data: {
        id: string;
        line_user_id: string;
        line_display_name: string;
        picture?: string;
        hasGoogleCalendar: boolean;
      };
    }>("/users/me");
  }

  // Meetings
  async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
    return this.fetch<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}`);
  }

  async getMeetingsByGroup(groupId: string): Promise<{ meetings: Meeting[] }> {
    return this.fetch<{ meetings: Meeting[] }>(`/meetings/group/${groupId}`);
  }
}

export const api = new ApiClient();
```

---

## Step 7: Add .gitignore Entries

Add to `.gitignore`:

```
# Environment variables
.env.local
.env*.local

# Local development
.vercel
```

---

## Step 8: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Step 9: Testing LIFF Integration

### Option A: Use ngrok for Local Testing

```bash
# Install ngrok if you haven't
npm install -g ngrok

# In a new terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update your LIFF endpoint URL in LINE Developer Console to this URL
```

### Option B: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts and copy the deployment URL
# Update your LIFF endpoint URL in LINE Developer Console
```

---

## Step 10: Configure LINE Developer Console

1. Go to https://developers.line.biz/console/
2. Select your channel
3. Go to LIFF tab
4. Update "Endpoint URL" to your deployment URL
5. Copy your LIFF ID and add it to `.env.local`

---

## Next Steps

1. ✅ Backend API must be running and accessible
2. ✅ Create meeting form component
3. ✅ Implement availability picker
4. ✅ Add meeting list view
5. ✅ Integrate Google Calendar sync

---

## Troubleshooting

### Issue: "LIFF initialization failed"
- Check that `NEXT_PUBLIC_LIFF_ID` is set correctly
- Verify LIFF endpoint URL matches your deployment
- Ensure you're opening the app from LINE (or use LINE LIFF inspector)

### Issue: "Authentication failed"
- Verify backend is running at `NEXT_PUBLIC_API_BASE_URL`
- Check `NEXT_PUBLIC_LINE_CHANNEL_ID` matches your LINE channel
- Verify backend `/users/auth/line-login` endpoint is working

### Issue: "Failed to fetch user profile"
- Check backend `/users/me` endpoint
- Verify JWT token is being stored correctly
- Check browser console for detailed errors

### Issue: Module not found errors
- Make sure all dependencies are installed: `npm install`
- Verify `transpilePackages: ['@line/liff']` is in `next.config.ts`
- Try deleting `.next` folder and `node_modules`, then reinstall

---

## Project Structure

```
meeting-scheduler-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home page
│   │   ├── providers.tsx       # React Query provider
│   │   ├── create/             # Meeting creation
│   │   ├── meeting/            # Meeting detail pages
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── common/             # Reusable components
│   │   ├── meeting/            # Meeting components
│   │   └── availability/       # Availability components
│   ├── hooks/
│   │   └── useLiff.ts          # LIFF custom hook
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── providers/
│   │   └── LiffProvider.tsx    # LIFF context provider
│   ├── types/
│   │   └── meeting.ts          # TypeScript types
│   └── utils/
│       └── apiHeaders.ts       # API utilities
├── .env.local                  # Environment variables
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Reference

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
