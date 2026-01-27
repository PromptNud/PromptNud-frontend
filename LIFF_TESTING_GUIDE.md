# LIFF Connection Testing Guide

This guide will help you test the LINE LIFF integration without a backend server.

---

## Prerequisites

1. **LINE Developer Account**
   - Go to https://developers.line.biz/console/
   - Login with your LINE account

2. **Create a LINE Channel** (if not already done)
   - Create a new Provider (or use existing)
   - Create a Messaging API Channel
   - Note down your Channel ID

3. **Create a LIFF App**
   - Go to your channel → LIFF tab
   - Click "Add" to create a new LIFF app
   - Configure the LIFF app settings (details below)

---

## Step 1: Configure Environment Variables

Update your `.env.local` file:

```bash
# LIFF Configuration
NEXT_PUBLIC_LIFF_ID=your_liff_id_here
NEXT_PUBLIC_LINE_CHANNEL_ID=your_line_channel_id

# API Configuration (not needed for LIFF-only testing)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

**Important:** Replace `your_liff_id_here` with your actual LIFF ID from LINE Developers Console.

---

## Step 2: LIFF App Configuration

When creating/editing your LIFF app in LINE Developers Console:

### Basic Settings
- **LIFF app name**: Meeting Scheduler (or any name you prefer)
- **Size**: Full
- **Endpoint URL**: Your app URL (see options below)

### Scopes (Required)
Select the following scopes:
- ✅ `profile` - To get user profile information
- ✅ `openid` - For authentication

### Optional Scopes (for future features)
- `chat_message.write` - To send messages to LINE chat

### Bot Link Feature
- Link to: (select your Messaging API bot if available)

---

## Step 3: Deploy Your App

You have two options for testing:

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add `NEXT_PUBLIC_LIFF_ID` and `NEXT_PUBLIC_LINE_CHANNEL_ID`
   - Redeploy after adding environment variables

4. **Copy the deployment URL**
   - Example: `https://your-app-name.vercel.app`

5. **Update LIFF Endpoint URL**
   - Go to LINE Developers Console → LIFF tab
   - Edit your LIFF app
   - Set Endpoint URL to your Vercel URL
   - Save

### Option B: Use ngrok for Local Testing

1. **Install ngrok**
   ```bash
   npm install -g ngrok
   ```

2. **Start your Next.js dev server**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL**
   - Example: `https://abc123.ngrok-free.app`

5. **Update LIFF Endpoint URL**
   - Go to LINE Developers Console → LIFF tab
   - Edit your LIFF app
   - Set Endpoint URL to your ngrok URL
   - Save

---

## Step 4: Get Your LIFF URL

After configuring your LIFF app:

1. Go to LINE Developers Console → Your Channel → LIFF tab
2. Copy the LIFF URL (format: `https://liff.line.me/YOUR-LIFF-ID`)
3. This is the URL you'll use to open your app

---

## Step 5: Test the LIFF Connection

### Test 1: Open in External Browser
1. Open your LIFF URL in a regular browser (Chrome, Safari, etc.)
2. You should see:
   - ⚠️ Warning: "Not running in LINE app"
   - Connection status showing "External Browser"
3. This confirms your app is loading correctly

### Test 2: Open in LINE App (Main Test)
1. **Send the LIFF URL to yourself in LINE**
   - Open LINE app
   - Go to any chat (or your "Saved Messages")
   - Send the LIFF URL as a message
   - Tap the link

2. **What you should see:**
   - Loading spinner briefly
   - LINE login prompt (if first time)
   - Your profile picture and name
   - Connection status:
     - ✓ LIFF Initialized: Yes
     - ✓ Running in LINE: Yes
     - ✓ User Logged In: Yes
     - Context Type: utou (1-on-1 chat)

### Test 3: Open from LINE Group (Optional)
1. Create a test LINE group (or use existing)
2. Send the LIFF URL in the group chat
3. Tap the link
4. You should see:
   - All the same as Test 2
   - Context Type: group
   - Group ID displayed
   - ✓ "Successfully connected from LINE group chat!" message

---

## What Each Status Means

### LIFF Initialized
- **✓ Yes**: LIFF SDK loaded successfully
- **✗ No**: LIFF failed to initialize (check LIFF ID in .env.local)

### Running in LINE
- **✓ Yes**: App is opened in LINE app
- **⚠ External Browser**: App is opened in regular browser (limited features)

### User Logged In
- **✓ Yes**: User authenticated via LINE
- **✗ No**: Authentication failed (check LIFF scopes)

### Context Type
- **utou**: Opened from 1-on-1 chat
- **group**: Opened from group chat
- **room**: Opened from multi-person chat (not group)
- **none**: Opened from external browser

---

## Troubleshooting

### "LIFF initialization failed"
**Possible causes:**
- LIFF ID is incorrect or not set
- Endpoint URL doesn't match your deployment
- LIFF app is not published/enabled

**Solutions:**
1. Verify LIFF ID in `.env.local` matches LINE Developers Console
2. Check browser console for detailed error messages
3. Ensure Endpoint URL in LIFF settings matches your deployment URL

### "Not logged in" even in LINE app
**Possible causes:**
- Missing required scopes (`profile`, `openid`)
- User denied permissions

**Solutions:**
1. Check LIFF app scopes in LINE Developers Console
2. Delete and recreate the LIFF app with correct scopes
3. Clear LINE cache and try again

### LIFF URL doesn't open anything
**Possible causes:**
- LIFF app is not published
- Endpoint URL is incorrect

**Solutions:**
1. Ensure LIFF app status is "Published" (not Draft)
2. Verify Endpoint URL is accessible (test in browser)
3. Check for HTTPS (required for LIFF)

### "External Browser" warning in LINE app
**This is actually correct behavior if:**
- You opened the link from a desktop LINE client
- You're in LINE LIFF Inspector

**Not correct if:**
- You're in LINE mobile app → Check if your phone's LINE app is updated

---

## Viewing Debug Logs

Open your browser's developer console to see detailed LIFF logs:

**On Desktop Browser:**
- Chrome/Edge: Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
- Safari: Enable Developer Menu → Develop → Show Web Inspector

**On Mobile LINE App:**
1. Use LINE's LIFF Inspector: https://liff.line.me/inspector
2. Enter your LIFF URL
3. View console logs in the inspector

**Expected console logs:**
```
Initializing LIFF...
LIFF initialized successfully
Is logged in: true
Is in client: true
User profile: { userId: "U...", displayName: "...", pictureUrl: "..." }
```

---

## Success Criteria

Your LIFF integration is working correctly if:

1. ✅ App loads without errors in LINE app
2. ✅ User profile (name and picture) is displayed
3. ✅ "Running in LINE: ✓ Yes" status shows when opened in LINE app
4. ✅ Group ID appears when opened from a group chat
5. ✅ No console errors related to LIFF

---

## Next Steps

Once LIFF connection is verified:

1. ✅ LIFF authentication is working
2. ⏭️ Implement backend API
3. ⏭️ Add JWT token exchange
4. ⏭️ Build meeting creation features
5. ⏭️ Integrate AI suggestions

---

## Useful Resources

- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/overview/)
- [LIFF API Reference](https://developers.line.biz/en/reference/liff/)
- [LINE Developers Console](https://developers.line.biz/console/)
- [LIFF Inspector Tool](https://liff.line.me/inspector)

---

## Need Help?

If you're still having issues:

1. Check the browser console for error messages
2. Verify all settings in LINE Developers Console
3. Test with the LIFF Inspector first
4. Make sure your deployment URL is accessible via HTTPS
