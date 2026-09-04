# GridVolt Architectural Decisions

This document records key decisions made during the design and development of GridVolt.

## 1. Dual-Mode DB & Auth Client
* **Decision**: Implement a custom client wrapper in `frontend/src/lib/supabaseClient.ts` that detects the presence of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
* **Rationale**: The target machine does not have Docker, PostgreSQL, or Supabase CLI. A remote Supabase project requires user-provided keys. By implementing a local SQLite fallback, the prototype runs instantly out-of-the-box via `npm run dev` with full functionality, but remains fully compatible with a real Supabase backend.
* **Realtime Fallback**: Realtime notifications (e.g. status changes, provider location updates) will use Server-Sent Events (SSE) or WebSockets from the Express backend, conforming to the `supabase.channel()` API.

## 2. Geolocation Snap-to-India
* **Decision**: Use a default coordinate of Udaipur, India (`24.5854, 73.7125`) for mock positions. If the browser's geolocation API returns coordinates outside the bounding box `[[6.5, 68.0], [37.5, 97.5]]`, the location is clamped back to India and a notification is displayed.
* **Rationale**: Hardlocks the app's service area to India, preventing overseas test coordinates from breaking the map layout or dispatch logic.

## 3. Skyroot Aerospace Editorial Design System
* **Decision**: Adopt Skyroot Aerospace's (`skyroot.in`) minimal, high-contrast visual language with near-black backgrounds (`#0A0A0B`), hairline borders, mono telemetry tags, and electric amber (`#FF6A00`) status accents. All legacy 3D spinning meshes were removed in favor of clean Vikram-I style spec-bullet cards and linear horizontal steppers.
* **Rationale**: Fulfills the prompt's strict requirement for a restrained, confident editorial brand across all three portals without noisy gamification.

## 4. Section 4A Remote Assistance ("Book for Someone Else")
* **Decision**: Implement a segmented dispatch scope toggle on the SOS screen (`[ REQUEST FOR MYSELF ]` vs `[ FOR SOMEONE ELSE ]`).
* **Implementation Details**:
  - For Self: Browser Geolocation captures device GPS, auto-filling `onsite_contact_name` and `onsite_contact_phone` from the requester's profile.
  - For Someone Else: Decouples GPS auto-capture. Employs OpenStreetMap Nominatim geocoding (`countrycodes=in`) and interactive Leaflet map pin-drop to define target coordinates anywhere in India (e.g. Hyderabad, Delhi, Udaipur). Requires stranded person's name and contact number.
  - Dispatch Algorithm: Ranks providers and computes tariffs strictly based on the target breakdown coordinates, not the requester's device location.
  - Provider Cockpit: Displays the on-site person's phone number as the primary direct-call CTA (`tel:...`) so the dispatched unit contacts the actual stranded driver.
  - Ownership Retention: The requester's account (`user_id`) retains full live tracking, cancellation control, and audit history.

## 5. Single-Port & Concurrent Developer Experience
* **Decision**: Monorepo orchestration runs Express backend on port `5000` and Vite frontend on port `3000` concurrently via `npm run dev`. Express root `/` provides a helpful redirect to the frontend with an automated health check endpoint at `/api/health`.
* **Rationale**: Out-of-the-box local execution with zero manual configuration.
