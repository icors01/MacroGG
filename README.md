# MacroGG

A simple nutrition journal for tracking calories, protein, carbs, and fat.

## What you can do

- **Log food your way:** describe a meal for an AI estimate, enter macros manually, or scan a barcode or nutrition label.
- **Save your favorites:** browse, add, and edit meals in an expandable sidebar panel; pin up to three for one-tap logging.
- **Get recommendations:** Quick add suggests foods you log regularly, with your pinned meals first.
- **Track your progress:** set daily goals, get help estimating targets, browse past logs, and undo or redo changes.
- **Make it yours:** choose from six color schemes with light/dark modes and live previews.
- **Keep your data synced:** sign in to save meals, goals, and logs across devices. Password resets use an emailed link.

**Entry shortcuts:** Enter submits your food description. Shift+Enter adds a new line. Unused manual-entry macros default to zero.

## Try it locally

Requires **Node.js 22.12+** (Node 24 recommended) and npm. Run these commands in the project folder:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/?demo` on the same computer.

The demo uses sample data, needs no credentials, and resets when refreshed. It makes no Firebase, AI, email, or camera requests. It is available only during development.

## Run the connected app

1. Copy `.env.example` to `.env.local` and add your Firebase settings and `GEMINI_API_KEY`.
2. Enable Firebase Email/Password authentication; enable Anonymous authentication for guest sessions.
3. Set Firestore rules to allow users to access only their own settings and logs, including log queries.
4. Run `npx vercel dev` to serve the frontend and API routes. Open the address it prints, without `?demo`.

Use a Firebase test project for development. Keep `.env.local` out of Git and keep the Gemini key server-side—never prefix it with `VITE_`.

Signup verification currently uses the EmailJS configuration in `src/components/modals/AuthModal.jsx`. The separate `/api/send-email` endpoint uses the `EMAILJS_*` variables in `.env.example`.

## Get help setting goals

Open **Goals → Help me set my goals**. Enter your measurements, activity, and goal—or provide your own maintenance estimate. Review and edit the suggested calories and macros, then select **Apply goals** to save. Canceling keeps your current goals.

Calculations use Mifflin–St Jeor and conservative calorie adjustments. An optional Gemini explanation describes the starting calculation; it cannot change your targets. Body metrics stay in the dialog and are not sent to Gemini or saved. The local demo offers a sample explanation without an AI request.

## Scan a barcode or nutrition label

Open **Scan food**. The camera detects barcodes automatically; use **Read nutrition label** to photograph the panel, or upload a JPEG, PNG, or WebP photo. If a barcode is missing from the database, read its label instead.

Both methods open the same review form. Check the meal name, macros, portion basis, and amount eaten, then confirm before adding. Unreadable values stay blank for you to fill in. You can also combine several reviewed items into one meal and save it from the food log.

Label photos are sent to Google Gemini for transcription using the server-side `GEMINI_API_KEY`. The app does not save the photos to Firestore. In the local demo, **Scan food** offers sample barcode and label reviews without camera access or AI requests.

## How Quick add works

- **Pinned meals:** expand **Saved meals** in the sidebar and tap a meal's pin icon. Up to three stay in your chosen order, marked with a small corner pin.
- **Recommendations:** appear after the same food and portion are logged on at least two different days within the last 30 days. More frequent and recent days rank higher.
- **No duplicates:** pinned matches are hidden from recommendations. Tap any card to log it; use Undo to reverse the addition.

## Quieter feedback

Routine actions show a small, non-blocking message near the bottom of the screen. Adds, deletions, and clearing entries offer **Undo**. Saved meals use the same bottom toast. Form errors appear inside the current dialog; failed saves preserve the draft. All success messages, including Undo notifications, dismiss after two seconds. Toast dismissal pauses while hovered or focused; inline confirmations fade out. Errors stay visible until resolved or dismissed. Clearing entries still requires confirmation.

## Test and build

```bash
node --test tests/*.test.js
npm run build
npm run preview
```

`npm run preview` serves the production frontend locally. It does not run API routes or the sample-data demo.

## Deploy with Vercel

Push changes to a feature branch to test a **Preview** deployment. Merge into `main` when ready for production, and confirm Vercel's production branch is set to `main`.

Set environment variables for each Vercel environment. Preview deployments still use whichever Firebase project those variables point to. Check the deployment's commit SHA to confirm which version is live.

## Built with

React · Vite · Firebase Auth & Firestore · Tailwind CSS · Google Gemini · Open Food Facts

## Latest updates — October 16, 2026

Refreshed the journal and dialogs, added named palettes and a local demo, introduced recommendations and pinned meals, and improved keyboard food entry.
