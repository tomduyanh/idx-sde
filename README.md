# Property Search App

A full-stack property search application for browsing real estate listings, filtering results, and viewing detailed property information.

The project is currently in the planning/setup stage. The intended product will include a searchable listings page, property detail views, photo support, maps, open house information, and a backend API connected to a local database.

## Planned Stack

- React frontend
- Node.js and Express backend
- MySQL database
- Jest-based testing

## Status

Week 4 backend deliverables are now in place:

- `GET /api/health` checks API and MySQL connectivity.
- `GET /api/properties` returns paginated property listings with filters for `city`, `zip`, `status`, `type`, `q`, `minPrice`, `maxPrice`, `minBeds`, and `minBaths`.
- `GET /api/properties/:id` returns one full property with photos, listing details, and agent/office fields, or a helpful `404` for unknown IDs.
- `GET /api/properties/:id/openhouses` returns an ordered array of open-house events for the property. Empty arrays are valid.
- `GET /api/open-houses` returns paginated open-house records with optional `listingId`, `from`, `to`, and `city` filters.
- Malformed or oversized property IDs return `400` before a database query runs.
- Every request logs method, URL, status code, timestamp, and duration in milliseconds.

Run the backend from `backend/`:

```bash
npm install
cp .env.example .env
npm start
```

The API listens on `http://localhost:5000` by default.

Example Week 4 checks:

```bash
curl "http://localhost:5000/api/properties/1174572339"
curl "http://localhost:5000/api/properties/1174572339/openhouses"
curl "http://localhost:5000/api/properties/bad_id"
```
