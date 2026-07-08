# Property Search App

A full-stack property search application for browsing real estate listings, filtering results, and viewing detailed property information.

The project is currently in the planning/setup stage. The intended product will include a searchable listings page, property detail views, photo support, maps, open house information, and a backend API connected to a local database.

## Planned Stack

- React frontend
- Node.js and Express backend
- MySQL database
- Jest-based testing

## Status

Week 3 backend deliverables are now in place:

- `GET /api/health` checks API and MySQL connectivity.
- `GET /api/properties` returns paginated property listings with filters for `city`, `zip`, `status`, `type`, `q`, `minPrice`, `maxPrice`, `minBeds`, and `minBaths`.
- `GET /api/properties/:listingId` returns one property with photos, listing details, agent/office fields, and related open houses.
- `GET /api/open-houses` returns paginated open-house records with optional `listingId`, `from`, `to`, and `city` filters.

Run the backend from `backend/`:

```bash
npm install
cp .env.example .env
npm start
```

The API listens on `http://localhost:5000` by default.
