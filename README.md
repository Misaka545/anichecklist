# Ayame - Personal Collection Tracker

A personal anime and manga tracker built with React and Firebase. Track your watching/reading progress, manage your collection, and get random recommendations from your list.

## Features

- Add anime and manga entries with cover images, progress, and ratings
- Real-time sync with Firebase Firestore (with offline persistence)
- Dashboard with stats and a discovery/recommendation shuffle
- Collection view with search, filters, and sorting
- Export/import collection as JSON backup
- Dark and light theme toggle
- PWA support with service worker for offline use
- Image compression for cover uploads

## Tech Stack

- React 19
- Vite 8
- Firebase Firestore (with persistent local cache)
- Vanilla CSS
- Deployed on Vercel

## Setup

1. Clone the repository:

```bash
git clone 
cd todolist
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root with your Firebase config:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Or pull env variables directly from Vercel:

```bash
npx vercel link
npx vercel env pull .env
```

4. Start the development server:

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  App.jsx              Main application component
  main.jsx             Entry point with PWA registration
  index.css            Global styles and design tokens
  App.css              App-specific styles
  lib/
    firebase.js        Firebase initialization and Firestore config
  components/
    EntryForm.jsx      Form for adding new entries
    TrackerItem.jsx     Individual tracker item card
    WindowFrame.jsx     Reusable card wrapper component
  utils/
    imageCompressor.js  Client-side image compression utility
public/
  sw.js                Service worker
  manifest.webmanifest PWA manifest
  favicon.svg          App icon
```

## License

Private project.
