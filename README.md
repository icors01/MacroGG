# Macro Tracker AI

A modern macro and calorie tracking application with AI-powered food entry and Firebase backend.

## Features

- 🤖 AI-powered food entry using Google Gemini
- 📊 Track calories, protein, carbs, and fat
- 🎯 Customizable daily goals
- 🔥 Real-time Firebase sync
- 💾 Custom meal templates
- 🔐 Email/password authentication
- 📱 Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 22.12+ (Node.js 24 recommended)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Update `src/config/firebase.js` with your Firebase configuration
   - Update the Gemini API key in `src/App.jsx`

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── modals/          # Modal components
│   └── ui/              # Reusable UI components
├── config/              # Firebase configuration
├── App.jsx              # Main application component
├── main.jsx             # Entry point
└── index.css            # Global styles
```

## Technologies

- React 18
- Vite
- Firebase (Auth & Firestore)
- Tailwind CSS
- Lucide React Icons
- Google Gemini API

## Preview the design locally

Use a recent Node version (Vite 7 requires Node 20.19+ or 22.12+; Node 24 works).
From a checkout containing the design changes:

```bash
npm ci
npm run dev
```

Open this address in the browser on the **same computer** running the command:

```text
http://localhost:5173/?demo
```

The development-only demo uses sample data in memory. Try adding and editing
entries, saving meal templates, adjusting goals, undo/redo, and the light/dark
switch. Refresh restores the samples. It does not import Firebase configuration,
send emails, call AI, access your camera, or update real accounts. The banner
identifies demo mode; it is excluded from production builds.

For the real app, omit `?demo` and configure `.env.local` using `.env.example`.
Use a separate Firebase test project or disposable test account: running locally
still accesses whichever Firebase project you configure. Plain Vite serves the
frontend; the real `/api` endpoints require a compatible serverless development
runtime such as Vercel CLI (`vercel dev`).

A server running in a cloud workspace is not your computer's localhost. For
browser testing without local tools, push a separate branch and use its Vercel
**Preview** deployment, with Preview-scoped environment variables. Keep the branch
unmerged until reviewed. Production deploys from your configured production
branch (normally `main`); confirm this under Vercel project settings.
