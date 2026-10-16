# Vercel Deployment Guide

## Environment Variables Setup

When deploying to Vercel, add these environment variables in your project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required:
- `VITE_GEMINI_API_KEY` = Your Gemini API key

### Optional (Firebase - only if you want to hide them):
- `VITE_FIREBASE_API_KEY` = Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` = Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` = Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` = Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` = Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` = Your Firebase app ID

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/macro-tracker-ai)

## Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Additional Security (Recommended)

### 1. Gemini API Key Restrictions
- Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Click on your API key
- Under "Application restrictions", select "HTTP referrers"
- Add your domain: `https://your-app.vercel.app/*`
- Add localhost for development: `http://localhost:*`

### 2. Firebase Security Rules
Already configured with user-specific access control in Firestore rules.

### 3. Gemini API Usage Limits
- Set up billing alerts in Google Cloud Console
- Monitor usage regularly
- The app has client-side rate limiting (3 seconds between requests)

## Notes
- The `.env` file is in `.gitignore` and won't be committed
- Firebase config can remain public (it's designed to be)
- **Only Gemini API key needs to be strictly private**

## Password reset

Forgot password uses Firebase Authentication's `sendPasswordResetEmail` and
Firebase's hosted password-reset page. It does not require EmailJS, an API route,
or Firestore reset documents. Firebase updates the existing account, preserving
its user ID and saved meals.

In the Firebase project used by the deployment, enable the Email/Password sign-in
provider. Under Authentication → Templates → Password reset, check the sender
and keep the default Firebase-hosted action URL unless you have implemented a
custom action handler. The app does not implement a custom reset action page.

After deploying, use a disposable registered account:

1. Save a custom meal, sign out, and choose Forgot password → Send Reset Link.
2. Open the email (check spam), follow the link, and choose a new password.
3. Sign in with the new password and verify the saved meal is still present.
4. Sign out and verify the old password fails and the used reset link cannot be
   reused. Perform this last to avoid disrupting a valid test session.

Run local regression checks with `node --test tests/*.test.js` and `npm run build`.
Mocked checks do not establish real email delivery or production Firebase setup.

Older versions wrote plaintext passwords to `password_resets` and `verifications`
documents under `artifacts/{appId}`. The updated client no longer writes those
passwords or uses stored reset passwords to sign in. Existing records are not
automatically deleted: remove legacy password fields/records through a trusted
admin process, review their Firestore access rules, and reset affected credentials
if they were accessible to unauthorized users. Never export these values to logs.
