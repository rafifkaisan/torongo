# Architecture

## Current implementation

```mermaid
flowchart TD
  U[Resource manager / evaluator] --> UI[Expo + React Native interface]
  UI --> CMR[NASA CMR granule metadata API]
  UI --> GIBS[NASA GIBS WMS browse layers]
  UI --> POWER[NASA POWER Daily API]
  CMR --> META[Scene IDs, dates, product maturity]
  GIBS --> MAP[Visual satellite context]
  POWER --> RAIN[Point precipitation context]
  META --> UI
  MAP --> UI
  RAIN --> UI
  UI --> BRIEF[Prototype evidence brief / export]
```

The current prototype is a client-side Expo app. It does not currently contain a server-side raster-processing pipeline, a persistent project database, authenticated user accounts, or a production community service. Public NASA endpoints are requested by the app; results depend on network access and current endpoint/layer availability.

## Intended scientific processing architecture (not implemented in this repository)

```mermaid
flowchart TD
  A[Area of interest + date range] --> B[Discover NISAR GCOV and Sentinel-1 scenes]
  B --> C[Download product rasters and metadata]
  C --> D[Quality checks: maturity, geometry, orbit, coverage]
  D --> E[Calibration / geocoding / terrain correction as required]
  E --> F[Co-register and resample to common grid]
  F --> G[Sensor-specific water / change classification]
  G --> H[Same-date L-band vs C-band comparison]
  G --> I[Area and time-series calculations]
  H --> J[Independent validation where available]
  I --> K[Uncertainty, provenance, and evidence labels]
  J --> K
  K --> L[Workbench, Trust Ledger, Evidence Brief]
```

This diagram is the proposed next engineering stage, not a description of functionality already delivered. The scientific pipeline must be reproducible, deterministic, tested on known examples, and explicit about thresholds, resolution, uncertainty, and no-data conditions.

## Frontend modules currently present

- React Native screens and reusable cards, typography, bilingual strings (English and Bangla), controls, map panels, swipe comparison, charts, and PDF/share export.
- Expo SDK 54 and React Native 0.81 dependencies.
- `react-native-svg` for vector overlays and visualizations; `expo-linear-gradient` and Expo font packages for styling.
- Navigation is implemented in app state (not a remote routing service).

## Backend and storage status

There is no application backend in this repository. Scene catalog requests, browse-image requests, and precipitation requests are made from the client. Community posts, sample advisor knowledge, and most feature state are in local JavaScript data structures. A production version would need a server-side geospatial processing service, object storage for validated outputs, a provenance database, caching, monitoring, and an API that returns versioned analysis products.
