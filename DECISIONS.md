# GridVolt Architectural Decisions

This document records key decisions made during the design and development of GridVolt.

## 1. Dual-Mode DB & Auth Client
* **Decision**: Implement a custom client wrapper in `frontend/src/lib/supabaseClient.ts` that detects the presence of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* **Rationale**: The target machine does not have Docker, PostgreSQL, or Supabase CLI. A remote Supabase project requires user-provided keys. By implementing a local SQLite fallback, the prototype runs instantly out-of-the-box via `npm run dev` with full functionality, but remains fully compatible with a real Supabase backend.
* **Realtime Fallback**: Realtime notifications (e.g. status changes, provider location updates) will use Server-Sent Events (SSE) or WebSockets from the Express backend, conforming to the `supabase.channel()` API.

## 2. Geolocation Snap-to-India
* **Decision**: Use a default coordinate of Udaipur, India (`24.5854, 73.7125`) for mock positions. If the browser's geolocation API returns coordinates outside the bounding box `[[6.5, 68.0], [37.5, 97.5]]`, the location is clamped back to India and a notification is displayed.
* **Rationale**: Hardlocks the app's service area to India, preventing overseas test coordinates from breaking the map layout or dispatch logic.

## 3. Procedural 3D Assets
* **Decision**: Create the EV car and charging icons procedurally using React Three Fiber mesh primitives (boxes, cylinders, spheres, rings) rather than fetching static GLTF assets.
* **Rationale**: Ensures the prototype runs immediately without network requests, heavy assets, or broken 3D models.

## 4. Single-Port Developer Experience
* **Decision**: We will run a monorepo setup. The backend will run on port `5000` and proxy frontend requests, or we can boot them concurrently using standard node scripts.
* **Rationale**: Easy local setup.
