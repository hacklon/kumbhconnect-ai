# KumbhConnect AI

A government-grade, responsive, offline-first missing persons tracking registry built for the **Nashik-Trimbakeshwar Simhastha Kumbh Mela 2027**. 

KumbhConnect AI empowers police desks, mela command centers, and volunteer search units to quickly report, search, analyze, and reunite missing pilgrims under critical cellular congestion and offline states.

---

## 1. Core Technical Stack
* **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
* **Geospatial Mapping**: Leaflet.js (Client-side dynamic marker clustering & boundary polygons)
* **Backend**: Next.js Server Route Handlers (REST APIs)
* **Database**: PostgreSQL (via Supabase) with `pg_trgm` extensions for database-level fuzzy matches
* **Security & Authentication**: Supabase Auth (Role-based access control)
* **AI Engine**: Anthropic Claude AI (For natural language speech structuring & double-sighting descriptions matching)
* **Offline Storage**: Service Worker caches + IndexedDB client queue
* **Containerization**: Docker (multi-stage production builds)

---

## 2. API Documentation

### A. Missing Persons Registry
* **Create Case**
  * **Endpoint**: `POST /api/missing-persons`
  * **Payload**:
    ```json
    {
      "name": "Savita Desai",
      "gender": "Female",
      "age_band": "41-60",
      "state": "Bihar",
      "district": "Nalanda",
      "language": "Maithili",
      "last_seen_location": "Trimbakeshwar Approach",
      "last_seen_zone": "Zone Area 1",
      "reporter_mobile": "+91 6734036506",
      "physical_description": "Man in saffron kurta, has rudraksha mala",
      "clothing_description": "Green cotton saree"
    }
    ```
  * **Response**: `{ "success": true, "data": { "case_id": "KMP-2027-14283", ... } }`

* **Search Cases**
  * **Endpoint**: `GET /api/missing-persons`
  * **Query Params**: `query`, `gender`, `ageBand`, `zone`, `status`
  * **Response**: `{ "success": true, "count": number, "data": [...] }`

### B. Found Sighting Registry
* **Register Sighting**
  * **Endpoint**: `POST /api/found-persons`
  * **Payload**:
    ```json
    {
      "gender": "Female",
      "age_band": "61-70",
      "found_location": "Ramkund Ghat approaches",
      "found_zone": "Zone Area 30 (Ramkund Ghat)",
      "finder_name": "Ramesh Kumar",
      "finder_contact": "+91 98765 43210",
      "notes": "Elderly lady found crying, speaking Gujarati, wearing green saree"
    }
    ```
  * **Response**: Returns the sighting and triggers a PostgreSQL matching query. If a match probability is > 80%, updates status to `Probable Match` and responds with the matching Case details.

### C. Geolocation SMS Gateway
* **Map SMS Ping**
  * **Endpoint**: `POST /api/sms-gateway`
  * **Payload**:
    ```json
    {
      "sender": "+91 6734036506",
      "message": "GPS: 20.0067, 73.7906, Accuracy: 12m, Battery: 76%"
    }
    ```
  * **Response**: Parses coordinates and updates either:
    1. Volunteer track locations.
    2. Active missing case GPS logs matching the reporter's phone number.

### D. Analytics & Dashboard Metrics
* **Get Central Summary**
  * **Endpoint**: `GET /api/analytics`
  * **Response**: Returns statistics for: active cases, found count, elderly indicators, resolution times, and heatmap coords.

---

## 3. Local Setup Guide

### Environment Configuration
1. Clone the project and navigate to the directory.
2. Rename `.env.example` to `.env.local` and configure your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ANTHROPIC_API_KEY=your-claude-api-key
   ```

### Running with Docker (Recommended for Node Engine compatibility)
To bypass Node version mismatches and build Next.js 15 production targets:
1. Build the Docker image:
   ```bash
   docker build -t kumbhconnect-ai .
   ```
2. Launch container:
   ```bash
   docker run -p 3000:3000 --env-file .env.local kumbhconnect-ai
   ```
3. Open `http://localhost:3000` to access the portal.

### Development Mode (Requires Node.js >= 20.9.0)
```bash
npm install
npm run dev
```

---

## 4. Production Deployment

### A. Supabase PostgreSQL Initialization
1. Create a project on [Supabase](https://supabase.com).
2. Execute the schema queries in `supabase/schema.sql` inside the SQL Editor.
3. Import geographic records (Zones, CCTVs, stations) by running the queries generated inside `supabase/seed.sql`.

### B. Vercel Hosting
1. Map your variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`) to Vercel's Environment Settings.
2. Run standard deploy commands:
   ```bash
   vercel --prod
   ```
