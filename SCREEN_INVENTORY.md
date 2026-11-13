# Application screen inventory

The current source has 25 routed screens/components, grouped below by navigation flow. This inventory describes the interface structure, not 25 independently validated scientific capabilities.

| Flow | Screens / routes | Purpose |
|---|---|---|
| Entry and navigation | Splash, Home, MapPage | Brand entry, feature launcher, map surface. |
| Sky Calendar / Scene Finder | SkyWhere, SkyFound, SkyPair | Select area, browse observation dates, inspect available scene metadata and pair choices. |
| Delta / Change Workbench | DeltaWhatChanged, DeltaNumbers, DeltaOverTime | Present before/after change concepts, no-data numeric outputs, and precipitation/observation context. |
| Duet / L-band vs C-band | DuetTwoViews, DuetDiffer, DuetChecked | Compare the L-band and C-band viewing concepts and their differences; analytical masks/statistics are not yet computed. |
| Spot Check / Inspect a Location | SpotTap, SpotRadarSays, SpotEvidence | Select a location, view a schematic/signal explanation, and inspect supporting evidence notes. |
| Trust Ledger | TrustList, TrustDetails | Explain source, maturity, provenance, and evidence labels. |
| Evidence Brief | BriefBuild, BriefPreview | Prepare and preview a shareable summary/export. |
| Advisor (Explain Layer) | AdvisorHello, AdvisorChat, AdvisorWalkthrough | Static keyword-matched explainer and walkthrough; not generative AI. |
| Legacy Community | CommunityHome, CommunityPosts, CommunityPostDetail | Local prototype discussions/posts; no production accounts, moderation backend, or persistent community service. |

All screen route names are defined in `app/App.js` within `ScreenRouter`.
