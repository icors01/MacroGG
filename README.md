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

- Node.js (v16 or higher)
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
