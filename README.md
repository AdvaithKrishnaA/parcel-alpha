# Parcel - End-to-End Encrypted Bundle Sharing

Parcel is a strict, self-hostable, production-ready, end-to-end encrypted (E2EE) link bundle sharing application. The server is designed as dumb storage with access control only and operates entirely on Cloudflare Workers and Cloudflare R2.

All encryption keys are derived, used, and managed exclusively on the client side using Web Crypto APIs.

## Architecture & Workspaces
The project is built as a monorepo consisting of:
- `apps/web`: Vite + React + TS frontend for managing and sharing bundles locally or via E2EE sync.
- `apps/extension`: Manifest v3 browser extension (Chrome/Safari) to instantly share or add current tabs to your bundles.
- `packages/crypto`: Core WebCrypto and Argon2id wrappers for AES-GCM and base62/base64url encoding.
- `packages/sync`: Shared API logic for E2EE cloud sync.
- `packages/types`: Shared TypeScript interfaces.
- `worker`: Cloudflare Worker API to store blobs securely in R2.

---

## Deployment & Self-Hosting Guide

### Prerequisites
- Node.js (>= 18)
- A Cloudflare account
- `wrangler` CLI

### 1. Setup R2 Bucket
First, you need to create the Cloudflare R2 bucket for storage.
```bash
npx wrangler r2 bucket create bundle-sharing
```

### 2. Deploy the Worker
```bash
cd worker
npm install
npx wrangler deploy
```
*Take note of the deployed worker URL (e.g., `https://bundle-sharing-worker.<your-subdomain>.workers.dev`).*

### 3. Deploy the Web Frontend
Before building the frontend, you must supply the URL of your deployed Worker API.

Create an `.env` file in `apps/web`:
```
VITE_API_URL=https://bundle-sharing-worker.<your-subdomain>.workers.dev
```

Build the web app:
```bash
cd apps/web
npm install
npm run build
```
The output will be in `apps/web/dist`, which can be hosted on Cloudflare Pages, Vercel, Netlify, or any static hosting service.

### 4. Build the Extension
To use the browser extension:
```bash
cd apps/extension
npm install
npm run build
```
Load the `apps/extension/dist` folder into Chrome as an "Unpacked Extension" via `chrome://extensions/`.

---

## Technical Constraints Respected
- **Strict E2EE:** Server never sees keys or derives keys. Everything is AES-GCM 256.
- **Dumb Storage:** Cloudflare Worker purely validates IDs, expires views, increments views atomically, and stores the encrypted raw base64 string.
- **Folder Key:** Random 32-byte key appended to the URL fragment (`#key`). URL fragments are not sent to the server.
- **Sync Master Key:** Password hashed via Argon2id (using `hash-wasm`) into a 32-byte AES-GCM key.
- **Performance:** App size is small, uses IndexedDB on the extension, and does not require streaming.
- **No Analytics/Logs:** The worker and front-end do not track URLs.

## Development

Run the web app locally:
```bash
npm run dev --workspace=apps/web
```

Run the worker locally:
```bash
cd worker
npx wrangler dev
```
