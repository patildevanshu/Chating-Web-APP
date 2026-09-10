# 🔒 ChatApp - End-to-End Encrypted Real-Time Web Application

A modern, full-stack real-time messaging web application featuring **client-side End-to-End Encryption (E2EE)** with **ECDH (NIST P-256)** and **AES-GCM (256-bit)**, a **mobile-first responsive Next.js 16 (App Router)** frontend, and an **Express + Socket.io + MongoDB** backend.

---

## 🌟 Key Features

- **🔐 True End-to-End Encryption (E2EE)**:
  - Powered by the native **Web Crypto API** (`window.crypto.subtle`) with zero external crypto dependencies.
  - Asymmetric key agreement using **ECDH (NIST P-256)**.
  - Authenticated symmetric message encryption using **AES-GCM (256-bit)** with unique cryptographically random 12-byte IVs.
  - Private keys are persisted exclusively in the client's browser **IndexedDB** (`ChatApp_E2EE_Keys`) and **never touch the server**.
  - Zero-knowledge message storage: The server and database store only encrypted ciphertext and IVs.

- **📱 Fully Mobile Responsive**:
  - **Mobile Smartphones (< 768px)**: Seamless single-screen view. Displays the full contacts list; tapping a contact opens full-screen chat with a top `← Back` navigation button. Keyboard-aware layout (`100dvh`).
  - **Tablet & Desktop (>= 768px)**: Dual-pane layout with searchable contact sidebar on the left and active conversation panel on the right.

- **⚡ Real-Time Socket.io Integration**:
  - Private user rooms (`user_<id>`) for secure, targeted message routing (no eavesdropping or global broadcast).
  - Live online and offline status detection with dynamic status indicators.
  - Instant encrypted message dispatch and real-time deletion for everyone.

- **👤 Complete Authentication & Profile Management**:
  - Secure password hashing with **Bcrypt**.
  - Avatar image upload support via **Multer** with SVG fallback.
  - Session management with CORS support for decoupled frontends.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Real-Time Client**: `socket.io-client`
- **Crypto & Storage**: Web Crypto API (`window.crypto.subtle`) & IndexedDB

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express.js
- **Real-Time Engine**: Socket.io
- **Database**: MongoDB with Mongoose ORM
- **Security & Auth**: Bcrypt, Express-Session, CORS, Dotenv
- **File Uploads**: Multer

---

## 📁 Repository Structure

```text
Chating-Web-APP/
├── app.js                     # Express server & Socket.io configuration
├── package.json               # Backend dependencies & orchestration scripts
├── .env                       # Environment variables
├── controllers/
│   └── userController.js      # REST API & session controllers
├── routes/
│   └── userRoute.js           # Express API & static routing
├── models/
│   ├── user.js                # User schema (profile, online status, public key)
│   └── chat.js                # Chat schema (sender, receiver, ciphertext, iv)
├── middlewares/
│   └── auth.js                # Authentication protection middleware
├── public/
│   └── images/                # Stored user profile avatars & default SVGs
└── frontend/                  # Next.js 16 Client Application
    ├── package.json           # Frontend dependencies
    ├── next.config.ts         # Proxy rewrites for /api/*, /socket.io/*, /images/*
    ├── app/
    │   ├── layout.tsx         # Root layout with font and dark theme
    │   ├── page.tsx           # Responsive chat dashboard
    │   ├── login/page.tsx     # Modern sign-in screen
    │   ├── register/page.tsx  # Registration screen with image upload
    │   └── globals.css        # Tailwind styling & dark theme variables
    ├── components/
    │   ├── Navbar.tsx         # Header, branding & E2EE badge
    │   ├── ContactList.tsx    # Searchable contact list with online dots
    │   ├── ChatArea.tsx       # Message thread, mobile back button & input
    │   └── DeleteModal.tsx    # Confirmation dialog to delete message
    └── lib/
        ├── api.ts             # Typed REST API client
        ├── e2ee.ts            # Web Crypto ECDH + AES-GCM 256 E2EE core
        └── socket.ts          # Socket.io connection manager
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher; v24 recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI)

### 1. Clone and Install Dependencies

Install root backend dependencies:
```bash
cd Chating-Web-APP
npm install
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

### 2. Configure Environment Variables

Create or update `.env` in the project root:
```env
SESSION_SECRET='your_super_secret_session_key'
MONGODB_URI='mongodb://127.0.0.1:27017/chating-app'
PORT=5000
```

---

## 🏃 Running the Application

You can run the backend and frontend using the convenient scripts from the root directory:

### Terminal 1: Start the Backend (Port 5000)
```bash
npm run server
```

### Terminal 2: Start the Next.js Frontend (Port 3000)
```bash
npm run client
```

Now open **[http://localhost:3000](http://localhost:3000)** in your browser!

> 💡 **Testing Real-Time E2EE**:
> Open `http://localhost:3000` in two separate browser profiles (or one in Chrome and one in Incognito / Edge).
> Register two users (e.g. Alice and Bob).
> Start chatting — all messages are encrypted client-side before sending and decrypted only on the recipient's device!

---

## 🔒 End-to-End Encryption (E2EE) Specification

```text
   +------------------------------------+          +------------------------------------+
   |            Alice Client            |          |             Bob Client             |
   |                                    |          |                                    |
   | 1. Generates ECDH P-256 Keypair    |          | 1. Generates ECDH P-256 Keypair    |
   |    (PrivKey stored in IndexedDB)   |          |    (PrivKey stored in IndexedDB)   |
   | 2. PubKey sent to server (JWK)     |          | 2. PubKey sent to server (JWK)     |
   +-----------------+------------------+          +-----------------+------------------+
                     |                                               |
                     |                                               |
                     v                                               v
   +------------------------------------------------------------------------------------+
   |                         Server / Database (Zero Knowledge)                         |
   |     - Stores Public Keys (JWK format)                                              |
   |     - Stores Ciphertexts (Base64) + IVs (Base64)                                   |
   |     - Has NO ACCESS to Private Keys; CANNOT DECRYPT ANY MESSAGES                   |
   +------------------------------------------------------------------------------------+
                     |                                               |
                     | 3. Alice derives shared AES-256 key           |
                     |    using Bob's PubKey + Alice's PrivKey       |
                     | 4. Encrypts plaintext with random 12-byte IV  |
                     |                                               |
                     |                                               | 5. Bob receives {ciphertext, iv}
                     |                                               | 6. Derives shared AES-256 key
                     |                                               |    using Alice's PubKey + Bob's PrivKey
                     |                                               | 7. Decrypts plaintext locally!
```

1. **Key Generation**: When a user logs in for the first time, `E2EEService.init(userId)` creates an asymmetric ECDH P-256 key pair. The private key is placed into IndexedDB and never exported.
2. **Public Key Distribution**: The public key is exported as JWK and uploaded to `/api/save-public-key`.
3. **Shared Secret Agreement**: When User A chats with User B, `crypto.subtle.deriveKey` computes a 256-bit AES-GCM shared key from User A's private key and User B's public key. User B computes the exact same shared key from User B's private key and User A's public key.
4. **Message Encryption**: Each message is encrypted with `AES-GCM` using a fresh, random 12-byte Initialization Vector (IV).
5. **Decryption**: The recipient decrypts the ciphertext using their derived shared key and the message's IV.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/register` | Register new user (multipart form data with optional avatar) | No |
| `POST` | `/api/login` | Authenticate user credentials & establish session | No |
| `GET` | `/api/me` | Fetch active logged-in user profile | Yes |
| `GET` | `/api/users` | Fetch list of contacts with presence status | Yes |
| `POST` | `/api/logout` | Terminate session | Yes |
| `POST` | `/api/save-chat` | Store encrypted message ciphertext & IV | Yes |
| `POST` | `/api/delete-chat` | Delete message for everyone | Yes |
| `POST` | `/api/save-public-key` | Save user's ECDH public key (JWK) | Yes |
| `GET` | `/api/get-public-key/:userId` | Retrieve contact's ECDH public key | Yes |

---

## ⚡ Socket.io Event Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `connection` | Client -> Server | Handshake `{ auth: { token: userId } }` | Client authenticates and joins private room `user_<id>`. |
| `getOnlineUser` | Server -> Client | `{ user_id: string }` | Broadcasted when a user connects. |
| `getOfflineUser` | Server -> Client | `{ user_id: string }` | Broadcasted when a user disconnects. |
| `existsChat` | Client -> Server | `{ sender_id, receiver_id }` | Requests historical messages between two users. |
| `loadChats` | Server -> Client | `{ chats: ChatMessage[] }` | Delivers encrypted chat history for client-side decryption. |
| `newChat` | Client -> Server | `ChatMessage` | Sends new encrypted message to server. |
| `loadNewChat` | Server -> Client | `ChatMessage` | Relays encrypted message exclusively to recipient's private room. |
| `chatDeleted` | Client -> Server | `{ id, receiver_id }` | Informs server that a message was deleted. |
| `chatMessageDeleted` | Server -> Client | `messageId: string` | Directs recipient to remove deleted message bubble. |

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
