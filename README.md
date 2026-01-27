# Meeting Scheduler - Frontend (LIFF App)

AI-powered meeting scheduling assistant for LINE groups. This is the frontend LIFF application that runs inside the LINE messaging app.

## Current Status: LIFF-Only Testing Phase ✅

This app is currently configured to test LINE LIFF connection **without requiring a backend server**. This allows you to verify the LIFF integration before implementing the backend API.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```bash
# LIFF Configuration (Required for testing)
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id

# Backend API (Not needed for LIFF-only testing)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### 4. Deploy for Testing

You need to deploy to test with LIFF (localhost won't work in LINE app):

**Option A: Vercel (Recommended)**
```bash
npm install -g vercel
vercel
```

**Option B: ngrok**
```bash
npm install -g ngrok
ngrok http 3000
```

### 5. Configure LINE LIFF

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create/edit your LIFF app
3. Set Endpoint URL to your deployment URL
4. Enable scopes: `profile`, `openid`
5. Copy your LIFF ID to `.env.local`

### 6. Test in LINE App

1. Get your LIFF URL: `https://liff.line.me/YOUR-LIFF-ID`
2. Send it to yourself in LINE
3. Tap the link to open the app
4. You should see your profile and connection status

---

## 📚 Documentation

- **[LIFF Testing Guide](./LIFF_TESTING_GUIDE.md)** - Complete instructions for testing LIFF connection
- **[Frontend Setup Guide](./FRONTEND_SETUP_GUIDE.md)** - Full setup instructions from scratch
- **[Changes for LIFF-Only](./CHANGES_FOR_LIFF_ONLY.md)** - What was modified for LIFF-only testing
- **[Tech Spec](./ai-scheduling-assistant-tech-spec.md)** - Complete technical specification

---

## What Works Now

✅ **LIFF Connection Features:**
- LINE LIFF initialization and login
- User authentication via LINE
- User profile display (name, picture, User ID)
- Context detection (1-on-1 chat vs group chat)
- Group ID extraction (when opened from groups)
- In-client detection (LINE app vs external browser)
- Logout functionality

❌ **Not Implemented Yet (Requires Backend):**
- Creating meetings
- Storing user data
- Meeting list
- Availability tracking
- AI suggestions

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with LIFF provider
│   ├── page.tsx            # Home page with LIFF status
│   └── providers.tsx       # React Query provider
├── components/             # UI components (to be added)
├── hooks/
│   └── useLiff.ts          # LIFF context hook
├── lib/
│   └── api.ts              # API client (ready for backend)
├── providers/
│   └── LiffProvider.tsx    # LIFF initialization & auth
├── types/
│   └── meeting.ts          # TypeScript types
└── utils/
    └── apiHeaders.ts       # API utilities (ready for backend)
```

---

## Tech Stack

- **Framework:** Next.js 15.x with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **LIFF SDK:** @line/liff 2.25+
- **State Management:** React Query + Zustand
- **Date Handling:** date-fns

---

## Scripts

```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

---

## LIFF Connection Status Indicators

The home page shows these status indicators:

| Indicator | Meaning |
|-----------|---------|
| ✓ LIFF Initialized | LIFF SDK loaded successfully |
| ✓ Running in LINE | App opened in LINE app (not external browser) |
| ✓ User Logged In | User authenticated via LINE |
| Context Type | utou (1-on-1), group, room, or none |

---

## Troubleshooting

### "LIFF initialization failed"
- Check LIFF ID in `.env.local`
- Verify Endpoint URL matches deployment
- Check browser console for errors

### "Not running in LINE app"
- This is expected in external browser
- Open the LIFF URL in LINE mobile app instead
- Test with [LIFF Inspector](https://liff.line.me/inspector)

### "User not logged in"
- Check LIFF app scopes (need `profile`, `openid`)
- Clear LINE cache and try again
- Verify LIFF app is published

For more troubleshooting, see [LIFF Testing Guide](./LIFF_TESTING_GUIDE.md).

---

## Next Steps

1. ✅ Verify LIFF connection (current phase)
2. ⏭️ Implement backend API server
3. ⏭️ Add JWT token exchange to LiffProvider
4. ⏭️ Build meeting creation UI
5. ⏭️ Implement availability features
6. ⏭️ Add Google Calendar sync
7. ⏭️ Integrate AI suggestions

---

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_LIFF_ID`
   - `NEXT_PUBLIC_LINE_CHANNEL_ID`
3. Deploy automatically on push to main

### Manual Deployment

```bash
npm run build
npm run start
```

---

## Resources

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [LINE Developers Console](https://developers.line.biz/console/)

---

## Contributing

This is part of the AI Scheduling Assistant project. See the main technical spec for architecture details and development guidelines.

---

## License

[Your License Here]
