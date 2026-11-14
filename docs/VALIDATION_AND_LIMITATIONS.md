# Validation, evidence labels, and limitations

## What the current app can demonstrate

- A bilingual (English/Bangla) interface organized around radar observations and resource-management questions.
- NASA CMR catalog queries for NISAR L2 GCOV validated/provisional and NASA OPERA RTC-S1 granule metadata.
- NASA GIBS WMS browse-layer requests for visual satellite context.
- NASA POWER daily point precipitation retrieval.
- Area selection, observation discovery/pair selection interfaces, visual map comparison concepts, evidence/provenance screens, and an export interface.
- Honest no-data handling for quantities that are not available from a raster-processing service.

## What has not been implemented or independently demonstrated

- Downloading and processing NISAR GCOV or Sentinel-1 raster pixels.
- Calibrated, terrain-corrected, co-registered water masks from source rasters.
- Measured flooded area, char/island area, bank-line movement, affected cropland, or flooded vegetation.
- Matched L-band/C-band mask comparison, IoU, Cohen's kappa, or fusion validation.
- Statistical seasonal baselines from same-sensor historical data.
- InSAR ground displacement using appropriate GUNW same-track pairs.
- Independent ground truth or validation for a flood event.
- Real population exposure values or an operational triage ranking.

Where the current interface includes illustrative charts, schematic geometry, default selection dates, or sample narrative, they are interface scaffolding and not satellite-derived findings. CMR acquisition dates are the only dates that should be quoted as retrieved observations. A placeholder date must never be called a scene date.

## Evidence labels

- **Observed:** directly present in a named source record or browse asset, such as a granule ID/date returned by CMR or a browse image returned by GIBS.
- **Derived:** calculated from source measurements by a documented, deterministic method. No flood-area-derived values are currently available in this app.
- **Proposed:** a hypothesis or planned capability requiring suitable source data and validation.

## Scientific guardrails

1. Keep NISAR L-band central to the challenge. Sentinel-1 C-band is a comparison/supplement, not a replacement for NISAR.
2. Do not compare the two frequency bands as if they have identical scattering behavior. Document polarization, acquisition geometry, product maturity, spatial resolution, calibration, and resampling.
3. Make comparisons on a common grid and use sensor-specific validated thresholds/methods. A difference map alone does not prove that one sensor is correct.
4. Only report IoU/kappa when both masks exist and their evaluation reference is clearly defined. If no independent reference exists, say “not tested.”
5. OPERA DSWx-S1 is derived from Sentinel-1 and cannot count as independent sensor validation of a Sentinel-1-derived mask.
6. A clear-day optical scene can support validation only when cloud cover and timing are suitable. River-gauge readings are point observations and do not directly validate a spatial flood boundary.
7. A seasonal comparison must use like-for-like data (same sensor and comparable processing/geometry). Do not compare a current NISAR L-band value with a Sentinel-1 C-band historical baseline as if they were equivalent.
8. Deformation modules stay hidden/Proposed until appropriate same-track interferometric data, processing, and validation are available.
9. TORONGO is not an early-warning or evacuation system. Never imply that a lack of detected change means a place is safe.
