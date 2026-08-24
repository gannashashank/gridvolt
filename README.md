# GridVolt ⚡

GridVolt is a real-time EV emergency roadside assistance platform designed and locked for India's geographical boundaries.

Stranded EV drivers can trigger an SOS distress signal, get matched with the nearest available roadside assistance provider based on a weighted capability and distance ranking score, review a transparent quotation, track their provider's live location on a 2D map + 3D minimap, and rate the service upon job completion.

## 🚀 Features

1. **Dual-Mode Backend Engine**: Out-of-the-box local running via SQLite database fallback if no Supabase credentials are configured.
2. **Procedural 3D Visualizer**: Features a rotating 3D car model, animated battery charging loops, and a 3D minimap overlay showing the provider's vehicle closing the distance.
3. **India-Only Map Bounds**: Map boundaries are hardlocked. Geolocation lookups that resolve outside India automatically snap to the Udaipur centroid.
4. **Realtime Syncing**: Emulates Supabase Realtime using Server-Sent Events (SSE) from the Express server.
5. **Intelligent Dispatch**: Multi-factor scoring ranking: `score = (w1 * distance) + (w2 * ETA) + (w4 * capabilityMismatch)`.

---

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS, Leaflet.js
- **3D Engine**: Three.js, React Three Fiber (R3F), `@react-three/drei`
- **Backend**: Node.js + Express.js
- **Database**: SQLite (local fallback) or PostgreSQL (Supabase)
- **Auth**: JWT (local fallback) or Supabase Auth

---

## 💻 Quick Start & Installation

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` blank to run in local SQLite database mode).*

### 3. Bootstrap & Install Dependencies
From the root directory, install all monorepo dependencies:
```bash
npm install
```

### 4. Launch Servers
Run both the frontend and backend simultaneously:
```bash
npm run dev
```
- Frontend will boot at: [http://localhost:3000](http://localhost:3000)
- Backend API will boot at: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Credentials

All test accounts share the password: `password123`

### 1. EV Drivers (Users)
- `user1@gridvolt.app` — Rajesh Kumar (Tata Nexon EV, Udaipur region)
- `user2@gridvolt.app` — Amit Sharma (MG ZS EV, Jaipur region)
- `user3@gridvolt.app` — Priya Patel (Hyundai Kona, Delhi region)

### 2. Roadside Service Providers
- `provider1@gridvolt.app` — Vijay Kumar (Udaipur, Service Van, Level 2 DC charging)
- `provider2@gridvolt.app` — Sanjay Singh (Jaipur, Flatbed Tow Truck)
- `provider3@gridvolt.app` — Rajesh Yadav (Delhi, Mobile CCS2 Charger)

### 3. Systems Administrator
- `admin@gridvolt.app` — Control Room Administrator
