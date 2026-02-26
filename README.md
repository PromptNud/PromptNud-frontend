# Meeting Scheduler - Frontend (LIFF App)

Next.js LIFF application for LINE group meeting scheduling. Runs inside the LINE messaging app, authenticating users through the LIFF SDK and exchanging tokens for backend JWT cookies.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS v4
- **Server State:** TanStack React Query v5
- **Client State:** Zustand
- **LINE Integration:** LIFF SDK (`@line/liff` v2.27)
- **Auth:** HttpOnly cookie (set by backend, no client-side token handling)
- **Date Utilities:** date-fns

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF App ID | — (required) |
| `NEXT_PUBLIC_LINE_CHANNEL_ID` | LINE Channel ID | — (required) |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:8080/api/v1` |

### 3. Run Development Server

```bash
npm run dev
```

App available at `http://localhost:3000`.

### 4. Test in LINE

LIFF apps must be accessed through LINE — localhost won't work in the LINE app.

**Option A: ngrok**
```bash
ngrok http 3000
```
Then set the ngrok URL as your LIFF Endpoint URL in the [LINE Developers Console](https://developers.line.biz/console/).

**Option B: Vercel**
```bash
npx vercel
```

Open `https://liff.line.me/YOUR-LIFF-ID` in LINE to test.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with LiffProvider
│   ├── page.tsx                # Home dashboard (profile, status, meeting list)
│   ├── providers.tsx           # React Query provider (staleTime: 60s, retry: 1)
│   ├── globals.css             # Tailwind + custom theme variables
│   ├── create/page.tsx         # Meeting creation form
│   ├── callback/google/        # (Planned) Google OAuth callback
│   └── meeting/[id]/
│       ├── availability/       # (Planned) Availability voting page
│       └── results/            # (Planned) Meeting results page
├── providers/
│   └── LiffProvider.tsx        # LIFF SDK init, LINE login, JWT cookie exchange
├── hooks/
│   └── useLiff.ts              # Context hook: { user, isInitialized, isInClient, logout }
├── lib/
│   └── api.ts                  # ApiClient class (fetch wrapper, credentials: "include")
├── types/
│   └── meeting.ts              # TypeScript interfaces (User, Meeting, CreateMeetingRequest)
├── utils/
│   └── apiHeaders.ts           # API headers helper (auto-adds ngrok bypass header)
├── components/                 # (Planned) Extracted reusable components
│   ├── availability/
│   ├── common/
│   └── meeting/
└── middleware.ts               # Next.js middleware for ngrok handling
```

## Pages

### Home Dashboard (`/`)

- User profile display (avatar, name, LINE user ID)
- LIFF connection status (initialized, in-client, logged in, context type)
- Group ID extraction from LIFF context or URL params
- "Create New Meeting" button

### Meeting Creation (`/create`)

- Title, meeting type (meals/cafe/sports/others), duration
- Location mode: specify, decide later, or recommend (fetches from API)
- Date range calendar picker with month navigation and quick presets (1-4 weeks)
- Day preferences (weekdays/weekends/custom toggle)
- Time slot selection (pre-defined slots in GMT+7)
- Notes field
- Form validation and API submission

## Authentication Flow

1. `LiffProvider` initializes LIFF SDK and triggers LINE login
2. LIFF access token is exchanged with backend via `POST /users/auth/line-login`
3. Backend sets JWT as HttpOnly cookie (`access_token`)
4. All API calls use `credentials: "include"` — cookie sent automatically
5. Fallback: if backend is unavailable, uses LIFF profile directly

## API Client

`ApiClient` in `src/lib/api.ts` provides:

| Method | Endpoint | Description |
|---|---|---|
| `getMe()` | `GET /users/me` | Current user profile |
| `createMeeting(data)` | `POST /meetings` | Create a meeting |
| `getMeeting(id)` | `GET /meetings/:id` | Fetch meeting by ID |
| `getMeetingsByGroup(groupId)` | `GET /meetings/group/:groupId` | Meetings for a LINE group |
| `getLocations()` | `GET /locations` | Recommended locations |

## Scripts

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

## Key Conventions

- **Timezone:** All dates/times in GMT+7 (Asia/Bangkok). Dates as `YYYY-MM-DD`, time slots as `HH:MM`.
- **JSON mapping:** Backend sends snake_case; frontend types use camelCase. Map at the consumption point.
- **No custom navigation headers:** LIFF in LINE provides native back/close controls.
- **Ngrok:** `apiHeaders.ts` auto-adds `ngrok-skip-browser-warning: true` when the API URL contains "ngrok".
- **Cookie auth:** `credentials: "include"` on all fetch calls. No manual Authorization headers needed.

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set environment variables: `NEXT_PUBLIC_LIFF_ID`, `NEXT_PUBLIC_LINE_CHANNEL_ID`, `NEXT_PUBLIC_API_BASE_URL`
3. Update LIFF Endpoint URL in LINE Developers Console to the Vercel deployment URL

### Manual

```bash
npm run build
npm run start
```

## Troubleshooting

| Issue | Solution |
|---|---|
| LIFF initialization failed | Verify `NEXT_PUBLIC_LIFF_ID` in `.env.local`; check LIFF Endpoint URL matches deployment |
| Not running in LINE app | Expected in external browsers — open via `https://liff.line.me/YOUR-LIFF-ID` in LINE |
| User not logged in | Check LIFF app scopes (`profile`, `openid`); verify LIFF app is published |
| API calls failing | Ensure backend is running; check `NEXT_PUBLIC_API_BASE_URL`; verify CORS allows frontend origin |

## Resources

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack React Query](https://tanstack.com/query/latest)
