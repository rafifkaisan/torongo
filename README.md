# TORONGO

**See the flood. Understand the change.**

TORONGO is an open-source Expo / React Native prototype for making satellite-radar observations easier for non-specialist water and land resource managers to explore. The Bangladesh Jamuna river corridor is the demonstration geography. The product direction is NISAR-first, with Sentinel-1 C-band as a comparison source where suitable observations exist.

> **Prototype status:** This repository contains a working user-interface prototype with live NASA service requests for observation metadata, browse imagery, and precipitation context. It does **not** yet process NISAR or Sentinel-1 raster pixels into a validated water mask, flooded-area estimate, L-band/C-band agreement score, or ground-displacement measurement. Results requiring those calculations show “No data available” rather than invented values.

## 240 seconds of glory

240 Seconds of Glory video: https://youtu.be/8mxUWiiZur0



## Prototype Application tutorial 

https://drive.google.com/drive/folders/1mpgcI19X0850WtemMxswghjLVe2k7T-A?usp=sharing


## Prototype preview

**Working prototype (Expo / React Native):**
- Watch it running: Demo video above, and the App tutorial link above.
- Source code: `app/` folder (also `archive/original-expo-snack-export.zip`, the original Expo Snack export).
- Try it yourself: install the Expo Go app, then follow "Run locally" below.

## What is in this repository

- `app/` - Expo SDK 54 / React Native application source and original visual assets.
- `docs/` - product architecture, feature descriptions, data provenance, methods, limitations, AI disclosure, references, screen inventory, visual asset inventory, video checklist, and submission-ready copy.
- `archive/original-expo-snack-export.zip` - the original ZIP recovered unchanged from the uploaded project PDF for provenance.
- `LICENSE` - 0BSD license, consistent with the source package metadata.

## Run locally

Requirements: Node.js LTS and npm.

```bash
cd app
npm install
npx expo start
```

For a web preview (if the installed Expo dependencies support it):

```bash
cd app
npx expo start --web
```

The app uses public NASA endpoints directly from the client. Network access, browser CORS behavior, endpoint availability, and the availability of browse layers for a selected date can affect what appears. A missing scene or layer must be treated as unavailable, not as evidence that no change occurred.

## Current live service integrations

1. **NASA CMR** - requests catalog metadata for NISAR Level-2 GCOV validated and provisional granules, and NASA OPERA Level-2 RTC-S1 granules. CMR metadata is used for scene discovery, dates, product maturity, and scene identifiers. The app does not download or process the corresponding SAR rasters.
2. **NASA GIBS WMS** - displays browse layers for MODIS Terra corrected-reflectance true colour, NISAR geocoded polarimetric covariance, OPERA RTC Sentinel-1, and OPERA Dynamic Surface Water Extent Sentinel-1. These are for visual context only in this prototype, not quantitative measurements.
3. **NASA POWER Daily API** - retrieves the `PRECTOTCORR` precipitation estimate for selected study-area coordinates. Rainfall is contextual information; a rainfall threshold is not used to declare flooding.

See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) for identifiers, links, exact usage, and distinctions between NASA products and partner missions.

## Product architecture

The final product direction is consolidated into seven capabilities:

1. Scene Finder
2. Change Workbench
3. L-band vs C-band
4. Inspect a Location
5. Trust Ledger
6. Evidence Brief
7. Explain Layer

See [`docs/FEATURES.md`](docs/FEATURES.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The shipped app still contains a legacy Community module and a static, rule-based Advisor. These are prototype modules, not a connected production community service or a generative-AI system.

## Scientific and operational limits

- NISAR scenes must be available over the selected area and date range; its observation cadence is not continuous monitoring.
- C-band and L-band measurements are not interchangeable. Cross-sensor comparisons need matched dates, geometry, calibrated processing, a common grid, and a stated classification method.
- OPERA DSWx-S1 is derived from Sentinel-1 and is not an independent sensor for validation.
- A GIBS browse image must not be presented as an analytically processed raster.
- Flood extent, char area, bank movement, flooded vegetation, deformation, IoU, kappa, and population exposure are not validated outputs of the current app.
- TORONGO is a post-observation exploration and evidence-organisation tool, not a flood forecast, warning, evacuation, or emergency-response authority.

The project intentionally uses the labels **Observed**, **Derived**, and **Proposed** to separate source observations, calculations, and hypotheses. See [`docs/VALIDATION_AND_LIMITATIONS.md`](docs/VALIDATION_AND_LIMITATIONS.md).

## AI use

The in-app Advisor is a deterministic, keyword-matched explainer built from team-authored reference text. It is not connected to a generative model and does not calculate measurements. External AI tools used during development and documentation must be disclosed accurately in the competition form; see [`docs/AI_USE.md`](docs/AI_USE.md) for a draft disclosure and the final verification note.

## Team and privacy

This public repository deliberately omits personal phone numbers, email addresses, guardian details, signatures, and personal data. Do not include identifiable images, voices, or likenesses of participants under 18 in public project material or video; follow the event's guardian-consent and media rules.

## License and credits

The source package declares `0BSD`. NASA data and imagery remain subject to their respective source terms and attribution requirements. This project is an independent student prototype and is not endorsed by NASA, ISRO, ESA, or any government agency.
