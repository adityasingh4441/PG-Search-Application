# Roomroot PG Search

A full-stack PG discovery MVP for students and property owners. The frontend lives in `frontend/` and the REST API lives in `backend/`.

## What works

- Student and owner registration, login, JWT-protected routes, and role checks.
- Search by keyword and area, with rent, gender, amenity, and sort filters.
- Approved listing details, favorites, reviews, and student-to-owner enquiries.
- Owner listing submission and enquiry inbox; edits return a listing to review.
- Admin approval/rejection queue. Pending and rejected listings stay out of public search.
- Student profile and search-preference editing, password changes with session revocation, recently viewed PGs, and review history.
- Enquiry message threads between the student and listing owner, notification inbox, and student-submitted PG safety reports.
- MongoDB text and geospatial indexes, plus a nearby-listing API.
- Responsive React interface and a local MongoDB Docker Compose service.

The map preview uses Google Maps when `VITE_GOOGLE_MAPS_API_KEY` is configured; without a key it uses an interactive OpenStreetMap preview. Enquiry messages are threaded but are not live Socket.io chat. Direct image uploads, advanced user/report moderation, CI/CD, and cloud deployment are not included in this MVP. Listing images currently accept an image URL.

## Requirements

- Node.js 20.19+ or 22.12+ and npm
- Docker Desktop, or a MongoDB server reachable at `MONGODB_URI`

## Run locally

1. Copy `.env.example` to `.env`. Set `JWT_SECRET` to a long random value and replace `SEED_PASSWORD` with a throwaway local password.
2. Start MongoDB: `docker compose up -d mongo`
3. Install dependencies from the project root: `npm install`
4. Load local demo accounts and six approved sample stays: `npm run seed`
5. Start frontend and backend together: `npm run dev`
6. Open the frontend URL printed by Vite (normally `http://localhost:5173`). The frontend proxies `/api` to the backend, so another Vite port works too. The API health endpoint is available at `/api/health` through the frontend or at `http://localhost:4000/api/health` directly.

The seed command creates three local accounts using the same `SEED_PASSWORD`:

- Admin: `admin@roomroot.local`
- Owner: `owner@roomroot.local`
- Student: `student@roomroot.local`

New users can also register from the interface. Admin accounts are intentionally not available through public registration.

If MongoDB is unavailable, the web app still starts and shows an API/database connection message. The seed command requires MongoDB.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Express API port | `4000` |
| `CLIENT_ORIGIN` | Comma-separated allowed browser origins for direct API requests | Local Vite ports `5173` and `5174` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/pg_search` |
| `JWT_SECRET` | JWT signing secret | Development fallback; replace it before use |
| `SEED_PASSWORD` | Shared password for local seed accounts | Required by `npm run seed` |
| `BACKEND_URL` | Backend target for the Vite `/api` proxy | `http://localhost:4000` |
| `VITE_API_URL` | Optional direct API base URL; normally leave as `/api` | `/api` |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional Google Maps JavaScript API key; OpenStreetMap is used when unset | Unset |

Vite reads `VITE_` variables at build time. In development, Vite proxies same-origin `/api` requests to `BACKEND_URL`, which avoids CORS issues if its port changes. For production, route `/api` through the same-origin reverse proxy or set `VITE_API_URL` to the deployed API URL. Copy `frontend/.env.example` to `frontend/.env.local` to configure a direct API URL or Google Maps. Google Maps requires an enabled Maps JavaScript API key; keep its referrer restrictions enabled.

## API outline

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/pgs`, `GET /api/pgs/nearby`, `GET /api/pgs/:id`, `GET /api/pgs/:id/reviews`
- `POST /api/pgs`, `PUT /api/pgs/:id`, `DELETE /api/pgs/:id`
- `POST /api/pgs/:id/favorite`, `GET /api/pgs/favorites`
- `POST /api/pgs/:id/reviews`, `POST /api/enquiries`, `GET /api/enquiries`, `POST /api/enquiries/:id/messages`
- `GET/PATCH /api/profile`, `PATCH /api/profile/password`, `GET /api/profile/reviews`, `GET/POST /api/profile/recently-viewed`
- `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`
- `GET/POST /api/reports`
- `GET /api/pgs/mine`, `PATCH /api/enquiries/:id/status`
- `GET /api/admin/pgs/pending`, `PATCH /api/admin/pgs/:id/approve`, `PATCH /api/admin/pgs/:id/reject`

Search supports `q`, `name`, `area`, `minRent`, `maxRent`, `gender`, `amenity`, `amenities`, `sort`, `page`, and `limit`. Sort values are `newest`, `price_asc`, `price_desc`, and `rating`.

## Production notes

Set unique secrets and database credentials through the host's environment manager, set `CLIENT_ORIGIN` to the deployed frontend origin, and serve the frontend/API over HTTPS. The local seed password and development JWT fallback are not production credentials. Image URL validation/storage, refresh-token rotation, full map/chat integrations, tests, monitoring, and deployment automation should be added before a production launch.# PG-Search-Application
