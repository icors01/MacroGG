# MacroGG

A responsive nutrition journal for tracking calories, protein, carbs, and fat. Built with React 18, Vite 7, Firebase, Tailwind CSS, and Lucide icons, with Google Gemini for food estimates and Open Food Facts for barcode lookups.

## Features

- Describe a meal for an AI estimate, enter macros manually, or scan a barcode.
- Press **Enter** to submit a food description; **Shift+Enter** adds a new line.
- Set daily goals and optionally track carbs and fat. Unused manual-entry macros default to zero.
- Save reusable meals, edit their portions, and pin up to **three** for one-tap logging.
- Use **Quick add** below food entry: pinned meals appear first, followed by up to three recommendations. Matching cards share the same styling; a small corner pin identifies saved choices.
- Review daily logs and history, track streaks, and undo or redo log changes, including clearing today's entries.
- Choose from six named color schemes with light/dark appearances and a reversible live preview in Settings.
- Sync logs, goals, saved meals, and pin selections to the signed-in Firebase account.
- Sign in with email/password and request a Firebase password-reset link.

## Run locally

Use Node.js **22.12+** (Node 24 recommended) and npm. In your local repository terminal:

```bash
npm ci
npm run dev
```

### Sample-data preview — no credentials needed

Open `http://localhost:5173/?demo` in a browser on the same computer running the server.

The development-only demo supports entry, saved meals, pins, recommendations, goals, settings, and undo/redo with sample data held in memory. Refreshing restores the samples. It does not import Firebase configuration, call AI, send emails, or access the camera. The demo is excluded from production builds.

If startup fails, the recovery screen offers a demo link when running in development. A cloud workspace's localhost is separate from your computer's localhost.

### Real app

1. Copy `.env.example` to `.env.local` and fill in your Firebase configuration.
2. Enable the Firebase Authentication providers you use, including Email/Password. Anonymous authentication supports guest sessions.
3. Configure Firestore rules so each authenticated user can read and write their own settings and daily logs, including querying their own `logs` collection.
4. Set `GEMINI_API_KEY` for AI entry. `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
5. Open the app without `?demo`.

`VITE_FIREBASE_*` values are browser configuration. Keep `GEMINI_API_KEY` server-side, without a `VITE_` prefix. Never commit `.env.local`.

Plain `npm run dev` serves the frontend. To run the `/api` functions locally too, use the Vercel CLI:

```bash
npx vercel dev
```

Use the address printed by that command. The current signup verification flow uses the EmailJS configuration in `AuthModal.jsx`; the separate `/api/send-email` endpoint reads `EMAILJS_*` server environment variables listed in `.env.example`. Password resets use Firebase Authentication's hosted reset page rather than EmailJS codes.

Local development still accesses whichever Firebase project you configure. Use a test project or test account when exercising the real app.

## Pinned meals and recommendations

Open **Manage saved meals** and select the pin icon beside a meal. Up to three pins are saved in selection order. Unpin a meal to free a slot; pinning another appends it to the row. Editing a saved meal updates its pinned card, and deleting it removes its pin. One tap on a card logs its macros; Undo can remove the added entry.

Recommendations become eligible after the same food and portion are logged on **at least two different days within the last 30 local calendar days**. Each distinct day contributes to ranking, with a 14-day recency half-life. Repeated logs on one day increase the displayed count but do not increase that day's ranking weight. Different macro values remain separate portions.

Pinned matches are excluded before selecting the top three recommendations. Both appear in one horizontally scrolling Quick add row, with equally sized cards and pins first. If neither is available, the row stays hidden.

Recommendations use a live, date-bounded query of existing logs. There is no AI training call or separate learning collection. Edits, deletion, and undo update suggestions; pending log writes count once acknowledged. The date window refreshes when the app regains focus and checks for a new day every 30 seconds. A history-read failure hides recommendations without blocking food entry.

## Data storage

Firestore stores account data under:

```text
artifacts/{appId}/users/{uid}/settings/preferences
artifacts/{appId}/users/{uid}/logs/{YYYY-MM-DD}
```

The default application namespace is `default-app-id`. Settings include saved meal templates and ordered `pinnedMealIds`; logs hold daily entries. Missing local/cache settings snapshots never write empty defaults over saved meals. Initialization and legacy migration use server-backed transactions. Pin changes also use transactions to enforce the three-pin limit against current settings.

## Test and build

```bash
node --test tests/*.test.js
npm run build
npm run preview
```

The test suite covers settings preservation, password-reset requests, palette contrast, recommendation ranking, and pin selection/exclusion. `npm run preview` serves the production frontend build; it does not provide the `/api` backend or the development demo.

Live Firebase permissions, email delivery, and camera access should also be checked with a test account in a configured Preview deployment.

## GitHub and Vercel workflow

This is one project with multiple branches:

- **`design/nutrition-journal`** contains the journal design and feature work.
- **`main`** is the mainline. Merging and pushing to it triggers production deployment when Vercel is configured to deploy that branch.

For future changes, push a feature branch and test its Vercel **Preview** deployment before merging. Configure environment variables for the intended Vercel environment; a Preview using production Firebase credentials still accesses production data. Confirm the production branch in Vercel project settings, and check the deployment's commit SHA to verify which code is live.

## Project structure

```text
api/                       # Serverless AI and email endpoints
src/
  components/
    modals/                # Forms, settings, history, scanner, and account dialogs
    ui/                    # Shared dialog shell, icons, and progress indicators
    Dashboard.jsx          # Journal layout shared by the app and demo
  config/firebase.js       # Firebase initialization from environment configuration
  hooks/                   # Live recommendation history and journal-date updates
  utils/                   # Palettes, settings migration, reset links, pins, and ranking
  App.jsx                  # Authentication, Firestore sync, and journal actions
  DemoApp.jsx              # Isolated sample-data preview
  main.jsx                 # Startup recovery and development demo selection
  index.css                # Shared typography, themes, and responsive styles
tests/                     # Node test suite
```

## Updates — October 16, 2026

- Refreshed the nutrition journal layout and standardized popup typography, controls, and palette styling.
- Added six named palettes with live previews, neutral entry-field focus, and optional macros defaulting to zero.
- Added history-based recommendations and persistent pinned meals in a shared Quick add row, with pinned cards first and corner pin indicators.
- Enabled Enter to submit food descriptions, retained Shift+Enter for new lines, and removed the resize handle and unused-macro helper text.
- Added an isolated local demo and startup recovery screen, plus matching in-app reset confirmation.
