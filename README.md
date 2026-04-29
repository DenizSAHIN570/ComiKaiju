[![Netlify Status](https://api.netlify.com/api/v1/badges/5459d454-7f89-4ff9-aace-36678ab62782/deploy-status)](https://app.netlify.com/projects/comikaiju/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![Built with Svelte](https://img.shields.io/badge/Svelte-4E4E55?style=for-the-badge&logo=svelte&logoColor=FF3E00)
![Powered by Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
<!-- Replace <OWNER> and <REPO_NAME> with your GitHub username and repository name -->
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/DenizSAHIN570/OnlineComicReader/badge)](https://securityscorecards.dev/viewer/?uri=github.com/DenizSAHIN570/OnlineComicReader)

# ComiKaiju

ComiKaiju is a SvelteKit application for reading CBZ/CBR comics directly in your browser. It uses client-side web workers to quickly extract archives, allowing you to read your comics offline. Your library and reading progress are stored locally in your browser using IndexedDB.

This application does not host or distribute any comic book files. Users are solely responsible for the content they choose to open.

> [!NOTE]
> This is a pilot project to experiment with AI and see if it's viable to create at least semi-AI managed project reliably, hence it includes almost exclusively AI code, as well as AI automations.

## Features

- **Client-Side Archive Processing**: Extracts `.cbz`, `.zip`, `.cbr`, and `.rar` files directly in the browser.
- **Offline Library**: Stores comic files, metadata, and reading progress in IndexedDB for offline access.
- **Immersive Viewer**: A full-screen viewer with zoom, pan, and navigation controls that auto-hide.
- **Progress Tracking**: Automatically saves your current page and reading progress.
- **PWA Support**: Installable as a Progressive Web App for a native-like experience.
- **Image Filters**: Apply filters to pages like monochrome, vintage, etc.
- **Theming**: Light and Dark mode support.

## Key Technologies

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Archive Handling**: `libarchive.js`
- **Storage**: IndexedDB

## Project Structure

```
src/
├── lib/
│   ├── archive/        # Handles archive extraction using libarchive.js
│   ├── services/       # Core business logic
│   ├── storage/        # Manages IndexedDB for storing comic files and metadata
│   ├── store/          # Svelte stores for managing session state
│   └── ui/             # Reusable UI components like the Viewer
├── routes/
│   ├── +page.svelte    # Home page with file uploader and recent comics
│   ├── reader/         # The main comic reading interface
│   └── library/        # View and manage all stored comics
└── types/              # TypeScript interfaces for the application
```

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, start the development server:

```bash.
npm run dev
```

Open your browser and navigate to `http://localhost:5173`. You can upload a comic by dragging and dropping a file or by clicking the upload area.

## Building for Production

To create a production version of the app, run:

```bash
npm run build
```

This will create a `build/` directory with the static files needed for deployment.
