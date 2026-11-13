# TORONGO feature set

## Primary user

**Resource managers**, particularly water and river resource managers who need to understand surface change but are not SAR-processing specialists. The Bangladesh Jamuna corridor is the demonstration case. A local disaster-management officer may appear as an illustrative persona; that does not narrow the product's primary audience to one named agency or district.

## Seven consolidated capabilities

### 1. Scene Finder — Tier 1

Find available NISAR and Sentinel-1/OPERA observations for an area and date range. Show acquisition dates, scene identifiers, product maturity, spatial coverage, and gaps. Enable a user to choose a candidate pair. This is a discovery interface, not a guarantee that a scientifically comparable pair exists.

### 2. Change Workbench — Tier 1

Compare a selected reach over two or more observations. The intended complete version includes a before/after swipe, a NISAR-only multi-date view, river/char change summaries, and derived area outputs. In the current build, maps are browse imagery and numeric flood/char/bank/cropland outputs remain unavailable. Do not demo placeholder dates or schematic overlays as measured change.

### 3. L-band vs C-band — Tier 1 only when a suitable pair exists

Compare NISAR L-band with Sentinel-1 C-band on matched or near-matched acquisitions after proper co-registration, calibration, common-grid resampling, and a documented water-classification rule. Intended outputs include L-band, C-band, and disagreement views, IoU/kappa against properly defined masks, and a cropland lens for candidate flooded vegetation. If no valid pair or independent reference exists, state “not testable” and use the NISAR-only timeline instead. OPERA DSWx-S1 is derived from Sentinel-1 and is not independent validation.

### 4. Inspect a Location — Tier 2

Let a user inspect a point or small area through three evidence views: signal, seasonal context, and source checklist. A signal chart must use actual calibrated measurements before labels can be treated as findings. Monsoon baselines must compare like with like (same sensor, comparable geometry and processing). Other interpretations remain Proposed until validated.

### 5. Trust Ledger — Tier 1, cross-cutting

Show source names, product identifiers, acquisition dates, processing maturity, footprint/coverage caveats, and what a source can and cannot establish. Use exactly three evidence labels: **Observed**, **Derived**, and **Proposed**. A GIBS browse layer is an observation for visual inspection, not a pixel-processed measurement.

### 6. Evidence Brief — Tier 2

Prepare a concise shareable report with the selected area, scene IDs, dates, method, limitations, and any valid outputs. Any future review order should show changed-area and population figures separately, with uncertainty/ranges and no hidden weights. Do not rank locations using an undefined “confidence” multiplier.

### 7. Explain Layer — Tier 2; optional extras Tier 3

Explain the loaded observation and method in plain language, with role-based emphasis and reviewed Bangla text. Any AI-assisted narration may explain existing results only. It must not create measurements, infer unobserved quantities, make unsupported forecasts, or provide safety instructions.

## Current prototype navigation

The app's current home screen presents seven navigation modules: Sky Calendar, Delta, Duet, Spot Check, Trust Ledger, Evidence Brief, and Explain Layer. These are existing interface groupings, not proof that every consolidated feature is scientifically implemented. Three legacy Community screens remain in the source and route table but are not linked from the home screen; they are local prototype interactions without a production backend. The Explain Layer is static and rule-based, not a generative chatbot.

## Prioritisation

- **Tier 1:** Scene Finder, Change Workbench, Trust Ledger; L-band vs C-band only if an appropriate scene pair exists.
- **Tier 2:** Inspect a Location, Evidence Brief, Explain Layer.
- **Roadmap only:** embankment displacement / ground movement (requires suitable same-track interferometric products, such as validated GUNW pairs), additional hazards, alerting, predictive features, and automatic monitoring.
