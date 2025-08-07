# Global Pulse

## Overview
**Global Pulse** is a real-time world events visualization platform that aggregates tweets about breaking events—including natural disasters, protests, concerts, and sports—using advanced location intelligence and natural language processing (NLP). The system clusters related tweets geographically and displays them on an interactive heatmap map, providing immediate spatial context for unfolding global events.

Unlike traditional social media feeds overwhelmed by noise, Global Pulse applies NLP-based event classification and spatial clustering to filter only verified, location-specific events. This ensures users receive actionable insights rather than raw data streams.

### Value Proposition
- **Signal Over Noise**: Filters irrelevant content using NLP to identify true event signals.
- **Geospatial Awareness**: Maps real-time events with precise clustering to show hotspots of activity.
- **Zero External Dependencies**: Fully containerized with self-contained services for easy deployment.
- **Public Safety & Media Ready**: Designed for emergency responders, journalists, and travelers needing rapid situational awareness during crises.

## Why Global Pulse Matters
During emergencies like hurricanes, earthquakes, or civil unrest, critical information is often buried under vast volumes of unstructured social media chatter. Platforms lack geographic precision, delaying response times and increasing risk.

Global Pulse solves this by transforming chaotic Twitter data into **actionable geospatial intelligence**, enabling faster decision-making for humanitarian aid, news reporting, and public safety operations.

## Architecture & Technology Stack

### High-Level Design
The system follows a **monolithic architecture** with a single FastAPI application handling the entire pipeline:
```
Twitter Ingestion → NLP Classification → Geocoding → Spatial Clustering → API → Frontend Heatmap
```

Despite monolithic structure, the codebase is modular with strict separation of concerns, making future microservice decomposition straightforward.

### Core Technologies
| Component           | Technology                        | Rationale |
|---------------------|-----------------------------------|---------|
| Language & Framework| Python 3.11 + FastAPI 0.104.1     | Async I/O support, built-in OpenAPI docs, type safety via Pydantic |
| ORM & Data Layer    | SQLModel 0.0.13 + SQLite 3.45.1  | Zero-setup relational storage; sufficient for demo-scale |
| NLP Engine          | spaCy 3.7.4 (`en_core_web_sm`)   | Lightweight, efficient English model ideal for event detection |
| Frontend            | React + Leaflet + Vite           | Responsive interactive map visualization with real-time updates |
| Caching             | `functools.lru_cache`            | Reduces redundant computation in geocoding and NLP |

### File Structure
```
/usr/src/project/
├── event-backend
│   ├── pyproject.toml
│   ├── poetry.lock
│   ├── app
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── services
│   │   │   ├── __init__.py
│   │   │   ├── twitter.py
│   │   │   ├── nlp.py
│   │   │   ├── geocoding.py
│   │   │   ├── clustering.py
│   │   │   └── event_processor.py
│   │   └── api
│   │       ├── __init__.py
│   │       └── endpoints
│   │           ├── __init__.py
│   │           └── events.py
│   ├── tests
│   │   ├── __init__.py
│   │   ├── test_twitter.py
│   │   ├── test_geocoding.py
│   │   ├── test_clustering.py
│   │   └── test_events_api.py
│   └── .env.example
└── event-web
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    ├── src
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components
    │   │   └── HeatmapMap.tsx
    │   └── services
    │       └── api.ts
    └── public
```

## Security Design

- **Authentication**: Not implemented — all data is public event information intended for open access.
- **Encryption**: Not required — no sensitive user data is stored or transmitted.
- **Input Validation**:
  - Strict schema validation using **Pydantic models**
  - JSON parsing safeguards
  - PII redaction via spaCy NLP pipeline to remove personal details from event descriptions

> ✅ Verified through manual schema inspection and API-level unit testing (`test_events_api.py`)

## Features

### Backend (FastAPI)

#### Event Ingestion
- Simulated Twitter client (`FakeTwitterClient`) returns realistic mock events with:
  - Timestamps
  - Location hints (e.g., "near Tokyo", "central Paris")
  - Text content describing events

#### Natural Language Processing
- Uses spaCy to:
  - Classify event type (disaster, protest, concert, etc.)
  - Extract location phrases
  - Sanitize text (remove PII such as names, phone numbers)

#### Geocoding Service
- Converts ambiguous location strings into latitude/longitude
- Implements in-memory caching (`lru_cache`) for high performance
- Stubbed with known city coordinates during tests

#### Spatial Clustering
- Groups nearby events into clusters based on configurable radius (in meters)
- Optimized algorithm reduces visual clutter on map
- Deterministic logic enables repeatable testing

#### REST API
- `/map` endpoint returns clustered events as GeoJSON FeatureCollection
- Fully documented via Swagger UI at `/docs`

### Frontend (React + Leaflet)

- Interactive heatmap powered by `leaflet.heat` and `react-leaflet`
- Auto-updates via periodic polling of backend
- Visual clustering shows intensity by region
- Responsive design works across devices

## Development Setup

### Prerequisites
- Python 3.11
- Node.js 18+
- Poetry (Python package manager)
- npm

### Installation & Build

```bash
# Clone project
git clone https://github.com/example/global-pulse.git
cd global-pulse

# Backend setup
cd event-backend
poetry install
python -m spacy download en_core_web_sm

# Frontend setup
cd ../event-web
npm install
```

### Running the Application

#### Start Backend
```bash
cd event-backend
poetry run uvicorn app.main:app --port 8000 --reload
```
Access API docs at: http://localhost:8000/docs

#### Start Frontend
```bash
cd event-web
npm run dev
```
Access the map at: http://localhost:5173

## Testing

### Backend Tests
```bash
cd event-backend
poetry run pytest
```
Verifies:
- Twitter stub returns valid event count and structure
- Geocoding cache functions correctly
- Clustering responds accurately to radius changes
- API rejects invalid input and returns proper GeoJSON

### Frontend Tests
```bash
cd event-web
npm run build
npm run test
```
Includes unit test for `fetchHeatmap()` service with fetch mocking.

## Verification & Completion Criteria

The project is considered **100% complete** when:

1. ✅ All backend tests pass:  
   `poetry run pytest` exits with status code 0  
   
2. ✅ Frontend builds without error:  
   `npm run build` completes successfully  

3. ✅ Backend runs cleanly:  
   `uvicorn app.main:app --port 8000` starts without exceptions  

4. ✅ API returns valid GeoJSON:  
   ```bash
   curl http://localhost:8000/map | jq '.type == "FeatureCollection"'
   ```  
   Output: `true`

5. ✅ Frontend page loads correctly:  
   ```bash
   curl http://localhost:5173 | grep -q 'id="map-container"' && \
   curl http://localhost:5173 | grep -q 'data-count="5"'
   ```

6. ✅ Spatial logic verified:  
   Predefined fake events (e.g., grouped around cities) cluster appropriately — visually confirmed in browser.

## Future Enhancements
- Integrate real Twitter API with bearer token authentication
- Add user accounts and customizable event filters
- Support multiple languages with multilingual NLP models
- Deploy with Docker and Kubernetes for scaling
- Add historical event timeline and playback

## License
This project is licensed under the MIT License — see the [LICENSE] file for details.

---

> Built for clarity, speed, and impact. Global Pulse turns social chaos into spatial insight. 🌍📡
