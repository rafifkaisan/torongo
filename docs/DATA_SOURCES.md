# Data sources and provenance

This inventory is derived from the application source code recovered from the supplied project export. It separates live API use from browse-only visual layers and from data that is merely proposed in project planning.

## NASA data and services actually referenced by the current app

| Dataset / service | Link | Current use in TORONGO | What this does not mean |
|---|---|---|---|
| NASA Common Metadata Repository (CMR), NISAR L2 GCOV validated (`NISAR_L2_GCOV_V1`) | https://cmr.earthdata.nasa.gov/search/granules.umm_json | Searches granule metadata for scene discovery, dates, and identifiers over the selected bounding box/time window. | The app does not fetch/process GCOV raster pixels for flood classification or area calculation. |
| NASA CMR, NISAR L2 GCOV provisional (`NISAR_L2_GCOV_PROVISIONAL_V1`) | https://cmr.earthdata.nasa.gov/search/granules.umm_json | Searches provisional NISAR granule metadata and distinguishes maturity in the interface. | Provisional data are not treated as fully validated; no raster measurements are calculated. |
| NASA OPERA L2 RTC Sentinel-1 (`OPERA_L2_RTC-S1_V1`) | https://cmr.earthdata.nasa.gov/search/granules.umm_json | Searches metadata for Sentinel-1 C-band RTC granules for comparison/context. | This is a NASA OPERA product derived from ESA Sentinel-1; it is not a second independent sensor. The app does not process its raster pixels. |
| NASA GIBS MODIS Terra Corrected Reflectance True Color | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi | WMS browse imagery used as a visual basemap/context layer. | It is not used for quantitative change calculations or automated optical validation. |
| NASA GIBS NISAR Level-2 Geocoded Polarimetric Covariance 12-day layer | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi | Requests a browse overlay for visual exploration where available. | A rendered WMS image is not a substitute for the underlying calibrated raster product. |
| NASA GIBS OPERA RTC Sentinel-1 12-day layer | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi | Requests a Sentinel-1 C-band browse overlay for visual comparison. | It is browse-only in the current code; no water-mask calculation is implemented. |
| NASA GIBS OPERA Dynamic Surface Water Extent Sentinel-1 layer | https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi | Requests a water-extent browse layer for visual context. | It is derived from Sentinel-1 and is not independent validation of Sentinel-1-based results. |
| NASA POWER Daily API, `PRECTOTCORR` | https://power.larc.nasa.gov/api/temporal/daily/point | Retrieves point precipitation estimates for the selected area coordinates and displays daily rainfall context. | Rainfall does not identify flood extent. The app must not use an arbitrary rainfall threshold as a flood detector; this release labels it precipitation context only. |

## Partner-agency data

| Agency / mission | Link | Relationship to the prototype |
|---|---|---|
| ESA Copernicus Sentinel-1 | https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1 | Underlying C-band radar mission represented through the NASA OPERA RTC-S1 and OPERA DSWx-S1 products/layers. The current app queries NASA CMR / GIBS for those NASA-distributed products; it does not directly query or process raw ESA Sentinel-1 scenes. |
| NASA-ISRO Synthetic Aperture Radar (NISAR) | https://nisar.jpl.nasa.gov/ | NISAR mission/product context for the central L-band observation workflow. The app queries NASA CMR metadata and a NASA GIBS browse layer; it does not process raw GCOV pixels. |

## Proposed or planned data (not currently used in this code)

The project notes mention ESA WorldCover, JRC Global Surface Water, Copernicus DEM, Global Human Settlement Layer, OPERA DSWx-S1, Sentinel-2 / Harmonized Landsat-Sentinel optical imagery, Bangladesh river-gauge records, and GUNW interferometric products. These must **not** be listed as datasets used in the current application unless the team actually integrated them and can show that integration. Some, such as OPERA DSWx-S1, already appear above as a visual layer.

## Submission form recommendation

List the NASA CMR NISAR validated/provisional metadata use, NASA OPERA RTC-S1 metadata use, NASA GIBS visual layers, and NASA POWER precipitation retrieval as separate rows or clearly grouped rows. In “How you used it,” keep the words “metadata discovery,” “browse imagery only,” and “precipitation context” explicit. List ESA Sentinel-1 under partner-agency data as the source mission behind the NASA OPERA derivative, not as a raw ESA API data download.
