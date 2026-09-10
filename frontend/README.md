# ChatApp Frontend (Next.js 16)

The modern, mobile-first responsive frontend for ChatApp, built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and the native **Web Crypto API**.

## Features

- **Mobile Responsive**: Adaptive navigation (single-screen on mobile with back button, dual-pane on desktop).
- **End-to-End Encryption**: Hardware-accelerated client-side ECDH (P-256) and AES-GCM (256-bit) encryption.
- **IndexedDB**: Secure local key persistence without server transmission.
- **Real-Time Presence**: Live online/offline status with Socket.io.
- **Dark Mode**: Sleek dark aesthetic designed for messaging comfort.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Server
Make sure the Express backend is running on port 5000 (`npm run server` from the root directory).
Then start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

## Directory Structure

- `app/`: Next.js App Router pages (`/`, `/login`, `/register`).
- `components/`: Modular UI components (`Navbar`, `ContactList`, `ChatArea`, `DeleteModal`).
- `lib/`:
  - `e2ee.ts`: Web Crypto API E2EE cryptographic engine with IndexedDB storage.
  - `socket.ts`: Socket.io client connector for `/users-namespace`.
  - `api.ts`: Typed fetch helpers for backend REST APIs.
- `public/`: Static image assets and fallback avatars.
