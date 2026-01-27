# LIFF Testing Checklist

Use this checklist to verify your LIFF connection step by step.

---

## ✅ Pre-Testing Setup

### LINE Developers Console Setup
- [ ] Created LINE Developer account
- [ ] Created a Messaging API channel
- [ ] Created a LIFF app
- [ ] Noted down LIFF ID
- [ ] Noted down Channel ID
- [ ] Set LIFF app size to "Full"
- [ ] Enabled `profile` scope
- [ ] Enabled `openid` scope
- [ ] LIFF app status is "Published" (not Draft)

### Environment Configuration
- [ ] Created `.env.local` file
- [ ] Set `NEXT_PUBLIC_LIFF_ID`
- [ ] Set `NEXT_PUBLIC_LINE_CHANNEL_ID`
- [ ] Values match LINE Developers Console exactly

### Code Setup
- [ ] Ran `npm install` successfully
- [ ] Ran `npm run build` successfully (no errors)
- [ ] All files from Step 6-7 are in place

---

## 🚀 Deployment

Choose one deployment method:

### Option A: Vercel
- [ ] Installed Vercel CLI (`npm install -g vercel`)
- [ ] Ran `vercel` command
- [ ] Copied deployment URL (e.g., `https://your-app.vercel.app`)
- [ ] Set environment variables in Vercel dashboard
- [ ] Redeployed after setting env vars

### Option B: ngrok
- [ ] Installed ngrok (`npm install -g ngrok`)
- [ ] Started dev server (`npm run dev`)
- [ ] Started ngrok (`ngrok http 3000`)
- [ ] Copied HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### LIFF Endpoint Configuration
- [ ] Updated LIFF app Endpoint URL in LINE Console
- [ ] Endpoint URL matches deployment URL exactly
- [ ] Endpoint URL uses HTTPS (not HTTP)
- [ ] Saved changes in LINE Console

---

## 🧪 Testing

### Test 1: Browser Test (Preliminary)
- [ ] Opened deployment URL in Chrome/Safari
- [ ] Page loads without errors
- [ ] See "Meeting Scheduler" title
- [ ] See warning: "Not running in LINE app"
- [ ] Connection status shows "External Browser"

### Test 2: LIFF Inspector Test
- [ ] Go to https://liff.line.me/inspector
- [ ] Enter your LIFF URL: `https://liff.line.me/YOUR-LIFF-ID`
- [ ] Click "Open"
- [ ] Login when prompted
- [ ] App loads successfully
- [ ] Can see user profile
- [ ] No errors in console

### Test 3: LINE App Test (Main Test)
- [ ] Open LINE mobile app
- [ ] Send LIFF URL to yourself (or Saved Messages)
  - Format: `https://liff.line.me/YOUR-LIFF-ID`
- [ ] Tap the link
- [ ] See loading spinner
- [ ] LINE login prompt appears (if first time)
- [ ] Allow permissions when prompted

**Expected Results:**
- [ ] See your profile picture
- [ ] See your display name
- [ ] See your User ID
- [ ] Status: "✓ LIFF Initialized: Yes"
- [ ] Status: "✓ Running in LINE: Yes"
- [ ] Status: "✓ User Logged In: Yes"
- [ ] Context Type shows "utou" (for 1-on-1 chat)

### Test 4: LINE Group Test (Optional)
- [ ] Create or open a LINE group
- [ ] Send LIFF URL in group chat
- [ ] Tap the link
- [ ] App opens successfully

**Expected Results:**
- [ ] Same as Test 3, plus:
- [ ] Context Type shows "group"
- [ ] Group ID is displayed
- [ ] Message: "✓ Successfully connected from LINE group chat!"

---

## 🔍 Console Logs Verification

Open browser console (in LIFF Inspector or mobile debugging):

**Expected logs:**
```
✓ Initializing LIFF...
✓ LIFF initialized successfully
✓ Is logged in: true
✓ Is in client: true
✓ User profile: { userId: "U...", displayName: "...", pictureUrl: "..." }
```

**No errors should appear** (especially no LIFF initialization errors)

---

## 📱 Visual Verification

The home page should show:

### Header Section
- [ ] "📅 Meeting Scheduler" title
- [ ] Your profile picture (circular)
- [ ] "Welcome, [Your Name]!" message
- [ ] Your User ID

### Connection Status Card
- [ ] White card with "🔌 LIFF Connection Status" title
- [ ] All four status items displayed:
  - LIFF Initialized
  - Running in LINE
  - User Logged In
  - Context Type
- [ ] Green checkmarks (✓) for all statuses
- [ ] Group ID shown (if opened from group)

### Info Box
- [ ] Blue info box with helpful message
- [ ] Message changes based on context:
  - External browser → warning
  - LINE app, no group → "Open from group"
  - LINE app, from group → success message

### Button
- [ ] "Create New Meeting (Demo)" button
- [ ] Orange/white styling
- [ ] Button is clickable (though route doesn't exist yet)

---

## ❌ Troubleshooting Checklist

If tests fail, check these:

### LIFF won't initialize
- [ ] LIFF ID is correct (check `.env.local`)
- [ ] Endpoint URL matches deployment exactly
- [ ] LIFF app is published (not draft)
- [ ] Using HTTPS for endpoint (not HTTP)
- [ ] No typos in LIFF ID

### User not logged in
- [ ] `profile` scope is enabled
- [ ] `openid` scope is enabled
- [ ] Accepted permissions in LINE
- [ ] Try clearing LINE cache

### "Not running in LINE" even in LINE app
- [ ] Actually opened in LINE mobile app (not desktop)
- [ ] Not using LINE LIFF Inspector (shows as external)
- [ ] LINE app is updated to latest version

### Page doesn't load
- [ ] Deployment is successful
- [ ] Deployment URL is accessible
- [ ] Check deployment logs for errors
- [ ] Environment variables are set

### Console shows errors
- [ ] Read error message carefully
- [ ] Check if LIFF ID is missing
- [ ] Verify all package dependencies installed
- [ ] Check Next.js build completed successfully

---

## ✅ Success Criteria

Your LIFF integration is working if:

1. **All green checkmarks** in Connection Status card
2. **Profile displays correctly** with picture and name
3. **No console errors** related to LIFF
4. **Context detection works** (shows "utou" or "group")
5. **Group ID appears** when opened from group (if testing groups)

---

## 📸 Screenshot Verification

Take screenshots of:
- [ ] Home page in LINE app (showing your profile)
- [ ] Connection Status card (with green checkmarks)
- [ ] Group context (if testing with group)
- [ ] Browser console (showing successful logs)

---

## 🎉 Next Steps After Successful Testing

Once all tests pass:

1. ✅ LIFF connection verified and working
2. ⏭️ You can now proceed with backend implementation
3. ⏭️ Or continue building frontend features
4. ⏭️ Save your LIFF URL for future testing

---

## 📝 Test Results

Document your results:

**Test Date:** ___________

**Deployment Method:** [ ] Vercel  [ ] ngrok

**Deployment URL:** _________________________________

**LIFF URL:** _________________________________

**Test Environment:**
- [ ] LINE iOS app version: _______
- [ ] LINE Android app version: _______
- [ ] Browser (for inspector): _______

**Tests Passed:**
- [ ] Test 1: Browser Test
- [ ] Test 2: LIFF Inspector Test
- [ ] Test 3: LINE App Test
- [ ] Test 4: LINE Group Test (optional)

**Issues Found:** (if any)
_________________________________________________
_________________________________________________

**Status:** [ ] All tests passed  [ ] Some issues found

---

## 🆘 Need Help?

If you're stuck:

1. Check browser console for error messages
2. Review [LIFF Testing Guide](./LIFF_TESTING_GUIDE.md)
3. Verify all settings in LINE Developers Console
4. Test with LIFF Inspector first
5. Check deployment logs
6. Verify environment variables are set correctly

Common mistakes:
- Wrong LIFF ID
- Endpoint URL doesn't match deployment
- Missing required scopes
- LIFF app not published
- Using HTTP instead of HTTPS
