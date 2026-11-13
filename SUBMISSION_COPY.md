# Local submission copy - TORONGO

Use this as the working copy for the Barisal local final submission. Check the final live links and tool disclosures before pressing Submit final.

## Project name

TORONGO

## High-level summary (2-4 sentences)

TORONGO helps water and land resource managers explore how rivers and surrounding surfaces change using satellite radar observations. Its prototype brings NASA NISAR and Sentinel-1/OPERA observation discovery, browse maps, and rainfall context into a bilingual interface with source and evidence labels. The current build demonstrates data discovery and visual exploration; validated flood-area and cross-sensor measurements are the next processing stage.

## Project details

TORONGO addresses a practical gap in interpreting surface change from radar: raw SAR products and their metadata are difficult for non-specialist resource managers to navigate, especially during cloudy monsoon periods. Its primary users are water and land resource managers; the Jamuna river corridor in Bangladesh is the demonstration setting.

The prototype provides an area-based interface, observation discovery, acquisition-date and product-maturity context, visual satellite browse layers, English/Bangla screens, evidence/provenance views, and a shareable brief. The code queries NASA CMR for NISAR Level-2 GCOV validated and provisional granule metadata and NASA OPERA RTC-S1 Sentinel-1 granule metadata. NASA GIBS provides visual browse layers, while NASA POWER provides point precipitation context.

The current application does not yet process radar raster pixels into a flood mask or measured flood area. It does not yet calculate char area, riverbank movement, L-band/C-band IoU or kappa, flooded-cropland area, or ground displacement. Where these values are not available, it displays “No data available.” The proposed scientific next step is a reproducible, deterministic raster pipeline with quality checks, sensor-specific classification, common-grid comparison, independent validation where available, and explicit uncertainty and provenance. TORONGO is a post-observation exploration tool, not a flood forecast or warning system.

## NASA data rows

1. **NISAR L2 GCOV validated + provisional granule metadata (NASA CMR)**  
   Link: https://cmr.earthdata.nasa.gov/search/granules.umm_json  
   Use: Search NASA CMR for NISAR GCOV granule metadata, acquisition dates, product identifiers, and data maturity for selected river areas. The app does not currently download/process raster pixels.
2. **NASA OPERA L2 RTC-S1 Sentinel-1 granule metadata**  
   Link: https://cmr.earthdata.nasa.gov/search/granules.umm_json  
   Use: Discover metadata for the NASA OPERA terrain-corrected Sentinel-1 C-band comparison product. It is derived from ESA Sentinel-1; the current app does not process its raster pixels.
3. **NASA GIBS browse imagery (MODIS Terra, NISAR GCOV, OPERA RTC-S1, OPERA DSWx-S1)**  
   Link: https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi  
   Use: Display visual browse layers as map context. WMS images are not used as quantitative measurements or as a processed water mask.
4. **NASA POWER Daily API - PRECTOTCORR**  
   Link: https://power.larc.nasa.gov/api/temporal/daily/point  
   Use: Retrieve point precipitation estimates for the selected study-area coordinates as contextual rainfall information; precipitation is not treated as a flood detector.

## Other space agency data

**ESA Copernicus Sentinel-1** - https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1  
The Sentinel-1 C-band mission is represented through NASA OPERA RTC-S1 and OPERA DSWx-S1 products/layers. The current app accesses their NASA-distributed metadata/browse service; it does not directly fetch raw ESA Sentinel-1 data.

**NISAR (NASA-ISRO mission)** - https://nisar.jpl.nasa.gov/  
NISAR is the central L-band mission for the challenge. The current app accesses NASA CMR metadata and a NASA GIBS browse layer, not pixel-level GCOV processing.

## Other datasets

None integrated in the current prototype beyond the sources listed above. Do not add ESA WorldCover, JRC Global Surface Water, Copernicus DEM, GHSL, HLS, GPM, or Bangladesh gauge data unless the team can demonstrate they were actually integrated.

## Use of AI (draft; verify Google AI Studio use)

ChatGPT (OpenAI) and Claude (Anthropic) assisted with project planning, feature/architecture review, source/documentation review, and presentation wording using team-provided source code and project notes. The in-app Advisor is a deterministic, keyword-based explainer using static reference text; it is not a generative AI model. No AI model calculates radar measurements, flood area, or validation statistics. Add Google AI Studio only if the team actually used it, with its exact role and the source material/data it processed.

## References

- NASA Space Apps Challenge 2026 - https://www.spaceappschallenge.org/
- NASA-ISRO NISAR mission - https://nisar.jpl.nasa.gov/
- NASA Common Metadata Repository - https://cmr.earthdata.nasa.gov/
- NASA Global Imagery Browse Services (GIBS) - https://earthdata.nasa.gov/data/tools/gibs
- NASA POWER - https://power.larc.nasa.gov/
- NASA OPERA - https://www.jpl.nasa.gov/go/opera/
- ESA Copernicus Sentinel-1 - https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1
- Expo - https://expo.dev/
- React Native - https://reactnative.dev/
- React - https://react.dev/
- React Native SVG - https://github.com/software-mansion/react-native-svg
- Expo Linear Gradient - https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- Expo Print - https://docs.expo.dev/versions/latest/sdk/print/
- Expo Sharing - https://docs.expo.dev/versions/latest/sdk/sharing/
- Google Fonts packages used by the app: Inter, Manrope, Noto Sans Bengali - https://fonts.google.com/

## Prototype viewer (additional demo link)

Team-supplied address: https://torongo-prototype-viewer.ai.studio. Verify it in a normal browser before relying on it. It does not replace the public GitHub source repository link.

## Links to paste

- 240-second YouTube video: **REQUIRED - paste the actual Public/Unlisted YouTube URL. No video file or URL was included in the supplied materials.**
- Public repository: paste the actual public URL after creating the GitHub repository and uploading these files.
- NASA Space Apps project page: https://www.spaceappschallenge.org/2026/find-a-team/chronos6/?tab=details
