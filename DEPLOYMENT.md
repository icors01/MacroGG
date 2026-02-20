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
