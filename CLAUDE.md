# CLAUDE.md

## Naming Conventions

### TypeScript / React Code
- **Variables and parameters:** camelCase (`groupId`, `isInitialized`, `contextType`)
- **Functions and handlers:** camelCase (`handleCreateMeeting`, `initLiff`, `createApiHeaders`)
- **React hooks:** camelCase, prefixed with `use` (`useLiff`)
- **React components:** PascalCase (`LiffProvider`, `HomePageContent`, `Providers`)
- **Types, interfaces, and context types:** PascalCase (`LiffContextType`, `Meeting`, `CreateMeetingRequest`, `ProvidersProps`)
- **Exported singleton instances:** camelCase (`api`, `queryClient`)

### File and Directory Names
- **Standalone component files** (outside `app/`): PascalCase (`LiffProvider.tsx`)
- **Next.js App Router files** (`page.tsx`, `layout.tsx`, `providers.tsx`): lowercase
- **Hook files:** camelCase, prefixed with `use` (`useLiff.ts`)
- **Utility and lib files:** camelCase (`apiHeaders.ts`, `api.ts`)
- **Type files:** camelCase (`meeting.ts`)
- **Route segment directories:** kebab-case (e.g., `create-meeting/`)

### API Response Mapping
- Backend JSON uses snake_case (`line_user_id`, `line_display_name`, `selected_dates`)
- Frontend TypeScript types use camelCase (`lineUserId`, `displayName`, `selectedDates`)
- Explicitly map snake_case → camelCase when consuming API responses

### URL Paths
- API endpoint paths: kebab-case matching backend (`/users/auth/line-login`, `/api/v1/`)
- Next.js route directories: kebab-case (`/create`, `/create-meeting`)

## Authentication
- LIFF access token is exchanged for a backend JWT via `POST /users/auth/line-login`
- JWT is set by the backend as an **HttpOnly cookie** (`access_token`) — never stored in `localStorage` or accessible via JavaScript
- `credentials: "include"` is set on all `fetch` calls so the cookie is sent automatically
- No manual `Authorization` header is needed — the cookie handles authentication
- Logout calls `POST /users/auth/logout` to clear the HttpOnly cookie
- When running against an ngrok URL, `ngrok-skip-browser-warning: true` is added automatically

## Environment Variables
| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF App ID | — (required) |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL (includes `/api/v1`) | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | LINE channel ID for auth | — (required) |

## Timezone
- All dates sent to the backend are Bangkok time (`GMT+7`, `Asia/Bangkok`)
- Date strings use `YYYY-MM-DD` format; time slots use `HH:MM` format
- Always account for GMT+7 when formatting or parsing dates

## UI / LIFF Guidelines
- Do not add custom header navigation (back arrows, close buttons) to pages — LIFF in the LINE platform already provides these controls natively

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS v4
- **Server state / data fetching:** TanStack React Query v5
- **State management:** Zustand
- **LINE integration:** LIFF SDK (`@line/liff`)
- **Auth:** HttpOnly cookie (set by backend, no client-side token handling)
- **Date utilities:** `date-fns`
- **HTTP client:** Native `fetch` wrapped in `ApiClient` class (`src/lib/api.ts`)
