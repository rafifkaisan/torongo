// TORONGO Expo prototype. It discovers NASA CMR granule metadata, displays NASA GIBS
// browse layers, and retrieves NASA POWER precipitation context. Pixel-level SAR
// classification, area measurement, and cross-sensor validation are not implemented.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, BackHandler, Image, Modal, PanResponder,
  Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Line, Path, Polyline, Rect } from 'react-native-svg';
import { useFonts } from 'expo-font';
import { Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { NotoSansBengali_600SemiBold, NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ============================================================================
// CONFIG & THEME
// ============================================================================
const NASA_CMR_GRANULES_URL = 'https://cmr.earthdata.nasa.gov/search/granules.umm_json';
const NASA_GIBS_WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const NASA_POWER_DAILY_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';

const NISAR_VALIDATED_SHORT_NAME = 'NISAR_L2_GCOV_V1';
const NISAR_PROVISIONAL_SHORT_NAME = 'NISAR_L2_GCOV_PROVISIONAL_V1';
const OPERA_RTC_S1_SHORT_NAME = 'OPERA_L2_RTC-S1_V1';
const USE_DEMO_DATA = false;

// --- NASA GIBS layer IDs (edit here if a layer name is wrong; check GetCapabilities) ---
const GIBS_BACKDROP_LAYER = 'MODIS_Terra_CorrectedReflectance_TrueColor'; // true-colour photo, 250 m
const GIBS_NISAR_LAYER = 'NISAR_L2_Geocoded_Polarimetric_Covariance_12Day';
const GIBS_OPERA_RTC_LAYER = 'OPERA_L2_Radiometric_Terrain_Corrected_SAR_Sentinel-1_12Day';
const GIBS_OPERA_WATER_LAYER = 'OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1';
// Dates used for map images. These are populated from selected catalogue observations when available.
let LAYER_DATES = { before: null, after: null };
let MONTH_LOADED = {};

const COLORS = {
  logoBlue: '#197AE3', primaryBlue: '#2EA4FF', accentBlue: '#2E9AFF', lightBlue: '#58B7FF',
  deepBlue: '#0077D1', navyBlue: '#00589B', tint1: '#E6F4FF', tint2: '#B3DFFF',
  blueLight: '#7FC8FF', blueMedium: '#308EDB', shade1: '#156CB3', shade2: '#0D4F8B',
  bgVeryLight: '#F8FBFF', bgLight: '#F0F6FF', surface: '#E6EFFA', elevated: '#D6E6F7',
  border: '#C1D7ED', white: '#FFFFFF', landLight: '#E8F1E5', land: '#C8D9B6',
  landDark: '#8FB082', sandChar: '#F3E6C8', shallowWater: '#E3F2FF', water: '#9FD3FF',
  deepWater: '#4DA8FF', veryDeepWater: '#1B6ED1', alertRed: '#FF5252', warningOrange: '#FF8A3D',
  verifiedGold: '#FFC857', calmGreenBg: '#E9F9EF', calmGreenText: '#146C43',
  trustGoldIcon: '#B7791F', trustGoldCircle: '#FFF6DD', briefGreenIcon: '#4F7A3D',
  briefGreenCircle: '#E8F1E5', communitySandIcon: '#8A6A2F', communitySandCircle: '#F3E6C8',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
};

const GRADIENTS = {
  gradient1: ['#2EA4FF', '#58B7FF'], gradient2: ['#2E9AFF', '#0077D1'],
  gradient3: ['#58B7FF', '#1B6ED1'], gradient4: ['#E6F4FF', '#7FC8FF'], gradient5: ['#00589B', '#2E9AFF'],
};

const FEATURE_COLORS = {
  skyCalendar: { icon: '#2EA4FF', circle: '#E6F4FF' },
  delta: { icon: '#1B6ED1', circle: '#E3F2FF' },
  duet: { icon: '#0077D1', circle: '#D6E6F7' },
  spotCheck: { icon: '#00589B', circle: '#E6EFFA' },
  trustLedger: { icon: '#B7791F', circle: '#FFF6DD' },
  evidenceBrief: { icon: '#4F7A3D', circle: '#E8F1E5' },
  aiAdvisor: { gradient: ['#2E9AFF', '#0077D1'], icon: '#FFFFFF', circle: 'rgba(255,255,255,0.22)', pillBg: '#FFFFFF', pillText: '#0077D1' },
  community: { icon: '#8A6A2F', circle: '#F3E6C8' },
  mapWidget: { gradient: ['#E6F4FF', '#7FC8FF'], gridLine: '#B3DFFF', pinIcon: '#0077D1' },
  languageToggle: { bg: '#FFFFFF', border: '#C1D7ED', activeBg: '#0077D1', activeText: '#FFFFFF', inactiveText: '#0F172A' },
};

const FONTS = {
  headingExtraBold: 'Manrope_800ExtraBold', headingBold: 'Manrope_700Bold',
  bodySemiBold: 'Inter_600SemiBold', bodyBold: 'Inter_700Bold',
  bengaliSemiBold: 'NotoSansBengali_600SemiBold', bengaliBold: 'NotoSansBengali_700Bold',
};

const SPACING = { xs: 8, sm: 16, md: 20, lg: 24, xl: 32 };
const RADIUS = { card: 24, button: 16, pill: 999 };
const FRAME = { width: 402, height: 874 };
const TOP_NOTCH_SPACE = Platform.OS === 'android' ? (StatusBar.currentHeight || 32) + 16 : Platform.OS === 'ios' ? 18 : 44;

// ============================================================================
// TRANSLATIONS (en, bn)
// ============================================================================
const en = {
  brandName: 'TORONGO', splashTagline: 'Earth changes. Evidence makes sense of it.',
  homePrompt: 'Pick what you want to do.', demoDataPill: 'NASA Data Preview',
  noDataAvailable: 'No data available', tryAgain: 'Try again',
  calmError: "We couldn't load this. Please try again.", moreDetails: 'More details',
  backToHome: 'Back to Home', calculatedWord: 'Calculated',
  daySun: 'Sun', dayMon: 'Mon', dayTue: 'Tue', dayWed: 'Wed', dayThu: 'Thu', dayFri: 'Fri', daySat: 'Sat',
  evidenceObserved: 'Observed', evidenceDerived: 'Derived', evidenceProposed: 'Proposed',
  evidenceObservedMeaning: 'Seen directly by the satellite.',
  evidenceDerivedMeaning: 'Worked out from the satellite data.',
  evidenceProposedMeaning: 'Our best explanation. Not confirmed.',
  allThreeLabelsHeading: 'All three labels:',
  featureSkyCalendar: 'Sky Calendar', featureSkyCalendarDesc: 'Find satellite observations',
  featureDelta: 'Delta', featureDeltaDesc: 'See what changed',
  featureDuet: 'Duet', featureDuetDesc: 'L-band and C-band',
  featureSpotCheck: 'Spot Check', featureSpotCheckDesc: 'Inspect one location',
  featureTrustLedger: 'Trust Ledger', featureTrustLedgerDesc: 'Where every result came from',
  featureEvidenceBrief: 'Evidence Brief', featureEvidenceBriefDesc: 'A one-page summary to share',
  featureAiAdvisor: 'Explain Layer', featureAiAdvisorDesc: 'Plain-language radar and evidence notes.',
  featureCommunity: 'Community', featureCommunityDesc: 'Ask, answer and learn together',
  aiPill: 'GUIDE', mapTitle: 'Map', mapTapToOpen: 'Tap to open the NASA browse map',
  mapSearchPlaceholder: 'Search river area...', layerRadar: 'NISAR Radar',
  layerFlood: 'OPERA Water Browse', layerIslands: 'True Color',
  pickDatesBtn: 'Pick dates', spotCheckHereBtn: 'Spot Check here',
  legendRiver: 'BLUE = NISAR L-BAND / RIVER WATER',
  legendFlooded: 'RED = visual layer colour; not a risk rating',
  legendIsland: 'YELLOW = visual layer colour; not a crop classification',
  legendFarmland: 'GREEN = visual land-cover colour; not a safety assessment',
  legendWaterTrue: 'DARK BLUE / BLACK = river and water',
  legendVegTrue: 'GREEN = vegetation and farmland',
  legendSandTrue: 'TAN / LIGHT BROWN = sand, bare soil, possible chars',
  legendCloudTrue: 'WHITE = cloud (hides the ground)',
  legendOverlayTrue: 'COLOURED LAYER ON TOP = NASA GIBS radar browse layer (when available for the date)',
  calLoading: 'Loading NASA observations...',
  calNoScenesMonth: 'No NASA scenes found for this area in this month.',
  legendBothWater: 'BLUE = Both see water',
  legendOnlyLBand: 'YELLOW = MEDIUM (Only NISAR L-band)',
  legendOnlyCBand: 'RED = HIGH DISAGREEMENT (Only C-band)',
  gibsVisualNote: 'Photo: NASA GIBS MODIS true-colour. Coloured layer: NASA GIBS radar browse. For viewing only, not measurement.',
  area1Name: 'Jamuna North Bend', area1Short: 'Braided river reach (89.62°E – 89.92°E, 24.35°N – 24.85°N)',
  area2Name: 'Sirajganj Char Belt', area2Short: 'Char farmland reach (89.60°E – 89.88°E, 24.30°N – 24.65°N)',
  area3Name: 'Teesta Reach', area3Short: 'Northern braided reach (89.15°E – 89.65°E, 25.55°N – 25.95°N)',
  skyWhereTitle: 'Where?', skyWhereSubtitle: 'Pick a river area and your Before and After dates.',
  riverAreaLabel: 'River area', datesToCompareLabel: 'Dates to compare',
  beforeLabel: 'Before', afterLabel: 'After',
  pickBeforeDateTitle: 'Pick Before date', pickAfterDateTitle: 'Pick After date',
  findObservationsBtn: 'Find observations', skyFoundTitle: 'Sky Calendar',
  skyFoundSubtitle: 'Tap a day with an observation for Before, then After.',
  partialCoverageBanner: 'Searching NISAR Validated (V1) first, then Provisional (V1).',
  noObservationOnDay: 'No observation on this day.',
  satelliteNisar: 'NISAR L2 GCOV', satelliteSentinel: 'Sentinel-1 RTC',
  readinessEarly: 'VALIDATED (V1)', readinessPreview: 'PROVISIONAL (V1)', readinessOpera: 'OPERA RTC-S1 · Sentinel-1 C-band',
  coverageFull: 'Covers your area', coveragePartial: 'Scene available in NASA CMR', coverageUnverified: 'Coverage not verified',
  coverageMissing: 'No coverage here', checkThisPairBtn: 'Check this pair',
  skyPairTitle: 'Your pair', skyPairSubtitle: 'Here is how well these two observations work together.',
  matchGood: 'Good match', matchOkay: 'Okay match', matchNotIdeal: 'Not ideal',
  matchGoodSummary: 'Both observations are listed in NASA CMR. Scientific comparability still needs product, geometry, and raster checks.',
  matchOkaySummary: 'Mixes VALIDATED and PROVISIONAL maturity levels (see ASF guide warning).',
  matchNotIdealSummary: 'One observation misses this river area. Pick another date.',
  tickCoversArea: 'Covers your area', tickCoversAreaPass: 'Retrieved from NASA CMR for your study reach.',
  tickCoversAreaPartial: 'Retrieved from NASA CMR global catalogue.', tickCoversAreaMissing: 'No coverage here.',
  tickDatesClose: 'Dates close enough', tickDatesClosePass: 'The acquisition dates are close in time; this alone does not establish a valid comparison.',
  tickDatesCloseFail: 'You picked the same date twice.',
  tickDataReady: 'Data maturity', tickDataReadyPass: 'Both scenes share the same processing maturity.',
  tickDataReadyMix: 'Combines VALIDATED and PROVISIONAL maturity levels.', openInDeltaBtn: 'Open in Delta',
  deltaWhatChangedTitle: 'What changed?', deltaWhatChangedSubtitle: 'Drag the handle to compare Before and After NASA GIBS layers.',
  beforePill: 'BEFORE', afterPill: 'AFTER',
  floodedAreaTitle: 'Flooded area (planned calculation)',
  floodedAreaNote: 'Not calculated in this prototype. Requires raster pixels, a documented water mask, and area calculation.',
  moreNumbersBtn: 'More numbers', deltaNumbersTitle: 'The numbers',
  deltaNumbersSubtitle: 'Flood and river measurements are not available in this prototype.',
  islandSizeTitle: 'River island (char) size', islandSizeNote: 'Requires 30 m aligned water mask polygon extraction.',
  riverEdgeMovedTitle: 'River edge moved', riverEdgeMovedNote: 'Requires multi-date shoreline vector comparison.',
  farmlandAffectedTitle: 'Farmland possibly affected', farmlandAffectedNote: 'Planned only. A validated water-change mask and a connected land-cover dataset are required.',
  unitKm2: 'km²', unitMetres: 'metres', unitHectares: 'hectares',
  seeOverTimeBtn: 'See it over time', deltaOverTimeTitle: 'Over time',
  deltaOverTimeSubtitle: 'Browse NASA imagery and NASA POWER precipitation context.',
  rainMeasuredLabel: 'NASA POWER precipitation estimate (mm/day)',
  floodedInCountLine: '{x} NISAR & {y} Sentinel-1 scenes retrieved from NASA CMR',
  openFullSpotCheckBtn: 'Open full Spot Check',
  duetTwoViewsTitle: 'Two views', duetTwoViewsSubtitle: 'Drag the handle to compare NISAR L-band and Sentinel-1 C-band.',
  lBandPill: 'L-BAND', cBandPill: 'C-BAND',
  lBandChipLine: 'L-band (NISAR GCOV, 24 cm): reaches through plants better',
  cBandChipLine: 'C-band (Sentinel-1 RTC, 5.6 cm): sees mostly the top of plants',
  whereDifferBtn: 'Where do they differ?', duetDifferTitle: 'Where they differ',
  duetDifferSubtitle: 'Compare classified water maps on a common 30 m grid.',
  tabLBand: 'L-band', tabCBand: 'C-band', tabDifferences: 'Differences',
  mostlyMatchHeadline: '30 m Grid Comparison: No data available (Requires COG server)',
  differNote: 'Do not subtract raw L-band and C-band backscatter directly; compare classified water masks.',
  iouExplain: 'IoU = |A ∩ B| ÷ |A ∪ B| (Requires aligned 30 m water masks: No data available).',
  kappaExplain: 'Cohen’s Kappa measures agreement beyond chance on the common 30 m grid.',
  wasThisCheckedBtn: 'Was this checked?', duetCheckedTitle: 'Was it checked?',
  duetCheckedSubtitle: 'Optical reference imagery is not connected in this prototype; validation remains Not Tested.',
  checkedTrueCard: 'Optical validation: a suitable clear-sky scene and comparison method must be verified.',
  checkedFalseCard: 'Optical validation: Not Tested — no optical reference service is connected.',
  showFarmlandToggle: 'Show OPERA DSWX water layer', possibleFloodedPlants: 'Possible flooded plants',
  spotTapTitle: 'Tap the map', spotTapSubtitle: 'Drop a pin anywhere on the NASA GIBS map to inspect it.',
  selectedSpotTitle: 'Your selected spot', spotNameDefault: 'AOI Study Reach Pin',
  lookCloserBtn: 'Look closer', spotRadarSaysTitle: 'What the radar says',
  spotRadarSaysSubtitle: 'A location-inspection layout; no calibrated pixel series is loaded yet.',
  findingLandToWater: 'Pixel backscatter and change class: No data available',
  normalBandPrefix: 'Historical context:', baselineFiveYearS1: 'Planned Sentinel-1 historical baseline; not connected',
  chartCaption: 'No calibrated time series or seasonal baseline has been loaded for this location.',
  whatBacksThisUpBtn: 'What backs this up?', spotEvidenceTitle: 'Evidence',
  spotEvidenceSubtitle: 'What each NASA & partner dataset can show and cannot prove.',
  whatCanShowLabel: 'What it can show', whatCannotProveLabel: 'What it cannot prove',
  src1Title: 'NISAR L2 GCOV metadata (NASA CMR)',
  src1Can: 'The GCOV product contains L-band radar covariance; this prototype only queries CMR catalogue metadata and does not load its pixel values.',
  src1Cannot: 'This prototype does not derive a water mask, flood area, water depth, or flow velocity from GCOV pixels.',
  src2Title: 'Sentinel-1 / NASA OPERA RTC-S1 and DSWx-S1 browse layers',
  src2Can: 'NASA OPERA distributes Sentinel-1 C-band terrain-corrected and water-extent products; this app uses their metadata or browse layer for context.',
  src2Cannot: 'OPERA DSWx-S1 is derived from Sentinel-1 and is not independent validation; this prototype does not process its pixels.',
  src3Title: 'JRC Global Surface Water (planned; not connected)',
  src3Can: 'Could provide historical water occurrence and seasonality if integrated in a later version.',
  src3Cannot: 'It is not connected to this prototype and is not an event-date flood observation.',
  src4Title: 'ESA WorldCover and NASA HLS (planned; not connected)',
  src4Can: 'Could provide land-cover context and a clear-sky optical reference if integrated.',
  src4Cannot: 'These layers are not connected in the current prototype and cannot confirm crop damage.',
  trustTitle: 'How sure are we?', trustSubtitle: 'Source records, product maturity, and current data limitations.',
  trustDetailsTitle: 'Result details', whereCameFromLabel: 'Where it came from (NASA CMR)',
  observationDateLabel: 'Observation date', dataReadinessLabel: 'Product maturity',
  whatRadarCannotTellTitle: 'What radar cannot tell you',
  cannotBullet1: 'How deep the floodwater is in metres.',
  cannotBullet2: 'Never treat a GIBS browse image as an analytically processed dataset.',
  cannotBullet3: 'Never treat cross-sensor disagreement as proof that one sensor is correct.',
  evRec1Title: 'NISAR L2 GCOV catalogue metadata', evRec1Val: 'Scene identifier, acquisition date, and maturity metadata when returned by CMR; raster pixels are not processed.',
  evRec1From: 'NASA CMR · NISAR_L2_GCOV_V1', evRec1Ready: 'Check the maturity field on each returned granule; this card is not a pixel-level validation result.',
  evRec2Title: 'NISAR L2 GCOV provisional metadata', evRec2Val: 'Earlier NISAR catalogue records; no raster measurement is computed.',
  evRec2From: 'NASA CMR · NISAR_L2_GCOV_PROVISIONAL_V1', evRec2Ready: 'PROVISIONAL product maturity must remain visible and must not be called fully validated.',
  evRec3Title: 'NASA GIBS NISAR / OPERA browse imagery', evRec3Val: 'Rendered visual context for map exploration only.',
  evRec3From: 'NASA GIBS WMS · browse layers', evRec3Ready: 'A browse image is not an analytically processed water mask.',
  evRec4Title: 'NASA POWER precipitation context', evRec4Val: 'Point precipitation estimate; it does not define flood extent.',
  evRec4From: 'NASA POWER Daily API · PRECTOTCORR', evRec4Ready: 'Context only. No rainfall threshold is used as a flood detector.',
  evRec4Warn: 'Precipitation is not a spatial flood map or a ground-truth reference.',
  evRec5Title: 'Flood and river-change measurements', evRec5Val: 'No data available — raster analysis is not implemented.',
  evRec5From: 'Planned NISAR GCOV + suitable comparison and reference datasets', evRec5Ready: 'Proposed capability — requires deterministic raster processing and validation.',
  evRec5Warn: 'No raster-processing service is connected in this prototype.', demoVersionLabel: 'Prototype source note',
  briefBuildTitle: 'Build your brief', briefBuildSubtitle: 'Choose what to include in your one-page summary.',
  includeMapToggle: 'Include NASA GIBS map', includePopToggle: 'Include population-data limitation note',
  languageToggleLabel: 'Language: English / বাংলা', previewBtn: 'Preview',
  briefPageTitle: 'Your one-page brief', briefDocHeading: 'TORONGO — NASA NISAR Evidence Brief',
  priorityPlacesHeading: 'Key Scientific Rules & Status:',
  place1Name: 'Primary Input: NISAR L2 GCOV', place1Reason: 'Searches NISAR_L2_GCOV_V1 (Validated) first and PROVISIONAL_V1 second.',
  place2Name: 'Visual Layer: NASA GIBS', place2Reason: 'Displays NISAR_L2_Geocoded_Polarimetric_Covariance browse imagery.',
  place3Name: 'Numerical Raster Math', place3Reason: 'No data available; radar raster processing is not implemented.',
  populationEstimateLine: 'Population exposure: No data available (no population raster integrated)',
  limitsHeading: 'Limits',
  limit1: 'Never present a GIBS browse image as an analytically processed dataset.',
  limit2: 'Never present L-band vs C-band disagreement as proof that one sensor is correct.',
  limit3: 'Keep maturity (VALIDATED vs PROVISIONAL) attached to every scene.',
  shareAsPdfBtn: 'Share as PDF', backToEditBtn: 'Back to edit', briefSharedBanner: 'One-page brief prepared for sharing.',
  advisorHelloTitle: 'Hello', advisorHelloIntro: 'Pick your role or tap a question below to get started.',
  advisorAiDisclosure: 'This guide uses fixed reference notes and keyword matching. It does not analyse satellite pixels or calculate measurements.',
  yourRoleLabel: 'Your role', roleResourceManager: 'Resource manager', roleFarmer: 'Farmer',
  roleResearcher: 'Researcher', roleStudent: 'Student', suggestedQuestionsLabel: 'Suggested questions',
  qWhatIsChar: 'What is the NISAR maturity update?', qWhatIsProposed: 'What does Proposed mean?',
  qWhatChanged: 'What scenes were found in NASA CMR?', qWhyNotTested: 'Why is this Not Tested?',
  askAQuestionBtn: 'Ask a question', walkMeThroughBtn: 'Walk me through it',
  advisorChatTitle: 'Explain Layer', advisorChatPlaceholder: 'Ask about NISAR, radar, or the evidence notes...',
  sendBtn: 'Send', newChatBtn: 'New chat', sourceChipPrefix: 'Source:',
  advisorSafetyRefusal: "I can't help with that. Please follow your local disaster management office.",
  advisorNoDataFallback: 'I do not have that in the data.',
  advisorDontKnowFallback: 'I do not have that in the reference notes. Try asking about NISAR, data maturity, evidence labels, or a feature.',
  openDeltaSmallBtn: 'Open Delta', openDuetSmallBtn: 'Open Duet',
  openSpotCheckSmallBtn: 'Open Spot Check', openTrustLedgerSmallBtn: 'Open Trust Ledger',
  advisorWalkTitle: 'Walk me through it', advisorWalkSubtitle: 'The current NASA data connections and their limits, step by step.',
  prevStepBtn: 'Back', nextStepBtn: 'Next', doneStepBtn: 'Done',
  communityTitle: 'Community', communitySubtitle: 'Ask, answer and learn together.',
  communityRulesHeading: 'Community rules',
  rule1: 'Be kind and respectful to everyone.', rule2: 'No phone numbers or home addresses.',
  rule3: 'No photos of identifiable people.', rule4: 'Nothing about children.', rule5: 'This is not an official warning.',
  notOfficialWarningBanner: 'Not an official warning. Follow your local authorities.',
  communitySearchPlaceholder: 'Search posts or topics...',
  topicGroupByArea: 'By river area', topicGroupByFeature: 'By feature', topicGroupNewToRadar: 'New to Radar',
  topicUsingSkyCalendar: 'Using Sky Calendar', topicUsingDelta: 'Using Delta',
  topicUsingDuet: 'Using Duet', topicUsingSpotCheck: 'Using Spot Check', topicNewToRadar: 'New to Radar',
  postsTitle: 'Posts', postDetailTitle: 'Post',
  userReportedTag: 'User-reported, not checked by TORONGO',
  samplePostByTeamTag: 'Architecture note from the team',
  localObsTag: 'Local observation',
  localObsIsolationLine: 'This stays here. It is never added to the satellite results.',
  selfDescribedSuffix: 'self-described', roleOfficial: 'Official', roleLocalObserver: 'Local observer',
  repliesCountLabel: '{count} replies', bestAnswerBadge: 'Best answer',
  markAsBestAnswerBtn: 'Mark as best answer', reportBtn: 'Report',
  reportCalmThanks: 'Thank you. We hid this item for you.',
  replyPlaceholder: 'Write a helpful reply...', replyBtn: 'Reply',
  newPostSheetTitle: 'New post', postTitlePlaceholder: 'Short question or title...',
  postBodyPlaceholder: 'Write your question or note (no phone numbers or addresses)...',
  attachSnapshotBtn: 'Attach NASA GIBS map snapshot',
  snapshotAttachedLabel: 'NASA GIBS snapshot attached (NISAR L2 GCOV)',
  safetyCheckboxLabel: 'My post has no identifiable people and nothing about children',
  publishPostBtn: 'Post', rateLimitCalmMsg: 'Please wait a minute before posting again.',
  signInSheetTitle: 'Sign in to post', emailPlaceholder: 'Your email address...',
  pickRoleLabel: 'Pick your role (shown as self-described)', continueBtn: 'Continue',
};

// NEEDS NATIVE BANGLA REVIEW
const bn = {
  ...en,
  brandName: 'তরঙ্গ', splashTagline: 'পৃথিবী বদলায়। তথ্য সেই পরিবর্তন সহজ করে।',
  homePrompt: 'আপনি কী করতে চান বেছে নিন।', demoDataPill: 'নাসা তথ্য প্রিভিউ',
  noDataAvailable: 'কোনো তথ্য পাওয়া যায়নি (No data available)', tryAgain: 'আবার চেষ্টা করুন',
  calmError: 'আমরা এটি লোড করতে পারিনি। অনুগ্রহ করে আবার চেষ্টা করুন।', moreDetails: 'আরও বিস্তারিত',
  backToHome: 'হোমে ফিরে যান', calculatedWord: 'হিসাবকৃত',
  daySun: 'রবি', dayMon: 'সোম', dayTue: 'মঙ্গল', dayWed: 'বুধ', dayThu: 'বৃহঃ', dayFri: 'শুক্র', daySat: 'শনি',
  evidenceObserved: 'পর্যবেক্ষিত', evidenceDerived: 'হিসাবকৃত', evidenceProposed: 'প্রস্তাবিত',
  evidenceObservedMeaning: 'স্যাটেলাইট সরাসরি এটি দেখেছে।',
  evidenceDerivedMeaning: 'স্যাটেলাইটের তথ্য থেকে হিসাব করে বের করা হয়েছে।',
  evidenceProposedMeaning: 'আমাদের সেরা ব্যাখ্যা। এখনো নিশ্চিত নয়।',
  allThreeLabelsHeading: 'তিনটি চিহ্নের অর্থ:',
  featureSkyCalendar: 'স্কাই ক্যালেন্ডার', featureSkyCalendarDesc: 'স্যাটেলাইট পর্যবেক্ষণ খুঁজুন',
  featureDelta: 'ডেল্টা', featureDeltaDesc: 'কী পরিবর্তন হয়েছে দেখুন',
  featureDuet: 'ডুয়েট', featureDuetDesc: 'এল-ব্যান্ড ও সি-ব্যান্ড তুলনা',
  featureSpotCheck: 'স্পট চেক', featureSpotCheckDesc: 'একটি নির্দিষ্ট স্থান যাচাই করুন',
  featureTrustLedger: 'ট্রাস্ট লেজার', featureTrustLedgerDesc: 'প্রতিটি তথ্যের উৎস দেখুন',
  featureEvidenceBrief: 'এভিডেন্স ব্রিফ', featureEvidenceBriefDesc: 'শেয়ার করার জন্য এক পৃষ্ঠার সারসংক্ষেপ',
  featureAiAdvisor: 'ব্যাখ্যা স্তর', featureAiAdvisorDesc: 'রাডার ও প্রমাণের সহজ ব্যাখ্যা।',
  featureCommunity: 'কমিউনিটি', featureCommunityDesc: 'প্রশ্ন করুন, উত্তর দিন এবং একসাথে শিখুন',
  aiPill: 'গাইড', advisorAiDisclosure: 'এই গাইড নির্দিষ্ট রেফারেন্স নোট ও কীওয়ার্ড মিলিয়ে উত্তর দেয়। এটি স্যাটেলাইট পিক্সেল বিশ্লেষণ বা পরিমাপ করে না।', mapTitle: 'মানচিত্র', mapTapToOpen: 'নাসা ব্রাউজ মানচিত্র খুলতে ট্যাপ করুন',
  legendRiver: 'নীল (BLUE) = নিসার এল-ব্যান্ড / নদীর পানি',
  legendFlooded: 'লাল (RED) = মানচিত্রের দৃশ্যমান রং; ঝুঁকির মাত্রা নয়',
  legendIsland: 'হলুদ (YELLOW) = মানচিত্রের দৃশ্যমান রং; ফসলের শ্রেণি নয়',
  legendFarmland: 'সবুজ (GREEN) = দৃশ্যমান ভূমি-আবরণ; নিরাপত্তার নিশ্চয়তা নয়',
  legendWaterTrue: 'গাঢ় নীল / কালো = নদী ও পানি',
  legendVegTrue: 'সবুজ = গাছপালা ও ফসলি জমি',
  legendSandTrue: 'হালকা বাদামি = বালু, খালি মাটি, সম্ভাব্য চর',
  legendCloudTrue: 'সাদা = মেঘ (নিচের মাটি ঢেকে দেয়)',
  legendOverlayTrue: 'উপরের রঙিন স্তর = নাসা GIBS রাডার ব্রাউজ স্তর (ওই তারিখে থাকলে)',
  calLoading: 'নাসার পর্যবেক্ষণ লোড হচ্ছে...',
  calNoScenesMonth: 'এই মাসে এই এলাকার জন্য নাসার কোনো সিন পাওয়া যায়নি।',
  area1Name: 'যমুনা উত্তর বাঁক', area2Name: 'সিরাজগঞ্জ চর অঞ্চল', area3Name: 'তিস্তা বাঁক',
};

const LanguageContext = createContext(undefined);
const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const toggleLang = useCallback(() => setLang((prev) => (prev === 'en' ? 'bn' : 'en')), []);
  const t = useCallback((key, vars) => {
    const table = lang === 'bn' ? bn : en;
    let phrase = table[key] || en[key] || String(key);
    if (vars) Object.keys(vars).forEach((k) => { phrase = phrase.replace(`{${k}}`, String(vars[k])); });
    return phrase;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, toggleLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}

// ============================================================================
// UTILS (dates, format)
// ============================================================================
function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function today() { return localIsoDate(); }
function daysAgo(n) {
  const safeDays = Math.max(0, Math.floor(n));
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - safeDays);
  return localIsoDate(d);
}

const NISAR_DATES_ISO = []; // populated only from NASA CMR results
const SENTINEL_DATES_ISO = []; // populated only from NASA CMR results
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

function toBanglaDigits(input) { return String(input).replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)]); }
function formatNumber(n, lang, options) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return lang === 'bn' ? 'তথ্য নেই' : 'No data available';
  const formatted = options && typeof options.decimals === 'number' ? Number(n).toFixed(options.decimals) : Number(n).toLocaleString('en-US');
  return lang === 'bn' ? toBanglaDigits(formatted) : formatted;
}
function formatDate(isoString, lang, style = 'full') {
  if (!isoString) return lang === 'bn' ? 'তথ্য নেই' : 'No data available';
  const parts = String(isoString).split('-');
  if (parts.length !== 3) return lang === 'bn' ? toBanglaDigits(isoString) : String(isoString);
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day) || monthIndex < 0 || monthIndex > 11) {
    return lang === 'bn' ? toBanglaDigits(isoString) : String(isoString);
  }
  if (lang === 'bn') {
    const dayBn = toBanglaDigits(String(day));
    return style === 'short' ? `${dayBn} ${BN_MONTHS[monthIndex]}` : `${dayBn} ${BN_MONTHS[monthIndex]} ${toBanglaDigits(String(year))}`;
  }
  return style === 'short' ? `${day} ${EN_MONTHS_SHORT[monthIndex]}` : `${day} ${EN_MONTHS_SHORT[monthIndex]} ${year}`;
}
function formatMonthYear(year, monthIndex0, lang) {
  const safeMonth = Math.max(0, Math.min(11, monthIndex0));
  return lang === 'bn' ? `${BN_MONTHS[safeMonth]} ${toBanglaDigits(String(year))}` : `${EN_MONTHS_FULL[safeMonth]} ${year}`;
}

// ============================================================================
// STUDY AREAS & NASA METADATA / BROWSE STRUCTURES
// ============================================================================
const FEATURES = [
  { id: 'skyCalendar', nameKey: 'featureSkyCalendar', shortLineKey: 'featureSkyCalendarDesc', icon: 'calendar-outline', iconColor: FEATURE_COLORS.skyCalendar.icon, circleColor: FEATURE_COLORS.skyCalendar.circle, targetScreen: 'SkyWhere' },
  { id: 'delta', nameKey: 'featureDelta', shortLineKey: 'featureDeltaDesc', icon: 'swap-horizontal-outline', iconColor: FEATURE_COLORS.delta.icon, circleColor: FEATURE_COLORS.delta.circle, targetScreen: 'DeltaWhatChanged' },
  { id: 'duet', nameKey: 'featureDuet', shortLineKey: 'featureDuetDesc', icon: 'layers-outline', iconColor: FEATURE_COLORS.duet.icon, circleColor: FEATURE_COLORS.duet.circle, targetScreen: 'DuetTwoViews' },
  { id: 'spotCheck', nameKey: 'featureSpotCheck', shortLineKey: 'featureSpotCheckDesc', icon: 'location-outline', iconColor: FEATURE_COLORS.spotCheck.icon, circleColor: FEATURE_COLORS.spotCheck.circle, targetScreen: 'SpotTap' },
  { id: 'trustLedger', nameKey: 'featureTrustLedger', shortLineKey: 'featureTrustLedgerDesc', icon: 'shield-checkmark-outline', iconColor: FEATURE_COLORS.trustLedger.icon, circleColor: FEATURE_COLORS.trustLedger.circle, targetScreen: 'TrustList' },
  { id: 'evidenceBrief', nameKey: 'featureEvidenceBrief', shortLineKey: 'featureEvidenceBriefDesc', icon: 'document-text-outline', iconColor: FEATURE_COLORS.evidenceBrief.icon, circleColor: FEATURE_COLORS.evidenceBrief.circle, targetScreen: 'BriefBuild' },
  { id: 'aiAdvisor', nameKey: 'featureAiAdvisor', shortLineKey: 'featureAiAdvisorDesc', icon: 'sparkles-outline', iconColor: FEATURE_COLORS.aiAdvisor.icon, circleColor: FEATURE_COLORS.aiAdvisor.circle, isGradientCard: true, gradientColors: FEATURE_COLORS.aiAdvisor.gradient, badgeTextKey: 'aiPill', targetScreen: 'AdvisorHello' },
];

const DEMO_AREAS = [
  { id: 'DEMO-AREA-001', nameKey: 'area1Name', shortLineKey: 'area1Short', bbox: '89.62,24.35,89.92,24.85', wmsBbox: '24.35,89.62,24.85,89.92', lat: 24.6, lon: 89.77, availableDatesIso: [], defaultBeforeIso: null, defaultAfterIso: null },
  { id: 'DEMO-AREA-002', nameKey: 'area2Name', shortLineKey: 'area2Short', bbox: '89.60,24.30,89.88,24.65', wmsBbox: '24.30,89.60,24.65,89.88', lat: 24.47, lon: 89.74, availableDatesIso: [], defaultBeforeIso: null, defaultAfterIso: null },
  { id: 'DEMO-AREA-003', nameKey: 'area3Name', shortLineKey: 'area3Short', bbox: '89.15,25.55,89.65,25.95', wmsBbox: '25.55,89.15,25.95,89.65', lat: 25.75, lon: 89.4, availableDatesIso: [], defaultBeforeIso: null, defaultAfterIso: null },
];

let DEMO_OBSERVATIONS = [];
const DEMO_CHANGE_SUMMARY = {
  analysisId: 'NASA-CMR-METADATA', areaNameKey: 'area1Name', beforeDateIso: null, afterDateIso: null,
  floodedAreaKm2: null, islandSizeKm2: null, islandTrendKm2: [], islandTrendDatesIso: [],
  riverEdgeMovedMetres: null, farmlandAffectedHa: null,
};
let DEMO_OVER_TIME = {
  analysisId: 'NASA-POWER-CONTEXT', observationsCount: 0, sentinel1Count: 0,
  points: [],
};
const DEMO_BAND_COMPARISON = {
  comparisonId: 'NASA-DUET-LIVE', agreementPercent: null, bothSeeWaterKm2: null, onlyLBandKm2: null,
  onlyCBandKm2: null, iouValue: null, kappaValue: null, referenceAvailable: false, farmlandOnlyLBandHa: null,
};
const DEMO_LOCATION_INSPECTION = {
  inspectionId: 'NASA-SPOT-LIVE', spotNameKey: 'spotNameDefault', xPercent: 56, yPercent: 48, baselineSourceKey: 'baselineFiveYearS1',
  series: [],
  sources: [
    { id: 'SRC-1', titleKey: 'src1Title', canShowKey: 'src1Can', cannotProveKey: 'src1Cannot' },
    { id: 'SRC-2', titleKey: 'src2Title', canShowKey: 'src2Can', cannotProveKey: 'src2Cannot' },
    { id: 'SRC-3', titleKey: 'src3Title', canShowKey: 'src3Can', cannotProveKey: 'src3Cannot' },
    { id: 'SRC-4', titleKey: 'src4Title', canShowKey: 'src4Can', cannotProveKey: 'src4Cannot' },
  ],
};
let DEMO_TRUST_LEDGER = [
  { id: 'NASA-EVD-001', titleKey: 'evRec1Title', valueTextKey: 'evRec1Val', level: 'Proposed', cameFromKey: 'evRec1From', readinessPlainKey: 'evRec1Ready', versionLabelKey: 'demoVersionLabel', coverageWarningKey: null },
  { id: 'NASA-EVD-002', titleKey: 'evRec2Title', valueTextKey: 'evRec2Val', level: 'Proposed', cameFromKey: 'evRec2From', readinessPlainKey: 'evRec2Ready', versionLabelKey: 'demoVersionLabel', coverageWarningKey: null },
  { id: 'NASA-EVD-003', titleKey: 'evRec3Title', valueTextKey: 'evRec3Val', level: 'Proposed', cameFromKey: 'evRec3From', readinessPlainKey: 'evRec3Ready', versionLabelKey: 'demoVersionLabel', coverageWarningKey: null },
  { id: 'NASA-EVD-004', titleKey: 'evRec4Title', valueTextKey: 'evRec4Val', level: 'Proposed', cameFromKey: 'evRec4From', readinessPlainKey: 'evRec4Ready', versionLabelKey: 'demoVersionLabel', coverageWarningKey: null },
  { id: 'NASA-EVD-005', titleKey: 'evRec5Title', valueTextKey: 'evRec5Val', level: 'Proposed', cameFromKey: 'evRec5From', readinessPlainKey: 'evRec5Ready', versionLabelKey: 'demoVersionLabel', coverageWarningKey: 'evRec5Warn' },
];
let DEMO_BRIEF = {
  briefId: 'NASA-BRF-001', analysisId: 'NASA-ANL-001', areaNameKey: 'area1Name',
  beforeDateIso: null, afterDateIso: null,
  changedAreaKm2: null, estimatedPeopleInMappedArea: null,
  sceneIds: ['Querying NASA CMR (NISAR_L2_GCOV_V1 & PROVISIONAL_V1)...'],
};

const ADVISOR_LIBRARY = [
  { id: 'page-char', enTitle: 'NISAR Data Maturity Update (12 Nov 2026)', bnTitle: 'নিসার তথ্যের পরিপক্কতা আপডেট (১২ নভেম্বর ২০২৬)', enText: 'Per the ASF NISAR Data User Guide: NISAR_L2_GCOV_V1 (VALIDATED) covers all L-band acquisitions starting October 21, 2026 (released November 6) and is first priority. NISAR_L2_GCOV_PROVISIONAL_V1 covers June 17 through October 23, 2026.', bnText: 'এএসএফ নিসার নির্দেশিকা অনুযায়ী: NISAR_L2_GCOV_V1 (ভ্যালিডেটেড) ২১ অক্টোবর ২০২৬ থেকে শুরু হওয়া সব এল-ব্যান্ড পর্যবেক্ষণ কভার করে (প্রথম অগ্রাধিকার)। NISAR_L2_GCOV_PROVISIONAL_V1 ১৭ জুন থেকে ২৩ অক্টোবর ২০২৬ পর্যন্ত কভার করে।', enLimitNote: 'Processing differences between VALIDATED and PROVISIONAL maturity levels can create apparent differences in a time series.', bnLimitNote: 'ভ্যালিডেটেড এবং প্রভিশনাল তথ্যের প্রক্রিয়াকরণ পার্থক্যের কারণে সময়ের ধারায় আপাত পার্থক্য দেখা দিতে পারে।', keywords: ['char', 'maturity', 'validated', 'provisional', 'update', 'nisar_l2_gcov_v1', 'october', 'november', 'পরিপক্কতা', 'ভ্যালিডেটেড', 'চর'], actionScreen: 'SkyFound', actionLabelKey: 'openDeltaSmallBtn' },
  { id: 'page-evidence-labels', enTitle: 'Observed, Derived, and Proposed', bnTitle: 'পর্যবেক্ষিত, হিসাবকৃত এবং প্রস্তাবিত', enText: 'Observed means directly represented in a retrieved source record or browse asset, such as a CMR granule record or GIBS browse image. Derived (Calculated) means calculated deterministically from source measurements. Proposed means a possible interpretation that has not been directly established on the ground.', bnText: 'পর্যবেক্ষিত (Observed) মানে নাসা স্যাটেলাইটের মূল তথ্য দ্বারা সরাসরি প্রদর্শিত। হিসাবকৃত (Derived) মানে মূল তথ্য থেকে গাণিতিকভাবে বের করা। প্রস্তাবিত (Proposed) মানে সম্ভাব্য ব্যাখ্যা যা এখনো মাঠে সরাসরি প্রমাণিত হয়নি।', enLimitNote: 'Never present a Proposed interpretation as a confirmed ground measurement.', bnLimitNote: 'প্রস্তাবিত (Proposed) ব্যাখ্যাকে কখনোই মাঠের নিশ্চিত পরিমাপ হিসেবে ধরবেন না।', keywords: ['proposed', 'derived', 'observed', 'calculated', 'label', 'meaning', 'mean', 'sure', 'প্রস্তাবিত', 'হিসাবকৃত', 'পর্যবেক্ষিত', 'মানে'], actionScreen: 'TrustList', actionLabelKey: 'openTrustLedgerSmallBtn' },
  { id: 'page-loaded-results', enTitle: 'NASA CMR metadata and GIBS browse layers', bnTitle: 'নাসা CMR মেটাডেটা ও GIBS ব্রাউজ স্তর', enText: 'TORONGO queries NASA CMR granule metadata for NISAR_L2_GCOV_V1, NISAR_L2_GCOV_PROVISIONAL_V1, and OPERA_L2_RTC-S1_V1. Visual layers come from NASA GIBS WMS, and point precipitation context comes from NASA POWER.', bnText: 'তরঙ্গ NASA CMR থেকে NISAR GCOV এবং OPERA RTC-S1 গ্র্যানিউল মেটাডেটা অনুসন্ধান করে। মানচিত্রের দৃশ্যমান স্তর NASA GIBS WMS থেকে এবং বৃষ্টিপাতের প্রেক্ষাপট NASA POWER থেকে আসে।', enLimitNote: 'CMR returns catalogue metadata and GIBS returns browse imagery. Without a raster-processing service, pixel-level water masks and area calculations display No data available.', bnLimitNote: 'CMR কেবল ক্যাটালগ মেটাডেটা এবং GIBS ব্রাউজ ছবি দেয়। রাস্টার প্রক্রিয়াকরণ ছাড়া পিক্সেল-ভিত্তিক পানির মানচিত্র বা ক্ষেত্রফল No data available দেখায়।', keywords: ['what changed', 'changed', 'my area', 'results', 'scenes', 'cmr', 'gibs', 'gcov', 'found', 'পরিবর্তন', 'ফলাফল', 'সিন'], actionScreen: 'DeltaWhatChanged', actionLabelKey: 'openDeltaSmallBtn' },
  { id: 'page-limits', enTitle: 'Why Not Tested & Radar Scientific Rules', bnTitle: 'কেন যাচাই করা হয়নি ও রাডারের বৈজ্ঞানিক নিয়ম', enText: 'Optical validation is not connected in this prototype and remains Not Tested. A future test would require a suitable clear-sky optical scene over the AOI. Never present a GIBS browse image as an analytically processed dataset, and never present L-band vs C-band disagreement as proof that one sensor is correct.', bnText: 'বর্তমান প্রোটোটাইপে অপটিক্যাল যাচাইকরণ সংযুক্ত নয়, তাই এটি Not Tested থাকে। কখনোই GIBS ব্রাউজ ছবিকে গাণিতিক ডেটাসেট বা দুই সেন্সরের পার্থক্যকে একক সেন্সরের প্রমাণ হিসেবে ধরবেন না।', enLimitNote: 'OPERA DSWX-S1 targets open water bodies larger than 3 hectares and 200 metres in width.', bnLimitNote: 'OPERA DSWX-S1 মূলত ৩ হেক্টরের বড় এবং ২০০ মিটারের বেশি চওড়া জলাশয় চিহ্নিত করে।', keywords: ['not tested', 'not checked', 'checked', 'why', 'clear-sky', 'photo', 'limit', 'cannot', 'prove', 'gibs', 'hls', 'যাচাই', 'কেন'], actionScreen: 'DuetChecked', actionLabelKey: 'openDuetSmallBtn' },
];

const WALKTHROUGH_STEPS = [
  { id: 'w1', enTitle: '1. NISAR Comes First (GCOV V1)', bnTitle: '১. নিসার সবার আগে (GCOV V1)', enBody: 'TORONGO searches NISAR_L2_GCOV_V1 (Validated, from Oct 21, 2026) first, and NISAR_L2_GCOV_PROVISIONAL_V1 (Jun 17 – Oct 23, 2026) for earlier flood dates.', bnBody: 'তরঙ্গ প্রথমে NISAR_L2_GCOV_V1 (ভ্যালিডেটেড, ২১ অক্টোবর ২০২৬ থেকে) এবং পূর্ববর্তী বন্যার জন্য NISAR_L2_GCOV_PROVISIONAL_V1 অনুসন্ধান করে।' },
  { id: 'w2', enTitle: '2. Visual Maps via NASA GIBS', bnTitle: '২. নাসা GIBS ভিজ্যুয়াল মানচিত্র', enBody: 'The map requests NASA GIBS browse layers, including the NISAR geocoded polarimetric covariance layer, when available for the selected time. These are visual context, not quantitative measurements.', bnBody: 'প্রতিটি মানচিত্র স্পষ্ট রঙের অর্থসহ প্রকৃত নাসা GIBS স্যাটেলাইট লেয়ার (NISAR_L2_Geocoded_Polarimetric_Covariance সহ) প্রদর্শন করে।' },
  { id: 'w3', enTitle: '3. Raster processing (planned, not connected)', bnTitle: '৩. রাস্টার প্রক্রিয়াকরণ (পরিকল্পিত, এখনো সংযুক্ত নয়)', enBody: 'The next engineering step is to access suitable NISAR GCOV rasters, prepare analysis-ready layers, and run a documented deterministic water-classification workflow. This processing service is not part of the current prototype.', bnBody: 'পরবর্তী ধাপে উপযুক্ত নিসার GCOV রাস্টার থেকে বিশ্লেষণযোগ্য লেয়ার তৈরি এবং নথিভুক্ত নিয়মে পানির শ্রেণিবিন্যাস করতে হবে। এই প্রক্রিয়াকরণ ব্যবস্থা বর্তমান প্রোটোটাইপে নেই।' },
  { id: 'w4', enTitle: '4. Duet: L-Band vs C-Band', bnTitle: '৪. ডুয়েট: এল-ব্যান্ড বনাম সি-ব্যান্ড', enBody: 'The planned comparison must classify each sensor separately and align outputs to a common grid; raw L-band and C-band backscatter must not be subtracted directly. This raster comparison is not implemented in the current prototype.', bnBody: 'কখনোই এল-ব্যান্ড ও সি-ব্যান্ড সরাসরি বিয়োগ করবেন না। প্রতিটি আলাদাভাবে শ্রেণিবদ্ধ করে ৩০ মিটার গ্রিডে তুলনা করুন।' },
  { id: 'w5', enTitle: '5. Honest "No data available"', bnTitle: '৫. সৎভাবে "No data available" প্রদর্শন', enBody: 'Wherever pixel-level raster math requires a server or unconfigured API key, TORONGO shows "No data available" and never invents fake numbers.', bnBody: 'যেখানে সার্ভার ছাড়া রাস্টার হিসাব সম্ভব নয়, সেখানে তরঙ্গ কখনোই কাল্পনিক সংখ্যা না দেখিয়ে "No data available" দেখায়।' },
];

const INITIAL_COMMUNITY_POSTS = [
  { id: 'POST-ARCH-001', topicId: 'DEMO-AREA-001', topicLabelKey: 'area1Name', authorRoleKey: 'roleOfficial', dateIso: daysAgo(2), enTitle: 'Keeping local gauge & field notes separate from NISAR GCOV', bnTitle: 'স্থানীয় গেজ ও মাঠের তথ্য নিসার GCOV থেকে আলাদা রাখা', enBody: 'Per the TORONGO architecture guide, local field observations and FFWC river gauge readings are kept separate from satellite-derived water classification.', bnBody: 'তরঙ্গ আর্কিটেকচার নির্দেশিকা অনুযায়ী, স্থানীয় মাঠ পর্যবেক্ষণ এবং FFWC নদীর পানির উচ্চতা স্যাটেলাইট ফলাফল থেকে আলাদা রাখা হয়।', isSampleByTeam: true, isLocalObservation: true, hasSnapshot: true, snapshotDateIso: daysAgo(2), snapshotSceneLabel: 'NASA GIBS · NISAR_L2_Geocoded_Polarimetric_Covariance', replies: [{ id: 'REP-ARCH-101', authorRoleKey: 'roleResearcher', dateIso: daysAgo(1), enText: 'In this prototype, CMR provides catalogue metadata and GIBS provides browse imagery; a radar raster-processing service is not connected.', bnText: 'এই প্রোটোটাইপে CMR ক্যাটালগ মেটাডেটা এবং GIBS ব্রাউজ ছবি দেয়; রাডার রাস্টার প্রক্রিয়াকরণ ব্যবস্থা সংযুক্ত নয়।', isBestAnswer: true }] },
];

// ============================================================================
// SERVICES (LIVE NASA CMR, NASA GIBS WMS 1.1.1, AND NASA POWER RAINFALL)
// ============================================================================
function isoDaysBeforeNow(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

function gibsDateFor(variant) {
  const want = (variant === 'before' || variant === 'area') ? LAYER_DATES.before : LAYER_DATES.after;
  const fallback = (variant === 'before' || variant === 'area') ? isoDaysBeforeNow(40) : isoDaysBeforeNow(2);
  const d = want || fallback;
  const latest = isoDaysBeforeNow(1);
  return d > latest ? latest : d; // GIBS has no images from the future
}

// Bounding box that matches the image shape (no stretching) and is wide enough
// for the 250 m MODIS pixels to look sharp instead of blown-up.
function computeWms111Bbox(wmsBbox, zoom = 1, aspect = 640 / 420) {
  const raw = String(wmsBbox || '24.35,89.62,24.85,89.92').split(',').map(Number);
  const cLat = ((raw[0] || 24.35) + (raw[2] || 24.85)) / 2;
  const cLon = ((raw[1] || 89.62) + (raw[3] || 89.92)) / 2;
  const latSpan = Math.max(0.6, (raw[2] - raw[0]) + 0.1) / (zoom || 1);
  const lonSpan = (latSpan * aspect) / Math.cos((cLat * Math.PI) / 180);
  return `${(cLon - lonSpan / 2).toFixed(4)},${(cLat - latSpan / 2).toFixed(4)},${(cLon + lonSpan / 2).toFixed(4)},${(cLat + latSpan / 2).toFixed(4)}`;
}

function buildNasaGibsWmsUrl(wmsBbox, _dateIso, variant = 'after', zoom = 1) {
  const bbox111 = computeWms111Bbox(wmsBbox, zoom);
  const date = gibsDateFor(variant);
  return `${NASA_GIBS_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${GIBS_BACKDROP_LAYER}&STYLES=&FORMAT=image/jpeg&SRS=epsg:4326&BBOX=${bbox111}&WIDTH=640&HEIGHT=420&TIME=${date}`;
}

function buildNisarOverlayWmsUrl(wmsBbox, variant = 'lband', zoom = 1) {
  const bbox111 = computeWms111Bbox(wmsBbox, zoom);
  let overlayLayer = GIBS_NISAR_LAYER;
  if (variant === 'cband') overlayLayer = GIBS_OPERA_RTC_LAYER;
  else if (variant === 'diff' || variant === 'after') overlayLayer = GIBS_OPERA_WATER_LAYER;
  const date = gibsDateFor(variant);
  return `${NASA_GIBS_WMS_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${overlayLayer}&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&SRS=epsg:4326&BBOX=${bbox111}&WIDTH=640&HEIGHT=420&TIME=${date}`;
}

// Loads every NASA scene for one calendar month (so you can browse the past).
async function fetchCmrMonthObservations(areaId, year, monthIndex0) {
  const key = `${areaId}-${year}-${monthIndex0}`;
  if (MONTH_LOADED[key]) return false;
  const area = DEMO_AREAS.find((a) => a.id === areaId); if (!area) return false;
  const start = new Date(Date.UTC(year, monthIndex0, 1)).toISOString().slice(0, 19) + 'Z';
  const end = new Date(Date.UTC(year, monthIndex0 + 1, 0, 23, 59, 59)).toISOString().slice(0, 19) + 'Z';
  const jobs = [
    [OPERA_RTC_S1_SHORT_NAME, 'Sentinel-1', 'readinessEarly'],
    [NISAR_VALIDATED_SHORT_NAME, 'NISAR', 'readinessEarly'],
    [NISAR_PROVISIONAL_SHORT_NAME, 'NISAR', 'readinessPreview'],
  ];
  const results = await Promise.all(jobs.map(async ([shortName, sat, readinessKey]) => {
    try {
      const url = `${NASA_CMR_GRANULES_URL}?page_size=200&sort_key=-start_date&short_name=${encodeURIComponent(shortName)}&bounding_box=${area.bbox}&temporal[]=${encodeURIComponent(`${start},${end}`)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      return (json.items || []).map((entry) => {
        const umm = entry.umm || {};
        const meta = entry.meta || {};
        const id = umm.GranuleUR || meta['native-id'] || meta['concept-id'] || '';
        const begin = (umm.TemporalExtent && umm.TemporalExtent.RangeDateTime && umm.TemporalExtent.RangeDateTime.BeginningDateTime) || '';
        return { id, areaId: area.id, dateIso: begin.slice(0, 10), satellite: sat, readinessKey, coverage: 'unverified', coverageTextKey: 'coverageUnverified', browseUrl: null };
      }).filter((o) => o.dateIso && o.id);
    } catch (e) { return null; }
  }));
  if (results.some((r) => r === null)) return false; // network problem: try again next time
  const known = new Set(DEMO_OBSERVATIONS.map((o) => o.id));
  let added = false;
  results.forEach((list) => list.forEach((o) => { if (!known.has(o.id)) { known.add(o.id); DEMO_OBSERVATIONS.push(o); added = true; } }));
  MONTH_LOADED[key] = true;
  return added;
}

async function fetchCmrCollectionGranules({ areaId, shortName, conceptId, bbox, temporal, satelliteLabel, readinessKey }) {
  try {
    let url = `${NASA_CMR_GRANULES_URL}?page_size=12&sort_key=-start_date`;
    if (shortName) url += `&short_name=${encodeURIComponent(shortName)}`;
    if (conceptId) url += `&collection_concept_id=${encodeURIComponent(conceptId)}`;
    if (bbox) url += `&bounding_box=${bbox}`;
    if (temporal) url += `&temporal[]=${encodeURIComponent(temporal)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    let items = json.items || [];
    return items.map((entry) => {
      const umm = entry.umm || {};
      const meta = entry.meta || {};
      const nativeId = umm.GranuleUR || meta['native-id'] || meta['concept-id'] || '';
      const start = (umm.TemporalExtent && umm.TemporalExtent.RangeDateTime && umm.TemporalExtent.RangeDateTime.BeginningDateTime) || '';
      const dateIso = start ? start.slice(0, 10) : '';
      const browseUrl = ((umm.RelatedUrls || []).find((u) => u.Type === 'GET RELATED VISUALIZATION' && u.URL && u.URL.startsWith('http')) || {}).URL || null;
      return {
        id: nativeId, areaId, dateIso, satellite: satelliteLabel, readinessKey,
        coverage: 'unverified', coverageTextKey: 'coverageUnverified', browseUrl,
      };
    }).filter((observation) => observation.dateIso && observation.id);
  } catch (e) {
    return [];
  }
}

async function fetchLiveNasaRainfall(lat, lon) {
  try {
    const pEnd = isoDaysBeforeNow(3).replace(/-/g, '');
    const pStart = isoDaysBeforeNow(63).replace(/-/g, '');
    const url = `${NASA_POWER_DAILY_URL}?parameters=PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&start=${pStart}&end=${pEnd}&format=JSON`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const param = (json && json.properties && json.properties.parameter && json.properties.parameter.PRECTOTCORR) || {};
    const validKeys = Object.keys(param).filter((k) => param[k] >= 0 && param[k] < 900);
    return validKeys.slice(-5).map((k, idx) => ({
      id: `NASA-RAIN-${idx}`, dateIso: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`,
      rainMm: Number(param[k].toFixed(1)),
    }));
  } catch (e) {
    return [];
  }
}

async function syncLiveNasaDataForArea(areaId, onDone) {
  const area = DEMO_AREAS.find((a) => a.id === areaId) || DEMO_AREAS[0];
  const [valScenes, provScenes, s1Scenes, rainPoints] = await Promise.all([
    fetchCmrCollectionGranules({ shortName: NISAR_VALIDATED_SHORT_NAME, bbox: area.bbox, temporal: `2026-10-21T00:00:00Z,${today()}T23:59:59Z`, satelliteLabel: 'NISAR', readinessKey: 'readinessEarly' }),
    fetchCmrCollectionGranules({ shortName: NISAR_PROVISIONAL_SHORT_NAME, bbox: area.bbox, temporal: '2026-06-17T00:00:00Z,2026-10-23T23:59:59Z', satelliteLabel: 'NISAR', readinessKey: 'readinessPreview' }),
    fetchCmrCollectionGranules({ shortName: OPERA_RTC_S1_SHORT_NAME, bbox: area.bbox, satelliteLabel: 'Sentinel-1', readinessKey: 'readinessOpera' }),
    fetchLiveNasaRainfall(area.lat, area.lon),
  ]);
  const combined = [...valScenes, ...provScenes, ...s1Scenes];
  DEMO_OBSERVATIONS = combined;
  MONTH_LOADED = {};
  if (combined.length > 0) {
    const uniqueDates = Array.from(new Set(combined.map((c) => c.dateIso))).sort().reverse().slice(0, 6);
    area.availableDatesIso = uniqueDates;
    area.defaultAfterIso = uniqueDates[0];
    area.defaultBeforeIso = uniqueDates[uniqueDates.length - 1];
    LAYER_DATES = { before: area.defaultBeforeIso, after: area.defaultAfterIso };
    DEMO_BRIEF.beforeDateIso = area.defaultBeforeIso;
    DEMO_BRIEF.afterDateIso = area.defaultAfterIso;
    DEMO_BRIEF.sceneIds = combined.slice(0, 4).map((c) => `${c.id} (${c.satellite})`);
  } else {
    DEMO_BRIEF.sceneIds = ['No data available in NASA CMR for this filter'];
  }
  if (rainPoints.length > 0) {
    DEMO_OVER_TIME = { analysisId: 'NASA-POWER-CONTEXT', observationsCount: combined.length, sentinel1Count: s1Scenes.length, points: rainPoints };
  }
  if (onDone) onDone();
}

const SAFETY_OR_PREDICT_KEYWORDS = ['evacuate', 'evacuation', 'rescue', 'safe to stay', 'safe to drink', 'should we leave', 'will it flood tomorrow', 'predict', 'forecast', 'next week', 'উদ্ধার', 'সরে যাব', 'নিরাপদ', 'পূর্বাভাস', 'আগামীকাল বন্যা'];
const ROLE_LEAD_IN = {
  'Resource manager': { en: 'For resource planning:', bn: 'সম্পদ পরিকল্পনার জন্য:' },
  Farmer: { en: 'For riverside farming:', bn: 'নদীর পাড়ের কৃষিকাজের জন্য:' },
  Researcher: { en: 'From the observation record:', bn: 'পর্যবেক্ষণ রেকর্ড থেকে:' },
  Student: { en: 'In simple words:', bn: 'সহজ কথায়:' },
};

function retrieve(question) {
  const qLower = String(question || '').toLowerCase().trim();
  if (!qLower) return [];
  const scored = ADVISOR_LIBRARY.map((page) => {
    let score = 0;
    for (let i = 0; i < page.keywords.length; i++) {
      const kw = page.keywords[i];
      if (qLower.includes(kw.toLowerCase())) score += kw.includes(' ') ? 3 : 2;
    }
    return { page, score };
  }).filter((item) => item.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((s) => s.page);
}

function verifyAnswer(_answerText, sourceIds) {
  const validPageIds = new Set(ADVISOR_LIBRARY.map((p) => p.id));
  for (let i = 0; i < sourceIds.length; i++) {
    if (!validPageIds.has(sourceIds[i])) return false;
  }
  return true;
}

async function askAdvisor(question, role, lang, t) {
  const qLower = String(question || '').toLowerCase();
  if (SAFETY_OR_PREDICT_KEYWORDS.some((kw) => qLower.includes(kw))) {
    return { text: t('advisorSafetyRefusal'), sourceTitles: [], sourceIds: [] };
  }
  const pages = retrieve(question);
  if (pages.length === 0) return { text: t('advisorDontKnowFallback'), sourceTitles: [], sourceIds: [] };
  const roleObj = ROLE_LEAD_IN[role] || ROLE_LEAD_IN['Resource manager'];
  const leadIn = lang === 'bn' ? roleObj.bn : roleObj.en;
  const bodyParts = pages.map((p) => (lang === 'bn' ? p.bnText : p.enText));
  const liveCountNote = lang === 'bn' ? `(নাসা CMR থেকে প্রাপ্ত মোট সিন: ${DEMO_OBSERVATIONS.length})` : `(Live scenes currently retrieved from NASA CMR: ${DEMO_OBSERVATIONS.length})`;
  const combinedText = `${leadIn} ${bodyParts.join(' ')} ${liveCountNote}`;
  const sourceIds = pages.map((p) => p.id);
  const sourceTitles = pages.map((p) => (lang === 'bn' ? p.bnTitle : p.enTitle));
  if (!verifyAnswer(combinedText, sourceIds)) return { text: t('advisorNoDataFallback'), sourceTitles: [], sourceIds: [] };
  const primaryPage = pages[0];
  return {
    text: combinedText, sourceTitles, sourceIds,
    limitNote: lang === 'bn' ? primaryPage.bnLimitNote : primaryPage.enLimitNote,
    actionScreen: primaryPage.actionScreen, actionLabelKey: primaryPage.actionLabelKey,
  };
}

let lastPostTimestampMs = 0;
function canCreatePostNow() { return Date.now() - lastPostTimestampMs >= 60000; }
function recordPostCreatedNow() { lastPostTimestampMs = Date.now(); }

// ============================================================================
// NAVIGATION
// ============================================================================
const NavigationContext = createContext(undefined);
const NavigationProvider = ({ children }) => {
  const [stack, setStack] = useState([{ name: 'Splash', params: {} }]);
  const [selectedAreaId, setSelectedAreaId] = useState('DEMO-AREA-001');
  const [sharedPin, setSharedPin] = useState({ x: 56, y: 48 });
  const [nasaSyncTick, setNasaSyncTick] = useState(0);

  useEffect(() => {
    syncLiveNasaDataForArea(selectedAreaId, () => setNasaSyncTick((n) => n + 1));
  }, [selectedAreaId]);

  const currentRoute = stack[stack.length - 1];
  const canGoBack = stack.length > 1 && currentRoute.name !== 'Home';
  const navigate = useCallback((name, params = {}) => setStack((prev) => [...prev, { name, params }]), []);
  const replace = useCallback((name, params = {}) => setStack((prev) => [...prev.slice(0, -1), { name, params }]), []);
  const goBack = useCallback(() => setStack((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1))), []);
  const resetToHome = useCallback(() => setStack([{ name: 'Home', params: {} }]), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1 && currentRoute.name !== 'Home') { goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, currentRoute.name, goBack]);

  const value = useMemo(() => ({
    currentRoute, canGoBack, selectedAreaId, setSelectedAreaId, sharedPin, setSharedPin, nasaSyncTick, navigate, replace, goBack, resetToHome,
  }), [currentRoute, canGoBack, selectedAreaId, sharedPin, nasaSyncTick, navigate, replace, goBack, resetToHome]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};
function useNav() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNav must be used inside NavigationProvider');
  return ctx;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
const W0 = 'M 6.0 92.6 L 10.3 90.0 L 17.3 86.9 L 27.9 83.9 L 44.0 81.8 L 51.8 81.9 L 57.7 82.8 L 64.8 85.2 L 70.0 88.0 L 74.5 91.4 L 85.8 102.1 L 90.8 105.8 L 98.1 110.3 L 105.0 113.6 L 112.2 115.9 L 119.5 117.3 L 127.1 117.8 L 136.6 116.8 L 142.5 115.4 L 148.8 113.3 L 155.5 110.2 L 163.0 105.7 L 169.3 100.9 L 177.1 93.4 L 180.6 88.9 L 177.1 91.1 L 170.7 93.6 L 163.7 95.4 L 156.6 96.7 L 143.9 97.1 L 134.7 95.9 L 127.9 93.7 L 122.7 91.1 L 105.4 77.1 L 99.5 73.2 L 90.0 68.3 L 82.1 65.1 L 75.2 63.3 L 67.0 62.0 L 58.9 61.9 L 52.6 62.5 L 44.8 64.2 L 37.0 67.0 L 29.1 71.0 L 21.8 76.0 L 15.8 81.1 L 9.3 88.1 Z';
const W1 = 'M 27.7 64.8 L 31.3 63.0 L 38.1 60.6 L 55.4 57.1 L 72.6 55.8 L 84.9 56.8 L 91.4 58.2 L 99.5 61.4 L 103.8 64.4 L 114.5 73.2 L 121.8 77.9 L 129.0 81.4 L 138.6 84.7 L 149.0 86.3 L 154.9 86.3 L 162.0 85.3 L 167.5 83.9 L 173.5 81.6 L 179.1 78.7 L 184.5 74.9 L 189.0 71.0 L 194.0 65.5 L 182.4 68.9 L 172.1 70.6 L 163.1 70.7 L 155.5 69.5 L 150.5 67.8 L 145.3 65.0 L 130.5 52.3 L 119.3 45.0 L 112.3 41.7 L 106.0 39.5 L 99.1 38.0 L 92.2 37.2 L 84.6 37.2 L 74.9 38.4 L 67.0 40.5 L 57.9 43.9 L 48.7 48.5 L 40.9 53.5 L 34.1 58.8 Z';
const W2 = 'M 161.6 49.9 L 159.1 40.9 L 156.7 36.1 L 153.3 31.0 L 145.6 22.9 L 135.5 16.1 L 124.8 11.3 L 111.1 7.6 L 96.4 6.0 L 88.4 6.2 L 81.3 6.9 L 69.5 9.7 L 61.3 13.1 L 53.3 18.1 L 43.1 26.8 L 33.5 36.9 L 24.6 48.5 L 16.6 61.4 L 10.0 74.2 L 20.3 63.4 L 27.0 57.5 L 35.8 50.7 L 44.7 44.8 L 57.2 38.0 L 65.9 34.3 L 75.7 31.0 L 85.2 28.8 L 93.6 27.7 L 103.8 27.6 L 112.8 28.5 L 120.1 30.1 L 131.4 34.1 L 142.6 40.2 L 152.5 47.6 L 161.9 56.6 Z';
const WM_OUTER = 'M 144.9 46.7 L 149.6 44.3 L 154.1 43.0 L 159.4 42.2 L 167.1 42.4 L 172.3 44.3 L 180.8 51.8 L 187.3 55.7 L 193.5 57.6 L 200.7 57.8 L 205.7 56.7 L 211.4 54.2 L 217.7 49.7 L 221.5 45.4 L 219.4 46.7 L 212.3 48.6 L 201.2 48.4 L 196.5 46.4 L 187.9 39.6 L 180.8 35.7 L 173.4 33.6 L 167.1 33.4 L 161.6 34.5 L 155.6 37.0 L 149.0 42.0 Z M 154.5 34.5 L 160.3 32.3 L 169.1 30.8 L 175.9 30.6 L 181.1 31.3 L 186.2 33.2 L 192.8 38.5 L 198.0 41.5 L 203.3 43.5 L 207.2 44.1 L 213.6 43.7 L 218.3 42.2 L 223.0 39.4 L 227.3 35.1 L 218.3 37.2 L 210.6 36.8 L 205.9 34.7 L 199.9 29.3 L 195.8 26.5 L 189.6 23.8 L 183.0 22.5 L 175.7 22.9 L 168.0 25.3 L 161.6 28.7 Z M 213.4 28.7 L 212.5 25.0 L 210.4 20.8 L 206.5 16.5 L 202.7 13.7 L 196.0 10.7 L 189.8 9.2 L 186.0 8.8 L 177.6 9.2 L 171.9 10.7 L 167.8 12.6 L 161.8 17.3 L 154.1 25.9 L 150.0 32.1 L 146.8 38.5 L 152.4 32.8 L 160.5 26.5 L 170.4 21.4 L 180.0 18.6 L 188.8 18.2 L 195.8 19.5 L 205.0 23.8 L 213.2 30.8 Z M 228.8 7.1 L 228.8 62.7 L 241.2 62.7 L 241.4 28.3 L 263.7 62.7 L 276.3 62.7 L 276.3 7.1 L 263.7 7.1 L 263.5 41.5 L 241.4 7.1 Z M 106.8 7.1 L 106.8 62.7 L 119.2 62.7 L 119.4 40.9 L 136.3 62.7 L 152.4 62.7 L 133.3 39.8 L 139.5 36.2 L 142.1 33.2 L 143.8 29.5 L 144.7 24.6 L 144.5 20.3 L 143.4 16.5 L 141.7 13.5 L 137.6 9.9 L 130.3 7.3 Z M 6.0 7.1 L 6.0 18.0 L 19.1 18.2 L 19.1 62.5 L 31.7 62.7 L 31.7 18.2 L 44.9 18.0 L 44.9 7.1 Z M 362.8 6.2 L 357.0 7.5 L 352.7 9.4 L 348.8 12.0 L 344.1 16.7 L 340.5 22.5 L 338.6 28.3 L 337.9 33.8 L 338.1 39.0 L 339.2 44.3 L 341.4 49.4 L 344.6 54.2 L 348.2 57.8 L 352.7 60.8 L 356.8 62.5 L 363.4 63.8 L 368.5 63.8 L 374.3 62.7 L 379.4 60.6 L 383.5 57.8 L 388.2 52.9 L 391.4 47.5 L 392.9 43.2 L 393.8 38.7 L 393.8 31.0 L 392.3 24.6 L 389.9 19.7 L 386.7 15.4 L 382.9 11.8 L 377.7 8.6 L 372.8 6.9 L 369.4 6.2 Z M 69.8 6.2 L 64.0 7.5 L 59.7 9.4 L 55.9 12.0 L 51.2 16.7 L 47.3 23.1 L 45.6 28.3 L 44.9 34.0 L 45.2 39.0 L 46.4 44.9 L 48.2 49.0 L 50.7 53.1 L 55.2 57.8 L 59.7 60.8 L 63.8 62.5 L 70.4 63.8 L 75.6 63.8 L 81.3 62.7 L 86.5 60.6 L 90.3 58.0 L 95.2 52.9 L 97.6 49.2 L 99.7 44.1 L 100.8 38.7 L 100.8 31.0 L 99.7 25.9 L 98.0 21.6 L 95.0 16.9 L 91.0 12.6 L 85.6 9.0 L 81.3 7.3 L 76.4 6.2 Z M 307.5 6.0 L 302.6 6.6 L 295.8 9.4 L 292.1 12.0 L 287.4 17.1 L 284.2 22.9 L 282.7 27.6 L 282.1 31.7 L 282.1 38.1 L 283.4 44.5 L 285.1 48.6 L 288.1 53.3 L 292.3 57.8 L 297.1 61.0 L 300.5 62.5 L 306.7 63.8 L 311.4 63.8 L 316.5 62.9 L 323.2 60.1 L 327.7 56.9 L 331.1 52.9 L 333.0 49.2 L 334.7 44.1 L 334.7 31.7 L 309.3 31.7 L 309.3 41.3 L 321.7 41.3 L 321.9 43.5 L 321.2 45.6 L 318.2 49.4 L 312.7 52.0 L 307.1 52.0 L 302.0 49.4 L 299.0 46.2 L 296.8 42.4 L 295.6 36.4 L 296.2 29.3 L 299.4 22.9 L 301.5 20.6 L 305.2 18.2 L 310.8 17.3 L 314.4 18.0 L 317.2 19.3 L 322.3 24.4 L 330.4 15.6 L 326.8 11.8 L 321.2 8.4 L 314.8 6.4 Z';
const WM_HOLES = 'M 119.4 17.1 L 126.7 17.6 L 128.6 18.4 L 130.1 19.9 L 131.2 22.3 L 131.4 25.7 L 130.8 28.0 L 128.8 30.4 L 123.7 31.9 L 119.6 31.9 L 119.2 31.5 Z M 363.2 18.4 L 369.0 18.4 L 374.1 20.6 L 377.9 25.0 L 380.3 32.1 L 380.1 39.0 L 377.9 44.9 L 374.3 49.2 L 372.2 50.5 L 368.3 51.6 L 361.7 51.2 L 357.4 49.0 L 353.8 44.9 L 351.6 38.1 L 351.8 30.8 L 354.0 25.0 L 357.6 20.8 Z M 70.2 18.4 L 76.0 18.4 L 81.1 20.6 L 85.0 25.0 L 87.3 32.1 L 86.9 40.2 L 84.3 46.0 L 80.7 49.7 L 75.3 51.6 L 68.7 51.2 L 64.2 48.8 L 60.8 44.9 L 58.6 37.9 L 59.1 29.8 L 61.0 25.0 L 65.3 20.3 Z';

const AppText = ({ style, children, ...rest }) => {
  const { lang } = useLang();
  const flat = StyleSheet.flatten(style) || {};
  let fontFamily = flat.fontFamily || FONTS.bodySemiBold;
  if (lang === 'bn') {
    if (fontFamily === FONTS.headingExtraBold || fontFamily === FONTS.headingBold || fontFamily === FONTS.bodyBold || flat.fontWeight === '800' || flat.fontWeight === '700') {
      fontFamily = FONTS.bengaliBold;
    } else {
      fontFamily = FONTS.bengaliSemiBold;
    }
  }
  return <Text {...rest} style={[style, { fontFamily }]}>{children}</Text>;
};

const TorongoMark = ({ width = 136 }) => (
  <Svg width={width} height={Math.round((width / 200) * 124)} viewBox="0 0 200 124">
    <Path d={W0} fill={COLORS.logoBlue} /><Path d={W1} fill={COLORS.logoBlue} /><Path d={W2} fill={COLORS.logoBlue} />
  </Svg>
);

const TorongoWordmark = ({ width = 200, holeColor = COLORS.bgVeryLight }) => (
  <Svg width={width} height={Math.round((width / 400) * 70)} viewBox="0 0 400 70">
    <Path d={WM_OUTER} fill={COLORS.logoBlue} /><Path d={WM_HOLES} fill={holeColor} />
  </Svg>
);

const LanguageTogglePill = () => {
  const { lang, setLang } = useLang();
  return (
    <View style={sharedStyles.langPillWrap}>
      <Pressable onPress={() => setLang('en')} style={[sharedStyles.langPillHalf, lang === 'en' && sharedStyles.langPillActive]}>
        <AppText style={[sharedStyles.langPillText, lang === 'en' && sharedStyles.langPillTextActive]}>EN</AppText>
      </Pressable>
      <Pressable onPress={() => setLang('bn')} style={[sharedStyles.langPillHalf, lang === 'bn' && sharedStyles.langPillActive]}>
        <AppText style={[sharedStyles.langPillText, lang === 'bn' && sharedStyles.langPillTextActive]}>বাং</AppText>
      </Pressable>
    </View>
  );
};

const HeaderLangButton = () => {
  const { lang, toggleLang } = useLang();
  return (
    <Pressable onPress={toggleLang} style={sharedStyles.globeBtn} accessibilityRole="button">
      <Ionicons name="globe-outline" size={18} color={COLORS.deepBlue} />
      <AppText style={sharedStyles.globeBtnText}>{lang === 'en' ? 'বাং' : 'EN'}</AppText>
    </Pressable>
  );
};

const DemoPill = ({ visible = true }) => {
  const { t } = useLang();
  if (!visible) return null;
  return (
    <View style={sharedStyles.demoPill}>
      <View style={sharedStyles.demoDot} />
      <AppText style={sharedStyles.demoPillText}>{t('demoDataPill')}</AppText>
    </View>
  );
};

const Screen = ({ title, subtitle, isDemo = true, showBack = true, scrollEnabled = true, footer, children }) => {
  const { goBack, canGoBack } = useNav();
  return (
    <SafeAreaView style={sharedStyles.safeArea} edges={['top', 'bottom']}>
      <View style={sharedStyles.notchSpacer} />
      <View style={sharedStyles.headerBar}>
        <View style={sharedStyles.headerLeft}>
          {showBack && canGoBack && (
            <Pressable onPress={goBack} style={sharedStyles.backButton}>
              <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            </Pressable>
          )}
        </View>
        <View style={sharedStyles.headerRight}>
          <DemoPill visible={isDemo} />
          <HeaderLangButton />
        </View>
      </View>
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={sharedStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {title ? <AppText style={sharedStyles.screenTitle}>{title}</AppText> : null}
        {subtitle ? <AppText style={sharedStyles.screenSubtitle} numberOfLines={2}>{subtitle}</AppText> : null}
        {children}
      </ScrollView>
      {footer ? <View style={sharedStyles.footerBar}>{footer}</View> : null}
    </SafeAreaView>
  );
};

const BigButton = ({ label, onPress, disabled = false, variant = 'primary', iconName }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const animateIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const animateOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  if (variant === 'secondary') {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable onPress={onPress} onPressIn={animateIn} onPressOut={animateOut} disabled={disabled} style={[sharedStyles.secondaryButton, disabled && sharedStyles.buttonDisabled]}>
          {iconName && <Ionicons name={iconName} size={20} color={COLORS.deepBlue} style={{ marginRight: 8 }} />}
          <AppText style={sharedStyles.secondaryButtonText}>{label}</AppText>
        </Pressable>
      </Animated.View>
    );
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={animateIn} onPressOut={animateOut} disabled={disabled} style={[sharedStyles.primaryButtonWrap, disabled && sharedStyles.buttonDisabled]}>
        <LinearGradient colors={GRADIENTS.gradient2} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sharedStyles.primaryButtonGradient}>
          <AppText style={sharedStyles.primaryButtonText}>{label}</AppText>
          <Ionicons name={iconName || 'arrow-forward'} size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const Card = ({ children, style, onPress }) => {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [sharedStyles.card, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[sharedStyles.card, style]}>{children}</View>;
};

const BottomSheet = ({ visible, title, onClose, children }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={sharedStyles.modalBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={sharedStyles.sheetContainer}>
        <View style={sharedStyles.sheetHandle} />
        <View style={sharedStyles.sheetHeaderRow}>
          <AppText style={sharedStyles.sheetTitle}>{title}</AppText>
          <Pressable onPress={onClose} style={sharedStyles.sheetCloseBtn}>
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  </Modal>
);

const EvidenceChip = ({ level = 'Derived', showCalculatedHint = false }) => {
  const { t } = useLang();
  const [sheetOpen, setSheetOpen] = useState(false);
  const labelMap = { Observed: t('evidenceObserved'), Derived: t('evidenceDerived'), Proposed: t('evidenceProposed') };
  const meaningMap = { Observed: t('evidenceObservedMeaning'), Derived: t('evidenceDerivedMeaning'), Proposed: t('evidenceProposedMeaning') };
  const chipStyle = level === 'Observed' ? sharedStyles.evidenceObserved : level === 'Derived' ? sharedStyles.evidenceDerived : sharedStyles.evidenceProposed;
  const textStyle = level === 'Observed' ? sharedStyles.evidenceTextObserved : level === 'Derived' ? sharedStyles.evidenceTextDerived : sharedStyles.evidenceTextProposed;
  const displayWord = level === 'Derived' && showCalculatedHint ? `${labelMap.Derived} · ${t('calculatedWord')}` : labelMap[level];
  return (
    <>
      <Pressable onPress={() => setSheetOpen(true)} style={[sharedStyles.evidenceBase, chipStyle]}>
        <AppText style={textStyle}>{displayWord}</AppText>
        <Ionicons name="information-circle-outline" size={15} color={level === 'Observed' ? COLORS.white : COLORS.deepBlue} style={{ marginLeft: 4 }} />
      </Pressable>
      <BottomSheet visible={sheetOpen} title={labelMap[level]} onClose={() => setSheetOpen(false)}>
        <AppText style={sharedStyles.sheetPlainBody}>{meaningMap[level]}</AppText>
        <View style={sharedStyles.sheetDivider} />
        <AppText style={sharedStyles.sheetSubHeading}>{t('allThreeLabelsHeading')}</AppText>
        {['Observed', 'Derived', 'Proposed'].map((item) => (
          <View key={item} style={sharedStyles.sheetExplainRow}>
            <AppText style={sharedStyles.sheetExplainTerm}>{labelMap[item]}:</AppText>
            <AppText style={sharedStyles.sheetExplainDesc}>{meaningMap[item]}</AppText>
          </View>
        ))}
      </BottomSheet>
    </>
  );
};

const Expander = ({ label, children }) => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <View style={sharedStyles.expanderWrap}>
      <Pressable onPress={() => setOpen((o) => !o)} style={sharedStyles.expanderHeader}>
        <AppText style={sharedStyles.expanderTitle}>{label || t('moreDetails')}</AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.deepBlue} />
      </Pressable>
      {open ? <View style={sharedStyles.expanderBody}>{children}</View> : null}
    </View>
  );
};

const sharedStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgVeryLight },
  notchSpacer: { height: TOP_NOTCH_SPACE, width: '100%', backgroundColor: COLORS.bgVeryLight },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 10, minHeight: 50 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  langPillWrap: { flexDirection: 'row', backgroundColor: FEATURE_COLORS.languageToggle.bg, borderColor: FEATURE_COLORS.languageToggle.border, borderWidth: 1.5, borderRadius: RADIUS.pill, overflow: 'hidden' },
  langPillHalf: { paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  langPillActive: { backgroundColor: FEATURE_COLORS.languageToggle.activeBg },
  langPillText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: FEATURE_COLORS.languageToggle.inactiveText },
  langPillTextActive: { color: FEATURE_COLORS.languageToggle.activeText },
  globeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, height: 38, borderRadius: 19, gap: 4 },
  globeBtnText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  demoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.tint1, borderColor: COLORS.tint2, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  demoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.deepBlue, marginRight: 6 },
  demoPillText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.navyBlue },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: 32 },
  screenTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 30, lineHeight: 38, color: COLORS.textPrimary, marginTop: 4, marginBottom: 6 },
  screenSubtitle: { fontFamily: FONTS.bodySemiBold, fontSize: 17, lineHeight: 24, color: COLORS.textSecondary, marginBottom: 16 },
  footerBar: { paddingHorizontal: SPACING.md, paddingTop: 12, paddingBottom: 20, backgroundColor: COLORS.bgVeryLight, borderTopWidth: 1, borderTopColor: COLORS.surface },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.card, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  primaryButtonWrap: { borderRadius: RADIUS.button, overflow: 'hidden', minHeight: 56 },
  primaryButtonGradient: { minHeight: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.white },
  secondaryButton: { minHeight: 56, borderRadius: RADIUS.button, borderWidth: 2, borderColor: COLORS.deepBlue, backgroundColor: COLORS.white, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.deepBlue },
  buttonDisabled: { opacity: 0.45 },
  evidenceBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  evidenceObserved: { backgroundColor: COLORS.deepBlue, borderWidth: 1.5, borderColor: COLORS.deepBlue },
  evidenceDerived: { backgroundColor: COLORS.tint1, borderWidth: 1.5, borderColor: COLORS.deepBlue },
  evidenceProposed: { backgroundColor: '#FFF9EB', borderWidth: 1.5, borderColor: COLORS.warningOrange, borderStyle: 'dashed' },
  evidenceTextObserved: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  evidenceTextDerived: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  evidenceTextProposed: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#B45309' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.textPrimary },
  sheetCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center' },
  sheetPlainBody: { fontFamily: FONTS.bodySemiBold, fontSize: 18, lineHeight: 26, color: COLORS.textPrimary },
  sheetDivider: { height: 1, backgroundColor: COLORS.surface, marginVertical: 16 },
  sheetSubHeading: { fontFamily: FONTS.headingBold, fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 },
  sheetExplainRow: { marginBottom: 8 },
  sheetExplainTerm: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  sheetExplainDesc: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary },
  expanderWrap: { backgroundColor: COLORS.bgLight, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 8, marginBottom: 16, overflow: 'hidden' },
  expanderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  expanderTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.deepBlue },
  expanderBody: { paddingHorizontal: 16, paddingBottom: 16 },
});

// ============================================================================
// MAP COMPONENTS (REAL NASA GIBS SATELLITE IMAGERY + COLOUR LEGEND + SWIPE)
// ============================================================================
const RIVER_VIEWBOX = { width: 360, height: 240 };
const AREA_BOXES = {
  'DEMO-AREA-001': { x: 54, y: 16, width: 248, height: 155 },
  'DEMO-AREA-002': { x: 68, y: 78, width: 234, height: 146 },
  'DEMO-AREA-003': { x: 42, y: 12, width: 215, height: 128 },
};

const LegendSwatch = ({ color, label }) => (
  <View style={riverMapStyles.legendItem}>
    <View style={[riverMapStyles.swatch, { backgroundColor: color }]} />
    <AppText style={riverMapStyles.legendText}>{label}</AppText>
  </View>
);

const MapLegend = ({ t }) => (
  <>
    <LegendSwatch color="#1F3B57" label={t('legendWaterTrue')} />
    <LegendSwatch color={COLORS.briefGreenIcon} label={t('legendVegTrue')} />
    <LegendSwatch color="#C9A66B" label={t('legendSandTrue')} />
    <LegendSwatch color="#D5DBE3" label={t('legendCloudTrue')} />
    <LegendSwatch color={COLORS.primaryBlue} label={t('legendOverlayTrue')} />
  </>
);

const RiverMap = ({ height = 220, width = '100%', variant = 'area', selectedAreaId = 'DEMO-AREA-001', showFloodAfter = false, hideLegend = false, pinXPercent, pinYPercent, onTapMap }) => {
  const { t } = useLang();
  const [imgLoading, setImgLoading] = useState(true);
  const areaObj = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];
  const areaBox = AREA_BOXES[selectedAreaId] || AREA_BOXES['DEMO-AREA-001'];
  const effectiveVariant = showFloodAfter ? 'after' : variant;
  const baseGibsUrl = buildNasaGibsWmsUrl(areaObj.wmsBbox, null, effectiveVariant, 1);
  const radarOverlayUrl = buildNisarOverlayWmsUrl(areaObj.wmsBbox, effectiveVariant, 1);
  const isDiffView = variant === 'diff';

  const handlePress = (evt) => {
    if (!onTapMap) return;
    const { locationX, locationY } = evt.nativeEvent;
    onTapMap(Math.round(Math.max(8, Math.min(92, (locationX / 340) * 100))), Math.round(Math.max(10, Math.min(90, (locationY / height) * 100))));
  };

  const mapContent = (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={{ uri: baseGibsUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onLoadEnd={() => setImgLoading(false)} />
      <Image source={{ uri: radarOverlayUrl }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" />
      {imgLoading && (
        <View style={riverMapStyles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.white} />
        </View>
      )}
      <Svg width="100%" height="100%" viewBox={`0 0 ${RIVER_VIEWBOX.width} ${RIVER_VIEWBOX.height}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
        {variant === 'area' && !showFloodAfter && (
          <Rect x={areaBox.x} y={areaBox.y} width={areaBox.width} height={areaBox.height} rx={16} ry={16} fill={COLORS.primaryBlue} fillOpacity={0.14} stroke={COLORS.white} strokeWidth={2.5} strokeDasharray="8,5" />
        )}
        {typeof pinXPercent === 'number' && typeof pinYPercent === 'number' && (
          <G>
            <Circle cx={(pinXPercent / 100) * RIVER_VIEWBOX.width} cy={(pinYPercent / 100) * RIVER_VIEWBOX.height} r={15} fill={COLORS.alertRed} fillOpacity={0.35} />
            <Circle cx={(pinXPercent / 100) * RIVER_VIEWBOX.width} cy={(pinYPercent / 100) * RIVER_VIEWBOX.height} r={7} fill={COLORS.alertRed} stroke={COLORS.white} strokeWidth={2.5} />
          </G>
        )}
      </Svg>
    </View>
  );

  return (
    <View style={{ width }}>
      {onTapMap ? (
        <Pressable onPress={handlePress} style={[riverMapStyles.canvas, { height }]}>{mapContent}</Pressable>
      ) : (
        <View style={[riverMapStyles.canvas, { height }]}>{mapContent}</View>
      )}
      {!hideLegend && (
        <View style={riverMapStyles.legendBox}>
          {isDiffView ? (
            <>
              <LegendSwatch color={COLORS.primaryBlue} label={t('legendBothWater')} />
              <LegendSwatch color={COLORS.verifiedGold} label={t('legendOnlyLBand')} />
              <LegendSwatch color={COLORS.alertRed} label={t('legendOnlyCBand')} />
            </>
          ) : (
            <>
              <MapLegend t={t} />
            </>
          )}
          <AppText style={riverMapStyles.gibsNoteText}>{t('gibsVisualNote')}</AppText>
        </View>
      )}
    </View>
  );
};

const riverMapStyles = StyleSheet.create({
  canvas: { width: '100%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#1E293B' },
  loadingOverlay: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(15, 23, 42, 0.65)', padding: 6, borderRadius: 12 },
  legendBox: { backgroundColor: COLORS.bgLight, borderRadius: 14, padding: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 12, height: 12, borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  legendText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary },
  gibsNoteText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});

const GRID_X = [45, 90, 135, 180, 225, 270, 315];
const GRID_Y = [40, 80, 120, 160, 200];

const MapCanvas = ({ height = 160, selectedAreaId, showRadarLayer = true, showFloodLayer = false, showIslandsLayer = true, zoom = 1, pin, onTapCanvas, children, style }) => {
  const areaObj = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];
  const areaBox = AREA_BOXES[selectedAreaId] || AREA_BOXES['DEMO-AREA-001'];
  const clampedZoom = Math.max(0.8, Math.min(2.2, zoom));
  const vbWidth = 360 / clampedZoom;
  const vbHeight = 240 / clampedZoom;
  const vbX = (360 - vbWidth) / 2;
  const vbY = (240 - vbHeight) / 2;
  const baseVariant = showFloodLayer ? 'after' : showIslandsLayer ? 'diff' : 'before';
  const baseGibsUrl = buildNasaGibsWmsUrl(areaObj.wmsBbox, null, baseVariant, clampedZoom);
  const radarOverlayUrl = buildNisarOverlayWmsUrl(areaObj.wmsBbox, showFloodLayer ? 'after' : 'lband', clampedZoom);

  const handlePress = (evt) => {
    if (!onTapCanvas) return;
    const { locationX, locationY } = evt.nativeEvent;
    onTapCanvas({ x: Math.max(8, Math.min(92, Math.round((locationX / 340) * 100))), y: Math.max(8, Math.min(92, Math.round((locationY / height) * 100))) });
  };

  return (
    <Pressable onPress={handlePress} disabled={!onTapCanvas} style={[mapCanvasStyles.wrap, { height }, style]}>
      <Image source={{ uri: baseGibsUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      {showRadarLayer && (
        <Image source={{ uri: radarOverlayUrl }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" />
      )}
      <Svg width="100%" height="100%" viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
        {GRID_X.map((gx) => <Line key={`gx-${gx}`} x1={gx} y1={0} x2={gx} y2={240} stroke="rgba(179, 223, 255, 0.32)" strokeWidth={1} />)}
        {GRID_Y.map((gy) => <Line key={`gy-${gy}`} x1={0} y1={gy} x2={360} y2={gy} stroke="rgba(179, 223, 255, 0.32)" strokeWidth={1} />)}
        <Rect x={areaBox.x} y={areaBox.y} width={areaBox.width} height={areaBox.height} rx={14} ry={14} fill={COLORS.primaryBlue} fillOpacity={0.14} stroke={COLORS.white} strokeWidth={2.5} strokeDasharray="8,5" />
        {pin && (
          <G>
            <Circle cx={(pin.x / 100) * 360} cy={(pin.y / 100) * 240} r={14} fill={COLORS.alertRed} fillOpacity={0.35} />
            <Circle cx={(pin.x / 100) * 360} cy={(pin.y / 100) * 240} r={7} fill={COLORS.alertRed} stroke={COLORS.white} strokeWidth={2.5} />
          </G>
        )}
      </Svg>
      {children ? <View style={mapCanvasStyles.overlayContent} pointerEvents="box-none">{children}</View> : null}
    </Pressable>
  );
};

const mapCanvasStyles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#1E293B', position: 'relative' },
  overlayContent: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: 'space-between' },
});

const BeforeAfterSwipe = ({ height = 280, leftVariant, rightVariant, leftPillText, rightPillText, leftSubCaption, rightSubCaption, onDragStateChange, onTapSpot }) => {
  const { t } = useLang();
  const { selectedAreaId } = useNav();
  const [containerWidth, setContainerWidth] = useState(320);
  const [splitFraction, setSplitFraction] = useState(0.5);
  const widthRef = useRef(320);
  const fractionRef = useRef(0.5);
  const dragStartPxRef = useRef(160);

  const updateFraction = (next) => {
    const clamped = Math.max(0.06, Math.min(0.94, next));
    fractionRef.current = clamped;
    setSplitFraction(clamped);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
    onPanResponderGrant: () => {
      dragStartPxRef.current = fractionRef.current * widthRef.current;
      if (onDragStateChange) onDragStateChange(true);
    },
    onPanResponderMove: (_, gestureState) => {
      if (widthRef.current <= 0) return;
      updateFraction((dragStartPxRef.current + gestureState.dx) / widthRef.current);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (onDragStateChange) onDragStateChange(false);
      if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5 && widthRef.current > 0 && gestureState.x0 > 0) {
        const localX = Math.max(20, Math.min(widthRef.current - 20, gestureState.x0 - 32));
        updateFraction(localX / widthRef.current);
        if (onTapSpot) onTapSpot(Math.round((localX / widthRef.current) * 100), 52);
      }
    },
    onPanResponderTerminate: () => { if (onDragStateChange) onDragStateChange(false); },
  }), [onDragStateChange, onTapSpot]);

  const handleLeftPx = Math.round(splitFraction * containerWidth);

  return (
    <View>
      <View onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) { widthRef.current = w; setContainerWidth(w); } }} style={[swipeStyles.container, { height }]} {...panResponder.panHandlers}>
        <View style={StyleSheet.absoluteFillObject}>
          <RiverMap height={height} width={containerWidth} variant={rightVariant} selectedAreaId={selectedAreaId} hideLegend />
        </View>
        <View style={[swipeStyles.leftClippedWrapper, { width: handleLeftPx, height }]}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: containerWidth, height }}>
            <RiverMap height={height} width={containerWidth} variant={leftVariant} selectedAreaId={selectedAreaId} hideLegend />
          </View>
        </View>
        <View style={swipeStyles.topPillsBar} pointerEvents="none">
          <View style={swipeStyles.pillColumnLeft}>
            <View style={swipeStyles.pillBefore}><AppText style={swipeStyles.pillText}>{leftPillText}</AppText></View>
            {leftSubCaption ? <AppText style={swipeStyles.subCaptionText}>{leftSubCaption}</AppText> : null}
          </View>
          <View style={swipeStyles.pillColumnRight}>
            <View style={swipeStyles.pillAfter}><AppText style={swipeStyles.pillText}>{rightPillText}</AppText></View>
            {rightSubCaption ? <AppText style={swipeStyles.subCaptionText}>{rightSubCaption}</AppText> : null}
          </View>
        </View>
        <View pointerEvents="none" style={[swipeStyles.dividerLine, { left: handleLeftPx - 1.5, height }]} />
        <View pointerEvents="none" style={[swipeStyles.handleButton, { left: handleLeftPx - 28, top: height / 2 - 28 }]}>
          <Ionicons name="chevron-back" size={18} color={COLORS.white} />
          <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
        </View>
      </View>
      <View style={swipeStyles.legendBox}>
        <MapLegend t={t} />
        <AppText style={swipeStyles.gibsNoteText}>{t('gibsVisualNote')}</AppText>
      </View>
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  container: { width: '100%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#1E293B', position: 'relative' },
  leftClippedWrapper: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  topPillsBar: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pillColumnLeft: { alignItems: 'flex-start' },
  pillColumnRight: { alignItems: 'flex-end' },
  pillBefore: { backgroundColor: COLORS.deepBlue, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill },
  pillAfter: { backgroundColor: COLORS.navyBlue, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill },
  pillText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  subCaptionText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary, backgroundColor: 'rgba(255, 255, 255, 0.88)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  dividerLine: { position: 'absolute', top: 0, width: 3, backgroundColor: COLORS.white },
  handleButton: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.deepBlue, borderWidth: 3, borderColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legendBox: { backgroundColor: COLORS.bgLight, borderRadius: 14, padding: 10, marginTop: 10, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  gibsNoteText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});
// === END OF PART A ===


// ============================================================================
// SCREENS (ALL 25 SCREENS ACROSS SPLASH, HOME, MAP, AND ALL 8 FEATURES)
// ============================================================================
const SplashScreen = () => {
  const { replace } = useNav();
  const { t } = useLang();
  useEffect(() => {
    const timer = setTimeout(() => replace('Home'), 1500);
    return () => clearTimeout(timer);
  }, [replace]);

  return (
    <View style={splashStyles.container}>
      <TorongoMark width={144} />
      <AppText style={splashStyles.brandWordmark}>{t('brandName')}</AppText>
      <AppText style={splashStyles.tagline}>{t('splashTagline')}</AppText>
    </View>
  );
};

const splashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgVeryLight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  brandWordmark: { fontFamily: FONTS.headingExtraBold, fontSize: 36, fontWeight: '800', letterSpacing: 1.5, color: COLORS.logoBlue, marginTop: 20 },
  tagline: { fontFamily: FONTS.bodySemiBold, fontSize: 18, lineHeight: 26, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },
});

const HomeScreen = () => {
  const { navigate, selectedAreaId } = useNav();
  const { t } = useLang();
  const currentArea = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];

  const handlePressFeature = (feature) => {
    navigate(feature.targetScreen, { featureId: feature.id, featureTitleKey: feature.nameKey, featureLineKey: feature.shortLineKey });
  };

  return (
    <SafeAreaView style={homeStyles.safeArea} edges={['top', 'bottom']}>
      <View style={homeStyles.notchSpacer} />
      <ScrollView contentContainerStyle={homeStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={homeStyles.headerRow}>
          <Pressable onPress={() => navigate('Splash')}>
            <TorongoWordmark width={196} holeColor={COLORS.bgVeryLight} />
          </Pressable>
          <LanguageTogglePill />
        </View>

        <View style={homeStyles.promptRow}>
          <AppText style={homeStyles.promptText}>{t('homePrompt')}</AppText>
          <DemoPill visible />
        </View>

        <View style={homeStyles.mapWidgetMargin}>
          <MapCanvas height={160} selectedAreaId={selectedAreaId} showRadarLayer onTapCanvas={() => navigate('MapPage')}>
            <View style={homeStyles.mapWidgetTopRow}>
              <View style={homeStyles.mapPinCircle}>
                <Ionicons name="location" size={22} color={FEATURE_COLORS.mapWidget.pinIcon} />
              </View>
              <View style={homeStyles.mapOpenArrowCircle}>
                <Ionicons name="expand-outline" size={18} color={COLORS.deepBlue} />
              </View>
            </View>
            <View style={homeStyles.mapWidgetBottomBox}>
              <AppText style={homeStyles.mapWidgetTitle}>{t('mapTitle')} · {t(currentArea.nameKey)}</AppText>
              <AppText style={homeStyles.mapWidgetSub}>{t('mapTapToOpen')}</AppText>
            </View>
          </MapCanvas>
        </View>

        <View style={homeStyles.gridWrap}>
          {FEATURES.map((feat) => {
            if (feat.isGradientCard && feat.gradientColors) {
              return (
                <Pressable key={feat.id} onPress={() => handlePressFeature(feat)} style={({ pressed }) => [homeStyles.gridCardBase, homeStyles.gradientCardOuter, pressed && homeStyles.cardPressed]}>
                  <LinearGradient colors={feat.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={homeStyles.gradientCardInner}>
                    <View style={homeStyles.aiTopRow}>
                      <View style={[homeStyles.iconCircle, { backgroundColor: feat.circleColor, marginBottom: 0 }]}>
                        <Ionicons name={feat.icon} size={24} color={feat.iconColor} />
                      </View>
                      {feat.badgeTextKey && (
                        <View style={homeStyles.aiPill}>
                          <AppText style={homeStyles.aiPillText}>{t(feat.badgeTextKey)}</AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={[homeStyles.gridTitle, { color: COLORS.white }]}>{t(feat.nameKey)}</AppText>
                    <AppText style={[homeStyles.gridShortLine, { color: COLORS.tint1 }]} numberOfLines={2}>{t(feat.shortLineKey)}</AppText>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable key={feat.id} onPress={() => handlePressFeature(feat)} style={({ pressed }) => [homeStyles.gridCardBase, homeStyles.standardCard, pressed && homeStyles.cardPressed]}>
                <View style={[homeStyles.iconCircle, { backgroundColor: feat.circleColor }]}>
                  <Ionicons name={feat.icon} size={24} color={feat.iconColor} />
                </View>
                <AppText style={homeStyles.gridTitle}>{t(feat.nameKey)}</AppText>
                <AppText style={homeStyles.gridShortLine} numberOfLines={2}>{t(feat.shortLineKey)}</AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const homeStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgVeryLight },
  notchSpacer: { height: TOP_NOTCH_SPACE, width: '100%', backgroundColor: COLORS.bgVeryLight },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  promptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  promptText: { fontFamily: FONTS.headingExtraBold, fontSize: 24, lineHeight: 30, color: COLORS.textPrimary, flexShrink: 1 },
  mapWidgetMargin: { marginBottom: 16 },
  mapWidgetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapPinCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  mapOpenArrowCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.85)', alignItems: 'center', justifyContent: 'center' },
  mapWidgetBottomBox: { backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  mapWidgetTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 18, color: COLORS.textPrimary },
  mapWidgetSub: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.deepBlue, marginTop: 2 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCardBase: { width: '48%', borderRadius: RADIUS.card, marginBottom: 14 },
  standardCard: { backgroundColor: COLORS.white, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  gradientCardOuter: { overflow: 'hidden' },
  gradientCardInner: { padding: 16, flex: 1, justifyContent: 'space-between' },
  aiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aiPill: { backgroundColor: FEATURE_COLORS.aiAdvisor.pillBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  aiPillText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: FEATURE_COLORS.aiAdvisor.pillText },
  iconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gridTitle: { fontFamily: FONTS.headingBold, fontSize: 18, lineHeight: 23, color: COLORS.textPrimary, marginBottom: 4 },
  gridShortLine: { fontFamily: FONTS.bodySemiBold, fontSize: 14, lineHeight: 19, color: COLORS.textSecondary },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});

const MapPageScreen = () => {
  const { goBack, navigate, selectedAreaId, setSelectedAreaId, sharedPin, setSharedPin } = useNav();
  const { t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');
  const [layerRadar, setLayerRadar] = useState(true);
  const [layerFlood, setLayerFlood] = useState(true);
  const [layerIslands, setLayerIslands] = useState(true);
  const [zoom, setZoom] = useState(1);

  const filteredAreas = DEMO_AREAS.filter((area) => t(area.nameKey).toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedArea = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];

  return (
    <SafeAreaView style={mapPageStyles.safeArea} edges={['top', 'bottom']}>
      <View style={mapPageStyles.notchSpacer} />
      <View style={mapPageStyles.headerRow}>
        <Pressable onPress={goBack} style={mapPageStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <AppText style={mapPageStyles.headerTitle}>{t('mapTitle')}</AppText>
        <HeaderLangButton />
      </View>

      <View style={mapPageStyles.controlsBlock}>
        <View style={mapPageStyles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('mapSearchPlaceholder')} placeholderTextColor={COLORS.textTertiary} style={mapPageStyles.searchInput} />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={mapPageStyles.chipsRow}>
          {(filteredAreas.length > 0 ? filteredAreas : DEMO_AREAS).map((area) => {
            const active = area.id === selectedAreaId;
            return (
              <Pressable key={area.id} onPress={() => setSelectedAreaId(area.id)} style={[mapPageStyles.areaChip, active && mapPageStyles.areaChipActive]}>
                <AppText style={[mapPageStyles.areaChipText, active && mapPageStyles.areaChipTextActive]}>{t(area.nameKey)}</AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={mapPageStyles.chipsRow}>
          <Pressable onPress={() => setLayerRadar((v) => !v)} style={[mapPageStyles.layerChip, layerRadar && mapPageStyles.layerChipActive]}>
            <AppText style={[mapPageStyles.layerChipText, layerRadar && mapPageStyles.layerChipTextActive]}>{t('layerRadar')}</AppText>
          </Pressable>
          <Pressable onPress={() => setLayerFlood((v) => !v)} style={[mapPageStyles.layerChip, layerFlood && mapPageStyles.layerChipActive]}>
            <AppText style={[mapPageStyles.layerChipText, layerFlood && mapPageStyles.layerChipTextActive]}>{t('layerFlood')}</AppText>
          </Pressable>
          <Pressable onPress={() => setLayerIslands((v) => !v)} style={[mapPageStyles.layerChip, layerIslands && mapPageStyles.layerChipActive]}>
            <AppText style={[mapPageStyles.layerChipText, layerIslands && mapPageStyles.layerChipTextActive]}>{t('layerIslands')}</AppText>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={mapPageStyles.canvasContainer} showsVerticalScrollIndicator={false}>
        <MapCanvas height={235} selectedAreaId={selectedAreaId} showRadarLayer={layerRadar} showFloodLayer={layerFlood} showIslandsLayer={layerIslands} zoom={zoom} pin={sharedPin} onTapCanvas={(pt) => setSharedPin(pt)}>
          <View style={mapPageStyles.zoomControlsCol}>
            <Pressable onPress={() => setZoom((z) => Math.min(2.0, +(z + 0.25).toFixed(2)))} style={mapPageStyles.zoomBtn}>
              <Ionicons name="add" size={22} color={COLORS.textPrimary} />
            </Pressable>
            <Pressable onPress={() => setZoom((z) => Math.max(0.8, +(z - 0.25).toFixed(2)))} style={mapPageStyles.zoomBtn}>
              <Ionicons name="remove" size={22} color={COLORS.textPrimary} />
            </Pressable>
          </View>
        </MapCanvas>
        <View style={mapPageStyles.legendCard}>
          <MapLegend t={t} />
        </View>
      </ScrollView>

      <View style={mapPageStyles.bottomSheetCard}>
        <AppText style={mapPageStyles.bottomAreaTitle}>{t(selectedArea.nameKey)}</AppText>
        <AppText style={mapPageStyles.bottomAreaSub} numberOfLines={1}>{t(selectedArea.shortLineKey)}</AppText>
        <View style={mapPageStyles.bottomBtnsRow}>
          <View style={{ flex: 1 }}><BigButton label={t('pickDatesBtn')} onPress={() => navigate('SkyWhere')} /></View>
          <View style={{ flex: 1 }}><BigButton label={t('spotCheckHereBtn')} variant="secondary" onPress={() => navigate('SpotTap', { pin: sharedPin })} /></View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const mapPageStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgVeryLight },
  notchSpacer: { height: TOP_NOTCH_SPACE, width: '100%', backgroundColor: COLORS.bgVeryLight },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.textPrimary },
  controlsBlock: { paddingHorizontal: SPACING.md, marginBottom: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, height: 46, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  areaChip: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill },
  areaChipActive: { backgroundColor: COLORS.deepBlue, borderColor: COLORS.deepBlue },
  areaChipText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary },
  areaChipTextActive: { color: COLORS.white },
  layerChip: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill },
  layerChipActive: { backgroundColor: COLORS.navyBlue },
  layerChipText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  layerChipTextActive: { color: COLORS.white },
  canvasContainer: { paddingHorizontal: SPACING.md, paddingBottom: 12 },
  legendCard: { backgroundColor: COLORS.bgLight, borderRadius: 14, padding: 10, marginTop: 8, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  zoomControlsCol: { alignSelf: 'flex-end', gap: 8 },
  zoomBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  bottomSheetCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: SPACING.md, paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, borderColor: COLORS.border },
  bottomAreaTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 20, color: COLORS.textPrimary },
  bottomAreaSub: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary, marginTop: 2, marginBottom: 12 },
  bottomBtnsRow: { flexDirection: 'row', gap: 10 },
});

// --- FEATURE 1: SKY CALENDAR ---
const SkyWhereScreen = () => {
  const { navigate, selectedAreaId, setSelectedAreaId } = useNav();
  const { lang, t } = useLang();
  const selectedArea = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];
  const [beforeIso, setBeforeIso] = useState(selectedArea.defaultBeforeIso);
  const [afterIso, setAfterIso] = useState(selectedArea.defaultAfterIso);
  const [pickerTarget, setPickerTarget] = useState(null);

  const handleSelectArea = (areaId) => {
    setSelectedAreaId(areaId);
    const found = DEMO_AREAS.find((a) => a.id === areaId) || DEMO_AREAS[0];
    setBeforeIso(found.defaultBeforeIso);
    setAfterIso(found.defaultAfterIso);
  };

  return (
    <Screen title={t('skyWhereTitle')} subtitle={t('skyWhereSubtitle')} footer={<BigButton label={t('findObservationsBtn')} onPress={() => navigate('SkyFound', { beforeIso, afterIso })} />}>
      <Card style={{ padding: 14 }}><RiverMap height={190} variant="area" selectedAreaId={selectedArea.id} /></Card>
      <AppText style={skyStyles.sectionLabel}>{t('riverAreaLabel')}</AppText>
      <View style={skyStyles.chipWrap}>
        {DEMO_AREAS.map((area) => {
          const active = area.id === selectedArea.id;
          return (
            <Pressable key={area.id} onPress={() => handleSelectArea(area.id)} style={[skyStyles.chip, active && skyStyles.chipSelected]}>
              <AppText style={[skyStyles.chipText, active && skyStyles.chipTextSelected]}>{t(area.nameKey)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText style={skyStyles.sectionLabel}>{t('datesToCompareLabel')}</AppText>
      <View style={skyStyles.dateRow}>
        <Pressable onPress={() => setPickerTarget('before')} style={skyStyles.dateSelectorCard}>
          <AppText style={skyStyles.dateSmallTag}>{t('beforeLabel')}</AppText>
          <View style={skyStyles.dateValueRow}>
            <AppText style={skyStyles.dateValueText}>{formatDate(beforeIso, lang, 'short')}</AppText>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </View>
        </Pressable>
        <Pressable onPress={() => setPickerTarget('after')} style={skyStyles.dateSelectorCard}>
          <AppText style={skyStyles.dateSmallTag}>{t('afterLabel')}</AppText>
          <View style={skyStyles.dateValueRow}>
            <AppText style={skyStyles.dateValueText}>{formatDate(afterIso, lang, 'short')}</AppText>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </View>
        </Pressable>
      </View>
      <BottomSheet visible={pickerTarget !== null} title={pickerTarget === 'before' ? t('pickBeforeDateTitle') : t('pickAfterDateTitle')} onClose={() => setPickerTarget(null)}>
        {selectedArea.availableDatesIso.map((iso) => {
          const isChosen = pickerTarget === 'before' ? iso === beforeIso : iso === afterIso;
          return (
            <Pressable key={iso} onPress={() => { if (pickerTarget === 'before') setBeforeIso(iso); if (pickerTarget === 'after') setAfterIso(iso); setPickerTarget(null); }} style={[skyStyles.sheetDateOption, isChosen && skyStyles.sheetDateOptionSelected]}>
              <AppText style={[skyStyles.sheetDateText, isChosen && skyStyles.sheetDateTextSelected]}>{formatDate(iso, lang, 'full')}</AppText>
              {isChosen && <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    </Screen>
  );
};

const WEEKDAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];

const SKY_MIN_YEAR = 2024;
const calExtraStyles = StyleSheet.create({
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  yearBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.border },
  yearBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingText: { fontFamily: FONTS.bodySemiBold, fontSize: 13, color: COLORS.textSecondary },
  dotsRow: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
});

const SkyFoundScreen = () => {
  const { navigate, nasaSyncTick, selectedAreaId } = useNav();
  const { lang, t } = useLang();
  const nowUtc = new Date();
  const todayY = nowUtc.getUTCFullYear();
  const todayM = nowUtc.getUTCMonth();
  const todayD = nowUtc.getUTCDate();
  const [year, setYear] = useState(todayY);
  const [monthIndex0, setMonthIndex0] = useState(todayM);
  const [beforeObs, setBeforeObs] = useState(null);
  const [afterObs, setAfterObs] = useState(null);
  const [emptyDayNotice, setEmptyDayNotice] = useState(false);
  const [monthLoading, setMonthLoading] = useState(false);
  const [, setCalTick] = useState(0);

  useEffect(() => {
    if (DEMO_OBSERVATIONS.length >= 2) {
      setAfterObs(DEMO_OBSERVATIONS[0]);
      setBeforeObs(DEMO_OBSERVATIONS[DEMO_OBSERVATIONS.length - 1]);
    } else if (DEMO_OBSERVATIONS.length === 1) {
      setAfterObs(DEMO_OBSERVATIONS[0]);
      setBeforeObs(DEMO_OBSERVATIONS[0]);
    }
  }, [nasaSyncTick]);

  // Load the scenes of whichever month is on screen (lets you go back in time).
  useEffect(() => {
    let alive = true;
    setMonthLoading(true);
    fetchCmrMonthObservations(selectedAreaId, year, monthIndex0).then((changed) => {
      if (!alive) return;
      setMonthLoading(false);
      if (changed) setCalTick((n) => n + 1);
    });
    return () => { alive = false; };
  }, [year, monthIndex0, selectedAreaId, nasaSyncTick]);

  // Map pictures use the dates you picked.
  useEffect(() => {
    if (beforeObs && afterObs) {
      const [d1, d2] = [beforeObs.dateIso, afterObs.dateIso].sort();
      LAYER_DATES = { before: d1, after: d2 };
    }
  }, [beforeObs, afterObs]);

  const atMin = year <= SKY_MIN_YEAR && monthIndex0 === 0;
  const atMax = year >= todayY && monthIndex0 >= todayM;
  const goPrevMonth = () => {
    setEmptyDayNotice(false);
    if (monthIndex0 === 0) { if (year > SKY_MIN_YEAR) { setYear(year - 1); setMonthIndex0(11); } }
    else setMonthIndex0(monthIndex0 - 1);
  };
  const goNextMonth = () => {
    setEmptyDayNotice(false);
    if (atMax) return;
    if (monthIndex0 === 11) { setYear(year + 1); setMonthIndex0(0); }
    else setMonthIndex0(monthIndex0 + 1);
  };
  const shiftYear = (delta) => {
    setEmptyDayNotice(false);
    const ny = Math.max(SKY_MIN_YEAR, Math.min(todayY, year + delta));
    setYear(ny);
    if (ny === todayY && monthIndex0 > todayM) setMonthIndex0(todayM);
  };

  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const firstDayOfWeek = new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isoFor = (dayNum) => `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  const getObsListForDay = (dayNum) => DEMO_OBSERVATIONS.filter((o) => o.dateIso === isoFor(dayNum));
  const getObservationForDay = (dayNum) => {
    const list = getObsListForDay(dayNum);
    return list.find((o) => o.satellite === 'NISAR') || list[0];
  };
  const monthHasScenes = DEMO_OBSERVATIONS.some((o) => o.dateIso && o.dateIso.slice(0, 7) === isoFor(1).slice(0, 7));

  const handleTapDay = (dayNum) => {
    const obs = getObservationForDay(dayNum);
    if (!obs) { setEmptyDayNotice(true); return; }
    setEmptyDayNotice(false);
    if (beforeObs && beforeObs.id === obs.id) { setBeforeObs(null); return; }
    if (afterObs && afterObs.id === obs.id) { setAfterObs(null); return; }
    if (!beforeObs) setBeforeObs(obs);
    else if (!afterObs) setAfterObs(obs);
    else { setBeforeObs(obs); setAfterObs(null); }
  };

  return (
    <Screen title={t('skyFoundTitle')} subtitle={t('skyFoundSubtitle')} footer={<BigButton label={t('checkThisPairBtn')} disabled={!beforeObs || !afterObs} onPress={() => navigate('SkyPair', { beforeId: beforeObs ? beforeObs.id : null, afterId: afterObs ? afterObs.id : null })} />}>
      <Card style={{ padding: 16 }}>
        <View style={skyStyles.monthNavRow}>
          <Pressable onPress={goPrevMonth} disabled={atMin} style={[skyStyles.monthArrowBtn, atMin && { opacity: 0.35 }]}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </Pressable>
          <AppText style={skyStyles.monthHeadingText}>{formatMonthYear(year, monthIndex0, lang)}</AppText>
          <Pressable onPress={goNextMonth} disabled={atMax} style={[skyStyles.monthArrowBtn, atMax && { opacity: 0.35 }]}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>
        <View style={calExtraStyles.yearRow}>
          <Pressable onPress={() => shiftYear(-1)} disabled={year <= SKY_MIN_YEAR} style={[calExtraStyles.yearBtn, year <= SKY_MIN_YEAR && { opacity: 0.35 }]}>
            <AppText style={calExtraStyles.yearBtnText}>{'‹ '}{lang === 'bn' ? toBanglaDigits(year - 1) : year - 1}</AppText>
          </Pressable>
          {monthLoading ? (
            <View style={calExtraStyles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.deepBlue} />
              <AppText style={calExtraStyles.loadingText}>{t('calLoading')}</AppText>
            </View>
          ) : <View />}
          <Pressable onPress={() => shiftYear(1)} disabled={year >= todayY} style={[calExtraStyles.yearBtn, year >= todayY && { opacity: 0.35 }]}>
            <AppText style={calExtraStyles.yearBtnText}>{lang === 'bn' ? toBanglaDigits(year + 1) : year + 1}{' ›'}</AppText>
          </Pressable>
        </View>
        <View style={skyStyles.weekHeaderRow}>
          {WEEKDAY_KEYS.map((wk) => (
            <View key={wk} style={skyStyles.weekHeaderCell}><AppText style={skyStyles.weekHeaderText}>{t(wk)}</AppText></View>
          ))}
        </View>
        <View style={skyStyles.daysGrid}>
          {cells.map((dayNum, idx) => {
            if (dayNum === null) return <View key={`empty-${idx}`} style={skyStyles.dayCell} />;
            const isFuture = year > todayY || (year === todayY && (monthIndex0 > todayM || (monthIndex0 === todayM && dayNum > todayD)));
            const list = getObsListForDay(dayNum);
            const obs = getObservationForDay(dayNum);
            const isMissingCov = obs && obs.coverage === 'missing';
            const isSelected = list.some((o) => (beforeObs && beforeObs.id === o.id) || (afterObs && afterObs.id === o.id));
            const hasNisar = list.some((o) => o.satellite === 'NISAR');
            const hasS1 = list.some((o) => o.satellite !== 'NISAR');
            return (
              <Pressable key={`day-${dayNum}`} disabled={isFuture} onPress={() => handleTapDay(dayNum)} style={[skyStyles.dayCell, isMissingCov && skyStyles.dayCellMissing, isSelected && skyStyles.dayCellSelected, isFuture && { opacity: 0.28 }]}>
                <AppText style={[skyStyles.dayNumText, isSelected && { color: COLORS.deepBlue, fontWeight: '800' }]}>{formatNumber(dayNum, lang)}</AppText>
                {(hasNisar || hasS1) && (
                  <View style={calExtraStyles.dotsRow}>
                    {hasNisar && <View style={[skyStyles.satDot, { backgroundColor: COLORS.primaryBlue }]} />}
                    {hasS1 && <View style={[skyStyles.satDot, { backgroundColor: COLORS.navyBlue }]} />}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={skyStyles.calLegendRow}>
          <View style={skyStyles.calLegendItem}><View style={[skyStyles.satDot, { backgroundColor: COLORS.primaryBlue, marginTop: 0 }]} /><AppText style={skyStyles.calLegendText}>{t('satelliteNisar')}</AppText></View>
          <View style={skyStyles.calLegendItem}><View style={[skyStyles.satDot, { backgroundColor: COLORS.navyBlue, marginTop: 0 }]} /><AppText style={skyStyles.calLegendText}>{t('satelliteSentinel')}</AppText></View>
          <View style={skyStyles.calLegendItem}><View style={skyStyles.hatchSwatch} /><AppText style={skyStyles.calLegendText}>{t('coverageMissing')}</AppText></View>
        </View>
      </Card>
      {emptyDayNotice && (
        <View style={skyStyles.calmBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.deepBlue} />
          <AppText style={skyStyles.calmBannerText}>{t('noObservationOnDay')}</AppText>
        </View>
      )}
      {!monthLoading && !monthHasScenes && (
        <View style={skyStyles.calmBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.deepBlue} />
          <AppText style={skyStyles.calmBannerText}>{t('calNoScenesMonth')}</AppText>
        </View>
      )}
      {DEMO_OBSERVATIONS.length === 0 ? (
        <Card><AppText style={skyStyles.chosenCovText}>{t('noDataAvailable')}</AppText></Card>
      ) : (
        [{ roleLabel: t('beforeLabel'), item: beforeObs }, { roleLabel: t('afterLabel'), item: afterObs }].map(({ roleLabel, item }) => {
          if (!item) return null;
          return (
            <Card key={roleLabel} style={{ padding: 14 }}>
              <View style={skyStyles.chosenRowTop}>
                <View style={skyStyles.roleBadge}><AppText style={skyStyles.roleBadgeText}>{roleLabel}</AppText></View>
                <AppText style={skyStyles.chosenDateText}>{formatDate(item.dateIso, lang, 'full')}</AppText>
              </View>
              <AppText style={skyStyles.chosenCovText} numberOfLines={1}>ID: {item.id}</AppText>
              <View style={skyStyles.chosenMetaRow}>
                <AppText style={skyStyles.chosenSatText}>{item.satellite === 'NISAR' ? t('satelliteNisar') : t('satelliteSentinel')} · {t(item.readinessKey)}</AppText>
                <AppText style={skyStyles.chosenCovText}>{t(item.coverageTextKey)}</AppText>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
};

const SkyPairScreen = () => {
  const { navigate, currentRoute } = useNav();
  const { lang, t } = useLang();
  const beforeId = currentRoute.params && currentRoute.params.beforeId;
  const afterId = currentRoute.params && currentRoute.params.afterId;
  const before = DEMO_OBSERVATIONS.find((o) => o.id === beforeId) || DEMO_OBSERVATIONS[0];
  const after = DEMO_OBSERVATIONS.find((o) => o.id === afterId) || DEMO_OBSERVATIONS[DEMO_OBSERVATIONS.length - 1];

  if (!before || !after) {
    return <Screen title={t('skyPairTitle')} subtitle={t('skyPairSubtitle')}><Card><AppText style={skyStyles.tickTitle}>{t('noDataAvailable')}</AppText></Card></Screen>;
  }

  const fullCover = before.coverage === 'full' && after.coverage === 'full';
  const hasMissing = before.coverage === 'missing' || after.coverage === 'missing';
  const sameSat = before.satellite === after.satellite;
  const sameMaturity = before.readinessKey === after.readinessKey;
  const headlineKey = hasMissing ? 'matchNotIdeal' : sameSat && sameMaturity ? 'matchGood' : 'matchOkay';
  const summaryKey = hasMissing ? 'matchNotIdealSummary' : sameSat && sameMaturity ? 'matchGoodSummary' : 'matchOkaySummary';

  const ticks = [
    { label: t('tickCoversArea'), passed: !hasMissing, reason: fullCover ? t('tickCoversAreaPass') : t('tickCoversAreaPartial') },
    { label: t('tickDatesClose'), passed: before.id !== after.id, reason: before.id !== after.id ? t('tickDatesClosePass') : t('tickDatesCloseFail') },
    { label: t('tickDataReady'), passed: sameMaturity && sameSat, reason: sameMaturity && sameSat ? t('tickDataReadyPass') : t('tickDataReadyMix') },
  ];

  return (
    <Screen title={t('skyPairTitle')} subtitle={t('skyPairSubtitle')} footer={<BigButton label={t('openInDeltaBtn')} onPress={() => navigate('DeltaWhatChanged')} />}>
      <Card style={{ backgroundColor: headlineKey === 'matchGood' ? COLORS.calmGreenBg : COLORS.tint1, borderColor: headlineKey === 'matchGood' ? '#A3CFBB' : COLORS.border }}>
        <AppText style={skyStyles.matchHeadlineText}>{t(headlineKey)}</AppText>
        <AppText style={skyStyles.matchSummaryLine} numberOfLines={2}>{t(summaryKey)}</AppText>
      </Card>
      <View style={skyStyles.pairCardsRow}>
        <Card style={skyStyles.pairMiniCard}>
          <AppText style={skyStyles.pairRoleLabel}>{t('beforeLabel')}</AppText>
          <AppText style={skyStyles.pairDateText}>{formatDate(before.dateIso, lang, 'short')}</AppText>
          <AppText style={skyStyles.pairSatText}>{t(before.readinessKey)}</AppText>
        </Card>
        <Ionicons name="arrow-forward" size={22} color={COLORS.deepBlue} style={{ marginHorizontal: 6, marginBottom: 14 }} />
        <Card style={skyStyles.pairMiniCard}>
          <AppText style={skyStyles.pairRoleLabel}>{t('afterLabel')}</AppText>
          <AppText style={skyStyles.pairDateText}>{formatDate(after.dateIso, lang, 'short')}</AppText>
          <AppText style={skyStyles.pairSatText}>{t(after.readinessKey)}</AppText>
        </Card>
      </View>
      <Card>
        {ticks.map((tk, idx) => (
          <View key={tk.label} style={[skyStyles.tickRow, idx < ticks.length - 1 && skyStyles.tickRowBorder]}>
            <Ionicons name={tk.passed ? 'checkmark-circle' : 'alert-circle'} size={24} color={tk.passed ? COLORS.calmGreenText : COLORS.warningOrange} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <AppText style={skyStyles.tickTitle}>{tk.label}</AppText>
              <AppText style={skyStyles.tickReason} numberOfLines={2}>{tk.reason}</AppText>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
};

const skyStyles = StyleSheet.create({
  sectionLabel: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { backgroundColor: COLORS.bgLight, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill },
  chipSelected: { backgroundColor: COLORS.deepBlue, borderColor: COLORS.deepBlue },
  chipText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  chipTextSelected: { color: COLORS.white },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateSelectorCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: COLORS.border },
  dateSmallTag: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  dateValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValueText: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary },
  sheetDateOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 8, backgroundColor: COLORS.bgLight },
  sheetDateOptionSelected: { backgroundColor: COLORS.deepBlue },
  sheetDateText: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary },
  sheetDateTextSelected: { color: COLORS.white },
  monthNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthArrowBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center' },
  monthHeadingText: { fontFamily: FONTS.headingExtraBold, fontSize: 20, color: COLORS.textPrimary },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderCell: { width: '14.28%', alignItems: 'center' },
  weekHeaderText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textSecondary },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 2, position: 'relative', overflow: 'hidden' },
  dayCellMissing: { backgroundColor: '#E2E8F0' },
  dayCellSelected: { borderWidth: 2.5, borderColor: COLORS.deepBlue, backgroundColor: COLORS.tint1 },
  dayNumText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  satDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 3 },
  calLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.surface },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calLegendText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  hatchSwatch: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#94A3B8' },
  calmBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.tint1, padding: 12, borderRadius: 14, marginBottom: 12 },
  calmBannerText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.navyBlue },
  chosenRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  roleBadge: { backgroundColor: COLORS.deepBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  roleBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  chosenDateText: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary },
  chosenMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  chosenSatText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  chosenCovText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  matchHeadlineText: { fontFamily: FONTS.headingExtraBold, fontSize: 24, color: COLORS.textPrimary },
  matchSummaryLine: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  pairCardsRow: { flexDirection: 'row', alignItems: 'center' },
  pairMiniCard: { flex: 1, padding: 14 },
  pairRoleLabel: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  pairDateText: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary, marginVertical: 2 },
  pairSatText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  tickRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  tickRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  tickTitle: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary },
  tickReason: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary, marginTop: 2 },
});

// --- FEATURE 2: DELTA ---
const DeltaWhatChangedScreen = () => {
  const { navigate, setSharedPin } = useNav();
  const { lang, t } = useLang();
  const [dragging, setDragging] = useState(false);
  const [spotSheetPin, setSpotSheetPin] = useState(null);

  return (
    <Screen title={t('deltaWhatChangedTitle')} subtitle={t('deltaWhatChangedSubtitle')} scrollEnabled={!dragging} footer={<BigButton label={t('moreNumbersBtn')} onPress={() => navigate('DeltaNumbers')} />}>
      <Card style={{ padding: 12 }}>
        <BeforeAfterSwipe height={295} leftVariant="before" rightVariant="after" leftPillText={t('beforePill')} rightPillText={t('afterPill')} onDragStateChange={setDragging} onTapSpot={(x, y) => { setSharedPin({ x, y }); setSpotSheetPin({ x, y }); }} />
      </Card>
      <Card>
        <View style={deltaStyles.rowBetween}><AppText style={deltaStyles.statLabel}>{t('floodedAreaTitle')}</AppText><EvidenceChip level="Proposed" /></View>
        <View style={deltaStyles.valueRow}><AppText style={deltaStyles.bigNumber}>{formatNumber(DEMO_CHANGE_SUMMARY.floodedAreaKm2, lang, { decimals: 1 })}</AppText></View>
        <AppText style={deltaStyles.noteLine} numberOfLines={2}>{t('floodedAreaNote')}</AppText>
      </Card>
      <BottomSheet visible={spotSheetPin !== null} title={t('featureSpotCheck')} onClose={() => setSpotSheetPin(null)}>
        <View style={[deltaStyles.rowBetween, { marginBottom: 12 }]}><AppText style={deltaStyles.sheetFindingText}>{t('findingLandToWater')}</AppText><EvidenceChip level="Proposed" /></View>
        <AppText style={[deltaStyles.noteLine, { marginBottom: 16 }]}>{t('spotNameDefault')}</AppText>
        <BigButton label={t('openFullSpotCheckBtn')} onPress={() => { setSpotSheetPin(null); navigate('SpotRadarSays'); }} />
      </BottomSheet>
    </Screen>
  );
};

const DeltaNumbersScreen = () => {
  const { navigate } = useNav();
  const { lang, t } = useLang();
  return (
    <Screen title={t('deltaNumbersTitle')} subtitle={t('deltaNumbersSubtitle')} footer={<BigButton label={t('seeOverTimeBtn')} onPress={() => navigate('DeltaOverTime')} />}>
      <Card>
        <View style={deltaStyles.rowBetween}><AppText style={deltaStyles.statLabel}>{t('floodedAreaTitle')}</AppText><EvidenceChip level="Proposed" /></View>
        <View style={deltaStyles.valueRow}><AppText style={deltaStyles.bigNumber}>{formatNumber(DEMO_CHANGE_SUMMARY.floodedAreaKm2, lang, { decimals: 1 })}</AppText></View>
        <AppText style={deltaStyles.noteLine} numberOfLines={2}>{t('floodedAreaNote')}</AppText>
      </Card>
      <Card>
        <AppText style={deltaStyles.statLabel}>{t('islandSizeTitle')}</AppText>
        <View style={deltaStyles.valueRow}><AppText style={deltaStyles.bigNumber}>{formatNumber(DEMO_CHANGE_SUMMARY.islandSizeKm2, lang, { decimals: 1 })}</AppText></View>
        <AppText style={deltaStyles.noteLine} numberOfLines={2}>{t('islandSizeNote')}</AppText>
      </Card>
      <Card>
        <AppText style={deltaStyles.statLabel}>{t('riverEdgeMovedTitle')}</AppText>
        <View style={deltaStyles.valueRow}><AppText style={deltaStyles.bigNumber}>{formatNumber(DEMO_CHANGE_SUMMARY.riverEdgeMovedMetres, lang)}</AppText></View>
        <AppText style={deltaStyles.noteLine} numberOfLines={2}>{t('riverEdgeMovedNote')}</AppText>
      </Card>
      <Card>
        <View style={deltaStyles.rowBetween}><AppText style={deltaStyles.statLabel}>{t('farmlandAffectedTitle')}</AppText><EvidenceChip level="Proposed" /></View>
        <View style={deltaStyles.valueRow}><AppText style={deltaStyles.bigNumber}>{formatNumber(DEMO_CHANGE_SUMMARY.farmlandAffectedHa, lang)}</AppText></View>
        <AppText style={deltaStyles.noteLine} numberOfLines={2}>{t('farmlandAffectedNote')}</AppText>
      </Card>
    </Screen>
  );
};

const DeltaOverTimeScreen = () => {
  const { selectedAreaId, nasaSyncTick } = useNav();
  const { lang, t } = useLang();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const points = DEMO_OVER_TIME.points;
  const currentPoint = points[selectedIdx] || points[0];

  return (
    <Screen title={t('deltaOverTimeTitle')} subtitle={t('deltaOverTimeSubtitle')}>
      <View style={deltaStyles.chipsRow} key={`ot-${nasaSyncTick}`}>
        {points.map((pt, idx) => {
          const active = idx === selectedIdx;
          return (
            <Pressable key={pt.id} onPress={() => setSelectedIdx(idx)} style={[deltaStyles.chip, active && deltaStyles.chipActive]}>
              <AppText style={[deltaStyles.chipText, active && deltaStyles.chipTextActive]}>{formatDate(pt.dateIso, lang, 'short')}</AppText>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ padding: 12 }}><RiverMap height={185} selectedAreaId={selectedAreaId} variant="area" /></Card>
      <Card>
        <AppText style={deltaStyles.rainHeading}>{t('rainMeasuredLabel')}</AppText>
        <View style={deltaStyles.rainBarsRow}>
          {points.map((pt, idx) => {
            const active = idx === selectedIdx;
            const barHeight = Math.max(10, Math.round((pt.rainMm / 60) * 52));
            return (
              <Pressable key={pt.id} onPress={() => setSelectedIdx(idx)} style={deltaStyles.rainCol}>
                <AppText style={deltaStyles.rainDateLabel}>{formatNumber(pt.rainMm, lang, { decimals: 1 })}</AppText>
                <View style={[deltaStyles.rainBar, { height: Math.min(54, barHeight), backgroundColor: active ? COLORS.deepBlue : COLORS.water }]} />
                <AppText style={deltaStyles.rainDateLabel}>{formatDate(pt.dateIso, lang, 'short')}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>
      {DEMO_OVER_TIME.observationsCount >= 1 && (
        <Card style={{ backgroundColor: COLORS.tint1 }}>
          <AppText style={deltaStyles.floodedCountLine}>{t('floodedInCountLine', { x: formatNumber(DEMO_OVER_TIME.observationsCount, lang), y: formatNumber(DEMO_OVER_TIME.sentinel1Count, lang) })}</AppText>
        </Card>
      )}
    </Screen>
  );
};

const deltaStyles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 17, color: COLORS.textSecondary, flexShrink: 1, marginRight: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 4 },
  bigNumber: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.textPrimary },
  noteLine: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 21, color: COLORS.textSecondary },
  sheetFindingText: { fontFamily: FONTS.headingExtraBold, fontSize: 18, color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: COLORS.bgLight, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill },
  chipActive: { backgroundColor: COLORS.deepBlue, borderColor: COLORS.deepBlue },
  chipText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.white },
  rainHeading: { fontFamily: FONTS.headingBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 12 },
  rainBarsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 92 },
  rainCol: { flex: 1, alignItems: 'center' },
  rainBar: { width: 24, borderRadius: 6, marginTop: 4 },
  rainDateLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  floodedCountLine: { fontFamily: FONTS.headingExtraBold, fontSize: 17, color: COLORS.navyBlue },
});

// --- FEATURE 3: DUET ---
const DuetTwoViewsScreen = () => {
  const { navigate } = useNav();
  const { t } = useLang();
  const [dragging, setDragging] = useState(false);
  return (
    <Screen title={t('duetTwoViewsTitle')} subtitle={t('duetTwoViewsSubtitle')} scrollEnabled={!dragging} footer={<BigButton label={t('whereDifferBtn')} onPress={() => navigate('DuetDiffer')} />}>
      <Card style={{ padding: 12 }}>
        <BeforeAfterSwipe height={265} leftVariant="lband" rightVariant="cband" leftPillText={t('lBandPill')} rightPillText={t('cBandPill')} leftSubCaption={t('satelliteNisar')} rightSubCaption={t('satelliteSentinel')} onDragStateChange={setDragging} />
      </Card>
      <Card style={{ padding: 16 }}>
        <AppText style={duetStyles.lBandLine}>{t('lBandChipLine')}</AppText>
        <AppText style={duetStyles.cBandLine}>{t('cBandChipLine')}</AppText>
      </Card>
    </Screen>
  );
};

const DuetDifferScreen = () => {
  const { navigate, selectedAreaId } = useNav();
  const { lang, t } = useLang();
  const [tabIdx, setTabIdx] = useState(2);
  const tabs = [t('tabLBand'), t('tabCBand'), t('tabDifferences')];
  const mapVariant = tabIdx === 0 ? 'lband' : tabIdx === 1 ? 'cband' : 'diff';
  return (
    <Screen title={t('duetDifferTitle')} subtitle={t('duetDifferSubtitle')} footer={<BigButton label={t('wasThisCheckedBtn')} onPress={() => navigate('DuetChecked')} />}>
      <View style={duetStyles.segWrap}>
        {tabs.map((label, idx) => {
          const active = idx === tabIdx;
          return (
            <Pressable key={label} onPress={() => setTabIdx(idx)} style={[duetStyles.segTab, active && duetStyles.segTabActive]}>
              <AppText style={[duetStyles.segTabText, active && duetStyles.segTabTextActive]}>{label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ padding: 12 }}><RiverMap height={195} selectedAreaId={selectedAreaId} variant={mapVariant} /></Card>
      <Card>
        <AppText style={duetStyles.headlineText}>{t('mostlyMatchHeadline', { pct: formatNumber(DEMO_BAND_COMPARISON.agreementPercent, lang) })}</AppText>
        <AppText style={duetStyles.noteText} numberOfLines={2}>{t('differNote')}</AppText>
      </Card>
      <Expander>
        <AppText style={duetStyles.detailLine}>{t('iouExplain', { val: formatNumber(DEMO_BAND_COMPARISON.iouValue, lang, { decimals: 2 }) })}</AppText>
        <AppText style={[duetStyles.detailLine, { marginTop: 8 }]}>{t('kappaExplain', { val: formatNumber(DEMO_BAND_COMPARISON.kappaValue, lang, { decimals: 2 }) })}</AppText>
      </Expander>
    </Screen>
  );
};

const DuetCheckedScreen = () => {
  const { selectedAreaId } = useNav();
  const { t } = useLang();
  const [showFarmland, setShowFarmland] = useState(true);
  const checked = DEMO_BAND_COMPARISON.referenceAvailable;
  return (
    <Screen title={t('duetCheckedTitle')} subtitle={t('duetCheckedSubtitle')}>
      <Card style={{ backgroundColor: checked ? COLORS.calmGreenBg : COLORS.surface }}>
        <AppText style={duetStyles.checkedCardText}>{checked ? t('checkedTrueCard') : t('checkedFalseCard')}</AppText>
      </Card>
      <Card>
        <View style={duetStyles.rowBetween}><AppText style={duetStyles.toggleTitle}>{t('showFarmlandToggle')}</AppText><Switch value={showFarmland} onValueChange={setShowFarmland} /></View>
        {showFarmland && <View style={[duetStyles.rowBetween, { marginTop: 10 }]}><AppText style={duetStyles.possiblePlantsText}>{t('possibleFloodedPlants')}</AppText><EvidenceChip level="Proposed" /></View>}
      </Card>
      <Card style={{ padding: 12 }}><RiverMap height={195} selectedAreaId={selectedAreaId} variant={showFarmland ? 'after' : 'lband'} /></Card>
    </Screen>
  );
};

const duetStyles = StyleSheet.create({
  lBandLine: { fontFamily: FONTS.headingBold, fontSize: 16, color: COLORS.deepBlue, marginBottom: 8 },
  cBandLine: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textSecondary },
  segWrap: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 4, marginBottom: 14 },
  segTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segTabActive: { backgroundColor: COLORS.white },
  segTabText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary },
  segTabTextActive: { fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  headlineText: { fontFamily: FONTS.headingExtraBold, fontSize: 20, color: COLORS.textPrimary },
  noteText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  detailLine: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },
  checkedCardText: { fontFamily: FONTS.headingBold, fontSize: 18, lineHeight: 25, color: COLORS.textPrimary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleTitle: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary },
  possiblePlantsText: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textSecondary },
});

// --- FEATURE 4: SPOT CHECK ---
const SpotTapScreen = () => {
  const { navigate, selectedAreaId, sharedPin, setSharedPin } = useNav();
  const { lang, t } = useLang();
  return (
    <Screen title={t('spotTapTitle')} subtitle={t('spotTapSubtitle')} footer={<BigButton label={t('lookCloserBtn')} onPress={() => navigate('SpotRadarSays')} />}>
      <Card style={{ padding: 12 }}>
        <RiverMap height={245} selectedAreaId={selectedAreaId} variant="after" pinXPercent={sharedPin.x} pinYPercent={sharedPin.y} onTapMap={(x, y) => setSharedPin({ x, y })} />
      </Card>
      <Card>
        <AppText style={spotStyles.spotCardHeading}>{t('selectedSpotTitle')}</AppText>
        <AppText style={spotStyles.spotCardSub}>{t(DEMO_LOCATION_INSPECTION.spotNameKey)} ({formatNumber(sharedPin.x, lang)}%, {formatNumber(sharedPin.y, lang)}%)</AppText>
      </Card>
    </Screen>
  );
};

const SpotRadarSaysScreen = () => {
  const { navigate } = useNav();
  const { lang, t } = useLang();
  return (
    <Screen title={t('spotRadarSaysTitle')} subtitle={t('spotRadarSaysSubtitle')} footer={<BigButton label={t('whatBacksThisUpBtn')} onPress={() => navigate('SpotEvidence')} />}>
      <Card>
        <View style={[spotStyles.rowBetween, { marginBottom: 10 }]}><AppText style={spotStyles.findingPrimary}>{t('findingLandToWater')}</AppText><EvidenceChip level="Proposed" /></View>
        <View style={spotStyles.rowBetween}><AppText style={spotStyles.findingSecondary}>{t('possibleFloodedPlants')}</AppText><EvidenceChip level="Proposed" /></View>
      </Card>
      <Card>
        <AppText style={spotStyles.baselineLabel}>{t('normalBandPrefix')} {t(DEMO_LOCATION_INSPECTION.baselineSourceKey)}</AppText>
        <AppText style={spotStyles.captionText}>{t('chartCaption')}</AppText>
      </Card>
    </Screen>
  );
};

const SpotEvidenceScreen = () => {
  const { t } = useLang();
  return (
    <Screen title={t('spotEvidenceTitle')} subtitle={t('spotEvidenceSubtitle')}>
      {DEMO_LOCATION_INSPECTION.sources.map((src) => (
        <Card key={src.id}>
          <AppText style={spotStyles.sourceTitle}>{t(src.titleKey)}</AppText>
          <AppText style={spotStyles.canShowHeading}>{t('whatCanShowLabel')}:</AppText>
          <AppText style={spotStyles.sourceBody}>{t(src.canShowKey)}</AppText>
          <AppText style={spotStyles.cannotProveHeading}>{t('whatCannotProveLabel')}:</AppText>
          <AppText style={spotStyles.sourceBody}>{t(src.cannotProveKey)}</AppText>
        </Card>
      ))}
    </Screen>
  );
};

const spotStyles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotCardHeading: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary },
  spotCardSub: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  findingPrimary: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary, flexShrink: 1, marginRight: 8 },
  findingSecondary: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textSecondary, flexShrink: 1, marginRight: 8 },
  baselineLabel: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.deepBlue, marginBottom: 8 },
  chartDatesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  chartDateItem: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  captionText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 21, color: COLORS.textSecondary },
  sourceTitle: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 8 },
  canShowHeading: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.calmGreenText },
  cannotProveHeading: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.warningOrange, marginTop: 8 },
  sourceBody: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 21, color: COLORS.textSecondary, marginTop: 2 },
});

// --- FEATURE 5: TRUST LEDGER ---
const TrustListScreen = () => {
  const { navigate, nasaSyncTick } = useNav();
  const { lang, t } = useLang();
  return (
    <Screen title={t('trustTitle')} subtitle={t('trustSubtitle')}>
      <Card style={{ backgroundColor: COLORS.bgLight }}>
        <AppText style={trustStyles.legendLine}>• {t('evidenceObserved')}: {t('evidenceObservedMeaning')}</AppText>
        <AppText style={trustStyles.legendLine}>• {t('evidenceDerived')}: {t('evidenceDerivedMeaning')}</AppText>
        <AppText style={[trustStyles.legendLine, { marginBottom: 0 }]}>• {t('evidenceProposed')}: {t('evidenceProposedMeaning')}</AppText>
      </Card>
      <View key={`trust-live-${nasaSyncTick}`}>
        {DEMO_OBSERVATIONS.slice(0, 4).map((obs) => (
          <Card key={obs.id}>
            <View style={trustStyles.rowBetween}><AppText style={trustStyles.itemTitle}>{obs.satellite}</AppText><EvidenceChip level="Observed" /></View>
            <AppText style={trustStyles.itemSub}>scene_id: {obs.id} · {formatDate(obs.dateIso, lang, 'full')} · {t(obs.readinessKey)}</AppText>
          </Card>
        ))}
      </View>
      {DEMO_TRUST_LEDGER.map((item) => (
        <Card key={item.id} onPress={() => navigate('TrustDetails', { recordId: item.id })}>
          <View style={trustStyles.rowBetween}><AppText style={trustStyles.itemTitle}>{t(item.titleKey)}</AppText><EvidenceChip level={item.level} /></View>
          <AppText style={trustStyles.itemSub}>{t(item.valueTextKey)}</AppText>
        </Card>
      ))}
    </Screen>
  );
};

const TrustDetailsScreen = () => {
  const { currentRoute } = useNav();
  const { lang, t } = useLang();
  const recordId = (currentRoute.params && currentRoute.params.recordId) || 'NASA-EVD-001';
  const item = DEMO_TRUST_LEDGER.find((r) => r.id === recordId) || DEMO_TRUST_LEDGER[0];
  const dateLine = item.beforeDateIso && item.afterDateIso ? `${formatDate(item.beforeDateIso, lang, 'full')} → ${formatDate(item.afterDateIso, lang, 'full')}` : item.afterDateIso ? formatDate(item.afterDateIso, lang, 'full') : t('noDataAvailable');

  return (
    <Screen title={t('trustDetailsTitle')} subtitle={t(item.titleKey)}>
      <Card>
        <AppText style={trustStyles.fieldHeading}>{t('whereCameFromLabel')}</AppText>
        <AppText style={trustStyles.fieldBody}>{t(item.cameFromKey)}</AppText>
        <AppText style={[trustStyles.fieldHeading, { marginTop: 12 }]}>{t('observationDateLabel')}</AppText>
        <AppText style={trustStyles.fieldBody}>{dateLine}</AppText>
        <AppText style={[trustStyles.fieldHeading, { marginTop: 12 }]}>{t('dataReadinessLabel')}</AppText>
        <AppText style={trustStyles.fieldBody}>{t(item.readinessPlainKey)}</AppText>
        <AppText style={trustStyles.versionSmall}>{t(item.versionLabelKey)}</AppText>
      </Card>
      {item.coverageWarningKey && (
        <Card style={{ backgroundColor: '#FFF9EB', borderColor: COLORS.warningOrange }}>
          <AppText style={trustStyles.warningText}>{t(item.coverageWarningKey)}</AppText>
        </Card>
      )}
      <Card>
        <AppText style={trustStyles.cannotTitle}>{t('whatRadarCannotTellTitle')}</AppText>
        <AppText style={trustStyles.fieldBody}>• {t('cannotBullet1')}</AppText>
        <AppText style={trustStyles.fieldBody}>• {t('cannotBullet2')}</AppText>
        <AppText style={trustStyles.fieldBody}>• {t('cannotBullet3')}</AppText>
      </Card>
    </Screen>
  );
};

const trustStyles = StyleSheet.create({
  legendLine: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, flexShrink: 1, marginRight: 8 },
  itemSub: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },
  fieldHeading: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary },
  fieldBody: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, marginTop: 2 },
  versionSmall: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textTertiary, marginTop: 10 },
  warningText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#B45309' },
  cannotTitle: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 6 },
});

// --- FEATURE 6: EVIDENCE BRIEF ---
const BriefBuildScreen = () => {
  const { navigate } = useNav();
  const { lang, setLang, t } = useLang();
  const [includeMap, setIncludeMap] = useState(true);
  const [includePop, setIncludePop] = useState(true);
  return (
    <Screen title={t('briefBuildTitle')} subtitle={t('briefBuildSubtitle')} footer={<BigButton label={t('previewBtn')} onPress={() => navigate('BriefPreview', { includeMap, includePop })} />}>
      <Card>
        <View style={[briefStyles.toggleRow, { marginBottom: 16 }]}><AppText style={briefStyles.toggleLabel}>{t('includeMapToggle')}</AppText><Switch value={includeMap} onValueChange={setIncludeMap} /></View>
        <View style={[briefStyles.toggleRow, { marginBottom: 16 }]}><AppText style={briefStyles.toggleLabel}>{t('includePopToggle')}</AppText><Switch value={includePop} onValueChange={setIncludePop} /></View>
        <View style={briefStyles.toggleRow}><AppText style={briefStyles.toggleLabel}>{t('languageToggleLabel')}</AppText><Switch value={lang === 'bn'} onValueChange={(v) => setLang(v ? 'bn' : 'en')} /></View>
      </Card>
    </Screen>
  );
};

const BriefPreviewScreen = () => {
  const { currentRoute, goBack, selectedAreaId } = useNav();
  const { lang, t } = useLang();
  const includeMap = currentRoute.params && typeof currentRoute.params.includeMap === 'boolean' ? currentRoute.params.includeMap : true;
  const includePop = currentRoute.params && typeof currentRoute.params.includePop === 'boolean' ? currentRoute.params.includePop : true;
  const [sharedBanner, setSharedBanner] = useState(false);

  const selectedArea = DEMO_AREAS.find((a) => a.id === selectedAreaId) || DEMO_AREAS[0];
  const beforeFormatted = formatDate(selectedArea.defaultBeforeIso, lang, 'short');
  const afterFormatted = formatDate(selectedArea.defaultAfterIso, lang, 'full');
  const changedAreaFormatted = formatNumber(DEMO_BRIEF.changedAreaKm2, lang, { decimals: 1 });
  const popFormatted = formatNumber(DEMO_BRIEF.estimatedPeopleInMappedArea, lang);

  const handleSharePdf = async () => {
    try {
      const html = `<html><body style="font-family:sans-serif;padding:24px;color:#0F172A;"><h1 style="color:#00589B;">${t('briefDocHeading')}</h1><p><strong>${t(selectedArea.nameKey)}</strong> · ${beforeFormatted} → ${afterFormatted}</p><h2>${changedAreaFormatted} (${t('floodedAreaTitle')})</h2><p>${DEMO_BRIEF.sceneIds.join(' · ')}</p></body></html>`;
      if (Platform.OS === 'web') await Print.printAsync({ html });
      else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      }
      setSharedBanner(true);
    } catch (e) {
      setSharedBanner(true);
    }
  };

  return (
    <Screen title={t('briefPageTitle')} footer={<View style={{ gap: 10 }}><BigButton label={t('shareAsPdfBtn')} onPress={handleSharePdf} /><BigButton label={t('backToEditBtn')} variant="secondary" onPress={goBack} /></View>}>
      {sharedBanner && <Card style={{ backgroundColor: COLORS.tint1, padding: 12 }}><AppText style={briefStyles.bannerText}>{t('briefSharedBanner')}</AppText></Card>}
      <Card>
        <AppText style={briefStyles.docTitle}>{t('briefDocHeading')}</AppText>
        <AppText style={briefStyles.docMeta}>{t(selectedArea.nameKey)} · {beforeFormatted} → {afterFormatted}</AppText>
        {includeMap && <View style={{ marginVertical: 12 }}><RiverMap height={160} selectedAreaId={selectedAreaId} variant="after" /></View>}
        <View style={briefStyles.bigStatRow}><AppText style={briefStyles.bigStatNum}>{changedAreaFormatted}</AppText></View>
        <AppText style={briefStyles.sectionHeading}>{t('priorityPlacesHeading')}</AppText>
        <AppText style={briefStyles.placeLine}>{formatNumber(1, lang)}. {t('place1Name')} — {t('place1Reason')}</AppText>
        <AppText style={briefStyles.placeLine}>{formatNumber(2, lang)}. {t('place2Name')} — {t('place2Reason')}</AppText>
        <AppText style={briefStyles.placeLine}>{formatNumber(3, lang)}. {t('place3Name')} — {t('place3Reason')}</AppText>
        {includePop && <View style={briefStyles.popBox}><AppText style={briefStyles.popText}>{t('populationEstimateLine', { pop: popFormatted })}</AppText></View>}
        <AppText style={briefStyles.sceneIdsText}>{DEMO_BRIEF.sceneIds.join(' · ')}</AppText>
        <View style={briefStyles.limitsBox}>
          <AppText style={briefStyles.limitsHeading}>{t('limitsHeading')}</AppText>
          <AppText style={briefStyles.limitBullet}>• {t('limit1')}</AppText>
          <AppText style={briefStyles.limitBullet}>• {t('limit2')}</AppText>
          <AppText style={briefStyles.limitBullet}>• {t('limit3')}</AppText>
        </View>
      </Card>
    </Screen>
  );
};

const briefStyles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, flexShrink: 1, marginRight: 10 },
  bannerText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.navyBlue },
  docTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.navyBlue },
  docMeta: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  bigStatRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  bigStatNum: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.textPrimary },
  sectionHeading: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary, marginTop: 14, marginBottom: 6 },
  placeLine: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 4 },
  popBox: { backgroundColor: COLORS.bgLight, padding: 12, borderRadius: 14, marginTop: 12 },
  popText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  sceneIdsText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textTertiary, marginTop: 10 },
  limitsBox: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.warningOrange, padding: 12, borderRadius: 14, marginTop: 12 },
  limitsHeading: { fontFamily: FONTS.headingBold, fontSize: 16, color: '#B45309', marginBottom: 4 },
  limitBullet: { fontFamily: FONTS.bodySemiBold, fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
});

// --- FEATURE 7: EXPLAIN LAYER (static keyword-matched reference notes) ---
const ROLE_OPTIONS = [
  { role: 'Resource manager', labelKey: 'roleResourceManager' },
  { role: 'Farmer', labelKey: 'roleFarmer' },
  { role: 'Researcher', labelKey: 'roleResearcher' },
  { role: 'Student', labelKey: 'roleStudent' },
];
const SUGGESTED_QUESTIONS = ['qWhatIsChar', 'qWhatIsProposed', 'qWhatChanged', 'qWhyNotTested'];

const AdvisorHelloScreen = () => {
  const { navigate } = useNav();
  const { t } = useLang();
  const [selectedRole, setSelectedRole] = useState('Resource manager');
  return (
    <Screen title={t('advisorHelloTitle')} subtitle={t('advisorHelloIntro')} footer={<View style={{ gap: 10 }}><BigButton label={t('askAQuestionBtn')} onPress={() => navigate('AdvisorChat', { role: selectedRole })} /><BigButton label={t('walkMeThroughBtn')} variant="secondary" onPress={() => navigate('AdvisorWalkthrough')} /></View>}>
      <Card style={advisorStyles.disclosureCard}>
        <View style={advisorStyles.disclosureRow}>
          <View style={advisorStyles.aiSmallBadge}><AppText style={advisorStyles.aiSmallBadgeText}>{t('aiPill')}</AppText></View>
          <AppText style={advisorStyles.disclosureText}>{t('advisorAiDisclosure')}</AppText>
        </View>
      </Card>
      <AppText style={advisorStyles.sectionHeading}>{t('yourRoleLabel')}</AppText>
      <View style={advisorStyles.chipsWrap}>
        {ROLE_OPTIONS.map((item) => {
          const active = item.role === selectedRole;
          return (
            <Pressable key={item.role} onPress={() => setSelectedRole(item.role)} style={[advisorStyles.roleChip, active && advisorStyles.roleChipActive]}>
              <AppText style={[advisorStyles.roleChipText, active && advisorStyles.roleChipTextActive]}>{t(item.labelKey)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText style={advisorStyles.sectionHeading}>{t('suggestedQuestionsLabel')}</AppText>
      <View style={advisorStyles.questionsList}>
        {SUGGESTED_QUESTIONS.map((qKey) => {
          const qText = t(qKey);
          return (
            <Pressable key={qKey} onPress={() => navigate('AdvisorChat', { role: selectedRole, initialQuestion: qText })} style={advisorStyles.questionCardChip}>
              <AppText style={advisorStyles.questionChipText}>{qText}</AppText>
              <Ionicons name="arrow-forward-circle-outline" size={22} color={COLORS.deepBlue} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
};

const AdvisorChatScreen = () => {
  const { currentRoute, navigate } = useNav();
  const { lang, t } = useLang();
  const role = (currentRoute.params && currentRoute.params.role) || 'Resource manager';
  const initialQuestion = currentRoute.params && currentRoute.params.initialQuestion;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSendQuestion = async (qText) => {
    const trimmed = String(qText || '').trim();
    if (!trimmed) return;
    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: trimmed };
    const ans = await askAdvisor(trimmed, role, lang, t);
    const advisorMsg = { id: `a-${Date.now() + 1}`, sender: 'advisor', text: ans.text, answerMeta: ans };
    setMessages((prev) => [...prev, userMsg, advisorMsg]);
  };

  useEffect(() => { if (initialQuestion) handleSendQuestion(initialQuestion); }, [initialQuestion]);

  return (
    <Screen title={t('advisorChatTitle')} subtitle={t('advisorAiDisclosure')} footer={
      <View style={advisorStyles.chatFooterCol}>
        <View style={advisorStyles.inputRow}>
          <TextInput value={input} onChangeText={setInput} placeholder={t('advisorChatPlaceholder')} placeholderTextColor={COLORS.textTertiary} style={advisorStyles.textInput} />
          <Pressable onPress={() => { const q = input; setInput(''); handleSendQuestion(q); }} style={advisorStyles.sendButton}>
            <Ionicons name="send" size={20} color={COLORS.white} />
          </Pressable>
        </View>
        <Pressable onPress={() => setMessages([])} style={advisorStyles.newChatBtn}>
          <Ionicons name="refresh-outline" size={18} color={COLORS.deepBlue} />
          <AppText style={advisorStyles.newChatBtnText}>{t('newChatBtn')}</AppText>
        </Pressable>
      </View>
    }>
      {messages.length === 0 && (
        <View style={advisorStyles.questionsList}>
          {SUGGESTED_QUESTIONS.map((qKey) => {
            const qText = t(qKey);
            return (
              <Pressable key={qKey} onPress={() => handleSendQuestion(qText)} style={advisorStyles.questionCardChip}>
                <AppText style={advisorStyles.questionChipText}>{qText}</AppText>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.deepBlue} />
              </Pressable>
            );
          })}
        </View>
      )}
      {messages.map((msg) => {
        if (msg.sender === 'user') {
          return (
            <View key={msg.id} style={advisorStyles.userBubbleWrap}>
              <LinearGradient colors={GRADIENTS.gradient2} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={advisorStyles.userBubble}>
                <AppText style={advisorStyles.userBubbleText}>{msg.text}</AppText>
              </LinearGradient>
            </View>
          );
        }
        const meta = msg.answerMeta;
        return (
          <View key={msg.id} style={advisorStyles.advisorBubble}>
            <AppText style={advisorStyles.advisorDisclosureTag}>{t('aiPill')} · {t('advisorAiDisclosure')}</AppText>
            <AppText style={advisorStyles.advisorBubbleText}>{msg.text}</AppText>
            {meta && meta.sourceTitles && meta.sourceTitles.length > 0 && (
              <View style={advisorStyles.sourceChip}><AppText style={advisorStyles.sourceChipText}>{t('sourceChipPrefix')} {meta.sourceTitles.join(' · ')}</AppText></View>
            )}
            {meta && meta.limitNote && <View style={advisorStyles.limitNoteBox}><AppText style={advisorStyles.limitNoteText}>{meta.limitNote}</AppText></View>}
            {meta && meta.actionScreen && meta.actionLabelKey && (
              <Pressable onPress={() => navigate(meta.actionScreen)} style={advisorStyles.openFeatureSmallBtn}>
                <AppText style={advisorStyles.openFeatureSmallText}>{t(meta.actionLabelKey)}</AppText>
                <Ionicons name="arrow-forward" size={16} color={COLORS.deepBlue} />
              </Pressable>
            )}
          </View>
        );
      })}
    </Screen>
  );
};

const AdvisorWalkthroughScreen = () => {
  const { goBack } = useNav();
  const { lang, t } = useLang();
  const [stepIdx, setStepIdx] = useState(0);
  const step = WALKTHROUGH_STEPS[stepIdx] || WALKTHROUGH_STEPS[0];
  const isLast = stepIdx >= WALKTHROUGH_STEPS.length - 1;
  return (
    <Screen title={t('advisorWalkTitle')} subtitle={t('advisorWalkSubtitle')} footer={
      <View style={advisorStyles.walkFooterRow}>
        {stepIdx > 0 && <View style={{ flex: 1 }}><BigButton label={t('prevStepBtn')} variant="secondary" onPress={() => setStepIdx((s) => Math.max(0, s - 1))} /></View>}
        <View style={{ flex: 1 }}><BigButton label={isLast ? t('doneStepBtn') : t('nextStepBtn')} onPress={() => (isLast ? goBack() : setStepIdx((s) => s + 1))} /></View>
      </View>
    }>
      <Card style={advisorStyles.walkCard}>
        <TorongoMark width={110} />
        <AppText style={advisorStyles.walkStepTitle}>{lang === 'bn' ? step.bnTitle : step.enTitle}</AppText>
        <AppText style={advisorStyles.walkStepBody}>{lang === 'bn' ? step.bnBody : step.enBody}</AppText>
        <View style={advisorStyles.dotsRow}>
          {WALKTHROUGH_STEPS.map((item, idx) => <View key={item.id} style={[advisorStyles.dot, idx === stepIdx && advisorStyles.dotActive]} />)}
        </View>
      </Card>
    </Screen>
  );
};

const advisorStyles = StyleSheet.create({
  disclosureCard: { backgroundColor: COLORS.tint1, borderColor: COLORS.tint2, padding: 14 },
  disclosureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiSmallBadge: { backgroundColor: COLORS.deepBlue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  aiSmallBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white },
  disclosureText: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.navyBlue },
  sectionHeading: { fontFamily: FONTS.headingBold, fontSize: 18, color: COLORS.textPrimary, marginBottom: 10, marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  roleChip: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill },
  roleChipActive: { backgroundColor: COLORS.deepBlue, borderColor: COLORS.deepBlue },
  roleChipText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  roleChipTextActive: { color: COLORS.white },
  questionsList: { gap: 10, marginBottom: 16 },
  questionCardChip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  questionChipText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  userBubbleWrap: { alignSelf: 'flex-end', maxWidth: '86%', borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  userBubble: { paddingHorizontal: 16, paddingVertical: 12 },
  userBubbleText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white },
  advisorBubble: { alignSelf: 'flex-start', width: '94%', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 22, padding: 16, marginBottom: 14 },
  advisorDisclosureTag: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue, marginBottom: 6 },
  advisorBubbleText: { fontFamily: FONTS.bodySemiBold, fontSize: 16, lineHeight: 24, color: COLORS.textPrimary },
  sourceChip: { alignSelf: 'flex-start', backgroundColor: COLORS.tint1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, marginTop: 10 },
  sourceChipText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  limitNoteBox: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.warningOrange, borderRadius: 14, padding: 10, marginTop: 10 },
  limitNoteText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textPrimary },
  openFeatureSmallBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: COLORS.deepBlue, backgroundColor: COLORS.white },
  openFeatureSmallText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  chatFooterCol: { gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: { flex: 1, minHeight: 52, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary },
  sendButton: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.deepBlue, alignItems: 'center', justifyContent: 'center' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  newChatBtnText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.deepBlue },
  walkCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  walkStepTitle: { fontFamily: FONTS.headingExtraBold, fontSize: 22, color: COLORS.textPrimary, textAlign: 'center', marginTop: 18, marginBottom: 10 },
  walkStepBody: { fontFamily: FONTS.bodySemiBold, fontSize: 18, lineHeight: 27, color: COLORS.textSecondary, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { width: 24, backgroundColor: COLORS.deepBlue },
  walkFooterRow: { flexDirection: 'row', gap: 10 },
});

// --- FEATURE 8: COMMUNITY ---
const TOPIC_OPTIONS = [
  { id: 'DEMO-AREA-001', labelKey: 'area1Name', group: 'area' },
  { id: 'DEMO-AREA-002', labelKey: 'area2Name', group: 'area' },
  { id: 'DEMO-AREA-003', labelKey: 'area3Name', group: 'area' },
  { id: 'topicUsingSkyCalendar', labelKey: 'topicUsingSkyCalendar', group: 'feature' },
  { id: 'topicUsingDelta', labelKey: 'topicUsingDelta', group: 'feature' },
  { id: 'topicUsingDuet', labelKey: 'topicUsingDuet', group: 'feature' },
  { id: 'topicUsingSpotCheck', labelKey: 'topicUsingSpotCheck', group: 'feature' },
  { id: 'topicNewToRadar', labelKey: 'topicNewToRadar', group: 'new' },
];
const ROLE_CHOICES = ['roleOfficial', 'roleResearcher', 'roleLocalObserver', 'roleStudent'];
let sessionPosts = [...INITIAL_COMMUNITY_POSTS];
let sessionUser = null;

const CommunityHomeScreen = () => {
  const { navigate } = useNav();
  const { t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');
  const [signInOpen, setSignInOpen] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [chosenRole, setChosenRole] = useState('roleLocalObserver');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTopicId, setPostTopicId] = useState('DEMO-AREA-001');
  const [attachSnapshot, setAttachSnapshot] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);

  const handlePressAsk = () => {
    setRateLimitWarning(false);
    if (!sessionUser) setSignInOpen(true);
    else setNewPostOpen(true);
  };

  const handleCompleteSignIn = () => {
    if (!emailInput.trim()) return;
    sessionUser = { email: emailInput.trim(), roleKey: chosenRole };
    setSignInOpen(false);
    setNewPostOpen(true);
  };

  const handlePublishPost = () => {
    if (!postTitle.trim() || !postBody.trim() || !safetyChecked) return;
    if (!canCreatePostNow()) { setRateLimitWarning(true); return; }
    const topicObj = TOPIC_OPTIONS.find((tp) => tp.id === postTopicId) || TOPIC_OPTIONS[0];
    const created = {
      id: `POST-${Date.now()}`, topicId: topicObj.id, topicLabelKey: topicObj.labelKey,
      authorRoleKey: sessionUser ? sessionUser.roleKey : 'roleLocalObserver',
      isAuthorCurrentUser: true, dateIso: today(),
      enTitle: postTitle.trim(), bnTitle: postTitle.trim(), enBody: postBody.trim(), bnBody: postBody.trim(),
      isSampleByTeam: false, isLocalObservation: topicObj.group === 'area',
      hasSnapshot: attachSnapshot, snapshotDateIso: today(),
      snapshotSceneLabel: 'NASA GIBS · NISAR_L2_Geocoded_Polarimetric_Covariance', replies: [],
    };
    recordPostCreatedNow();
    sessionPosts = [created, ...sessionPosts];
    setPostTitle(''); setPostBody(''); setAttachSnapshot(false); setSafetyChecked(false); setNewPostOpen(false);
    navigate('CommunityPosts', { topicId: topicObj.id, topicLabelKey: topicObj.labelKey });
  };

  return (
    <Screen title={t('communityTitle')} subtitle={t('communitySubtitle')} footer={<BigButton label={t('askAQuestionBtn')} onPress={handlePressAsk} />}>
      <Expander label={t('communityRulesHeading')}>
        <AppText style={commStyles.ruleBullet}>• {t('rule1')}</AppText>
        <AppText style={commStyles.ruleBullet}>• {t('rule2')}</AppText>
        <AppText style={commStyles.ruleBullet}>• {t('rule3')}</AppText>
        <AppText style={commStyles.ruleBullet}>• {t('rule4')}</AppText>
        <AppText style={commStyles.ruleBullet}>• {t('rule5')}</AppText>
      </Expander>
      <View style={commStyles.warningOutlineBanner}>
        <Ionicons name="alert-circle-outline" size={20} color={COLORS.warningOrange} />
        <AppText style={commStyles.warningOutlineText}>{t('notOfficialWarningBanner')}</AppText>
      </View>
      <View style={commStyles.searchRow}>
        <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder={t('communitySearchPlaceholder')} placeholderTextColor={COLORS.textTertiary} style={commStyles.searchInput} onSubmitEditing={() => navigate('CommunityPosts', { searchQuery: searchQuery.trim() })} />
      </View>
      <AppText style={commStyles.groupHeading}>{t('topicGroupByArea')}</AppText>
      <View style={commStyles.chipsWrap}>
        {TOPIC_OPTIONS.filter((tp) => tp.group === 'area').map((tp) => (
          <Pressable key={tp.id} onPress={() => navigate('CommunityPosts', { topicId: tp.id, topicLabelKey: tp.labelKey })} style={commStyles.sandTopicChip}>
            <AppText style={commStyles.sandTopicChipText}>{t(tp.labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      <AppText style={commStyles.groupHeading}>{t('topicGroupByFeature')}</AppText>
      <View style={commStyles.chipsWrap}>
        {TOPIC_OPTIONS.filter((tp) => tp.group === 'feature').map((tp) => (
          <Pressable key={tp.id} onPress={() => navigate('CommunityPosts', { topicId: tp.id, topicLabelKey: tp.labelKey })} style={commStyles.sandTopicChip}>
            <AppText style={commStyles.sandTopicChipText}>{t(tp.labelKey)}</AppText>
          </Pressable>
        ))}
      </View>
      <AppText style={commStyles.groupHeading}>{t('topicGroupNewToRadar')}</AppText>
      <View style={commStyles.chipsWrap}>
        {TOPIC_OPTIONS.filter((tp) => tp.group === 'new').map((tp) => (
          <Pressable key={tp.id} onPress={() => navigate('CommunityPosts', { topicId: tp.id, topicLabelKey: tp.labelKey })} style={commStyles.sandTopicChip}>
            <AppText style={commStyles.sandTopicChipText}>{t(tp.labelKey)}</AppText>
          </Pressable>
        ))}
      </View>

      <BottomSheet visible={signInOpen} title={t('signInSheetTitle')} onClose={() => setSignInOpen(false)}>
        <TextInput value={emailInput} onChangeText={setEmailInput} placeholder={t('emailPlaceholder')} placeholderTextColor={COLORS.textTertiary} keyboardType="email-address" autoCapitalize="none" style={commStyles.sheetInput} />
        <AppText style={commStyles.sheetFieldLabel}>{t('pickRoleLabel')}</AppText>
        <View style={commStyles.chipsWrap}>
          {ROLE_CHOICES.map((rKey) => {
            const active = rKey === chosenRole;
            return (
              <Pressable key={rKey} onPress={() => setChosenRole(rKey)} style={[commStyles.roleOptionChip, active && commStyles.roleOptionChipActive]}>
                <AppText style={[commStyles.roleOptionText, active && { color: COLORS.white }]}>{t(rKey)} · {t('selfDescribedSuffix')}</AppText>
              </Pressable>
            );
          })}
        </View>
        <BigButton label={t('continueBtn')} disabled={!emailInput.trim()} onPress={handleCompleteSignIn} />
      </BottomSheet>

      <BottomSheet visible={newPostOpen} title={t('newPostSheetTitle')} onClose={() => setNewPostOpen(false)}>
        {rateLimitWarning && <View style={commStyles.rateLimitBanner}><AppText style={commStyles.rateLimitText}>{t('rateLimitCalmMsg')}</AppText></View>}
        <TextInput value={postTitle} onChangeText={setPostTitle} placeholder={t('postTitlePlaceholder')} placeholderTextColor={COLORS.textTertiary} style={commStyles.sheetInput} />
        <TextInput value={postBody} onChangeText={setPostBody} placeholder={t('postBodyPlaceholder')} placeholderTextColor={COLORS.textTertiary} multiline style={[commStyles.sheetInput, { minHeight: 74 }]} />
        <Pressable onPress={() => setAttachSnapshot((v) => !v)} style={commStyles.snapshotAttachBtn}>
          <Ionicons name={attachSnapshot ? 'checkmark-circle' : 'map-outline'} size={20} color={COLORS.deepBlue} />
          <AppText style={commStyles.snapshotAttachText}>{attachSnapshot ? t('snapshotAttachedLabel') : t('attachSnapshotBtn')}</AppText>
        </Pressable>
        <Pressable onPress={() => setSafetyChecked((v) => !v)} style={commStyles.checkboxRow}>
          <Ionicons name={safetyChecked ? 'checkbox' : 'square-outline'} size={24} color={COLORS.deepBlue} />
          <AppText style={commStyles.checkboxLabel}>{t('safetyCheckboxLabel')}</AppText>
        </Pressable>
        <BigButton label={t('publishPostBtn')} disabled={!postTitle.trim() || !postBody.trim() || !safetyChecked} onPress={handlePublishPost} />
      </BottomSheet>
    </Screen>
  );
};

const CommunityPostsScreen = () => {
  const { currentRoute, navigate } = useNav();
  const { lang, t } = useLang();
  const topicId = currentRoute.params && currentRoute.params.topicId;
  const topicLabelKey = currentRoute.params && currentRoute.params.topicLabelKey;
  const searchQuery = (currentRoute.params && currentRoute.params.searchQuery) || '';
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [reportedNotice, setReportedNotice] = useState(false);

  const visiblePosts = sessionPosts.filter((p) => {
    if (hiddenPostIds.includes(p.id)) return false;
    if (topicId) return p.topicId === topicId;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.enTitle.toLowerCase().includes(q) || p.bnTitle.toLowerCase().includes(q) || p.enBody.toLowerCase().includes(q) || p.bnBody.toLowerCase().includes(q);
    }
    return true;
  });
  const listToDisplay = visiblePosts.length > 0 ? visiblePosts : sessionPosts.filter((p) => !hiddenPostIds.includes(p.id));

  return (
    <Screen title={t('postsTitle')} subtitle={topicLabelKey ? t(topicLabelKey) : t('communitySubtitle')}>
      <View style={commStyles.warningOutlineBanner}>
        <Ionicons name="alert-circle-outline" size={20} color={COLORS.warningOrange} />
        <AppText style={commStyles.warningOutlineText}>{t('notOfficialWarningBanner')}</AppText>
      </View>
      {reportedNotice && <View style={commStyles.rateLimitBanner}><AppText style={commStyles.rateLimitText}>{t('reportCalmThanks')}</AppText></View>}
      {listToDisplay.map((post) => {
        const hasBest = post.replies.some((r) => r.isBestAnswer);
        return (
          <Card key={post.id} onPress={() => navigate('CommunityPostDetail', { postId: post.id })}>
            <View style={commStyles.rowBetween}>
              <View style={commStyles.roleBadge}><AppText style={commStyles.roleBadgeText}>{t(post.authorRoleKey)} · {t('selfDescribedSuffix')}</AppText></View>
              {hasBest && <View style={commStyles.bestTickPill}><Ionicons name="checkmark-circle" size={16} color={COLORS.calmGreenText} /><AppText style={commStyles.bestTickText}>{t('bestAnswerBadge')}</AppText></View>}
            </View>
            <AppText style={commStyles.postTitle}>{lang === 'bn' ? post.bnTitle : post.enTitle}</AppText>
            <AppText style={commStyles.postExcerpt} numberOfLines={2}>{lang === 'bn' ? post.bnBody : post.enBody}</AppText>
            <View style={commStyles.unverifiedTagBox}><AppText style={commStyles.unverifiedTagText}>{t('userReportedTag')}</AppText></View>
            {post.isLocalObservation && (
              <View style={commStyles.localIsolationBox}>
                <AppText style={commStyles.localIsolationTitle}>{t('localObsTag')}</AppText>
                <AppText style={commStyles.localIsolationText}>{t('localObsIsolationLine')}</AppText>
              </View>
            )}
            <View style={[commStyles.rowBetween, { marginTop: 10 }]}>
              <AppText style={commStyles.metaSmallText}>{formatDate(post.dateIso, lang, 'short')} · {t('repliesCountLabel', { count: formatNumber(post.replies.length, lang) })}</AppText>
              <Pressable onPress={() => { setHiddenPostIds((prev) => [...prev, post.id]); setReportedNotice(true); }}>
                <AppText style={commStyles.reportQuietText}>{t('reportBtn')}</AppText>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
};

const CommunityPostDetailScreen = () => {
  const { currentRoute, goBack } = useNav();
  const { lang, t } = useLang();
  const postId = (currentRoute.params && currentRoute.params.postId) || INITIAL_COMMUNITY_POSTS[0].id;
  const foundPost = sessionPosts.find((p) => p.id === postId) || sessionPosts[0];
  const [replies, setReplies] = useState(foundPost.replies);
  const [hiddenReplyIds, setHiddenReplyIds] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [reportedToast, setReportedToast] = useState(false);

  const handleAddReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    const newReply = { id: `REP-${Date.now()}`, authorRoleKey: sessionUser ? sessionUser.roleKey : 'roleLocalObserver', dateIso: today(), enText: trimmed, bnText: trimmed, isBestAnswer: false };
    const next = [...replies, newReply];
    foundPost.replies = next;
    setReplies(next);
    setReplyText('');
  };

  const handleMarkBest = (repId) => {
    const next = replies.map((r) => ({ ...r, isBestAnswer: r.id === repId }));
    foundPost.replies = next;
    setReplies(next);
  };

  return (
    <Screen title={t('postDetailTitle')} subtitle={t(foundPost.topicLabelKey)} footer={
      <View style={commStyles.replyInputRow}>
        <TextInput value={replyText} onChangeText={setReplyText} placeholder={t('replyPlaceholder')} placeholderTextColor={COLORS.textTertiary} style={commStyles.replyTextInput} />
        <Pressable onPress={handleAddReply} style={commStyles.replySendBtn}><AppText style={commStyles.replySendBtnText}>{t('replyBtn')}</AppText></Pressable>
      </View>
    }>
      {reportedToast && <View style={commStyles.rateLimitBanner}><AppText style={commStyles.rateLimitText}>{t('reportCalmThanks')}</AppText></View>}
      <Card>
        <View style={commStyles.rowBetween}>
          <View style={commStyles.roleBadge}><AppText style={commStyles.roleBadgeText}>{t(foundPost.authorRoleKey)} · {t('selfDescribedSuffix')}</AppText></View>
          <AppText style={commStyles.metaSmallText}>{formatDate(foundPost.dateIso, lang, 'full')}</AppText>
        </View>
        <AppText style={commStyles.postTitle}>{lang === 'bn' ? foundPost.bnTitle : foundPost.enTitle}</AppText>
        <AppText style={commStyles.postFullBody}>{lang === 'bn' ? foundPost.bnBody : foundPost.enBody}</AppText>
        {foundPost.hasSnapshot && (
          <View style={commStyles.snapshotCard}>
            <Ionicons name="map-outline" size={20} color={COLORS.deepBlue} />
            <AppText style={commStyles.snapshotCardText}>{foundPost.snapshotSceneLabel} · {formatDate(foundPost.snapshotDateIso || foundPost.dateIso, lang, 'short')}</AppText>
          </View>
        )}
        <View style={commStyles.unverifiedTagBox}><AppText style={commStyles.unverifiedTagText}>{t('userReportedTag')}</AppText></View>
        {foundPost.isLocalObservation && (
          <View style={commStyles.localIsolationBox}>
            <AppText style={commStyles.localIsolationTitle}>{t('localObsTag')}</AppText>
            <AppText style={commStyles.localIsolationText}>{t('localObsIsolationLine')}</AppText>
          </View>
        )}
        <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
          <Pressable onPress={() => { setReportedToast(true); setTimeout(() => goBack(), 600); }}>
            <AppText style={commStyles.reportQuietText}>{t('reportBtn')}</AppText>
          </Pressable>
        </View>
      </Card>
      {replies.filter((r) => !hiddenReplyIds.includes(r.id)).map((rep) => (
        <Card key={rep.id} style={rep.isBestAnswer ? { backgroundColor: COLORS.calmGreenBg, borderColor: COLORS.calmGreenText } : undefined}>
          <View style={commStyles.rowBetween}>
            <View style={commStyles.roleBadge}><AppText style={commStyles.roleBadgeText}>{t(rep.authorRoleKey)} · {t('selfDescribedSuffix')}</AppText></View>
            {rep.isBestAnswer && <View style={commStyles.bestTickPill}><Ionicons name="checkmark-circle" size={16} color={COLORS.calmGreenText} /><AppText style={commStyles.bestTickText}>{t('bestAnswerBadge')}</AppText></View>}
          </View>
          <AppText style={[commStyles.postFullBody, { marginTop: 8 }]}>{lang === 'bn' ? rep.bnText : rep.enText}</AppText>
          <View style={[commStyles.rowBetween, { marginTop: 10 }]}>
            {!rep.isBestAnswer ? (
              <Pressable onPress={() => handleMarkBest(rep.id)}><AppText style={commStyles.markBestText}>{t('markAsBestAnswerBtn')}</AppText></Pressable>
            ) : <View />}
            <Pressable onPress={() => { setHiddenReplyIds((prev) => [...prev, rep.id]); setReportedToast(true); }}>
              <AppText style={commStyles.reportQuietText}>{t('reportBtn')}</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
};

const commStyles = StyleSheet.create({
  ruleBullet: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 6 },
  warningOutlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.warningOrange, borderRadius: 16, padding: 12, marginBottom: 14 },
  warningOutlineText: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary },
  groupHeading: { fontFamily: FONTS.headingBold, fontSize: 17, color: COLORS.textPrimary, marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sandTopicChip: { backgroundColor: FEATURE_COLORS.community.circle, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill },
  sandTopicChipText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: FEATURE_COLORS.community.icon },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { backgroundColor: COLORS.tint1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  roleBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  bestTickPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.calmGreenBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  bestTickText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.calmGreenText },
  postTitle: { fontFamily: FONTS.headingBold, fontSize: 19, color: COLORS.textPrimary, marginTop: 10, marginBottom: 4 },
  postExcerpt: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 22, color: COLORS.textSecondary },
  postFullBody: { fontFamily: FONTS.bodySemiBold, fontSize: 16, lineHeight: 24, color: COLORS.textPrimary },
  unverifiedTagBox: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 10 },
  unverifiedTagText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  sampleTeamLine: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.deepBlue, marginTop: 6 },
  localIsolationBox: { backgroundColor: COLORS.bgLight, borderRadius: 12, padding: 10, marginTop: 8, borderWidth: 1, borderColor: COLORS.border },
  localIsolationTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.navyBlue },
  localIsolationText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  metaSmallText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  reportQuietText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.textSecondary },
  markBestText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.calmGreenText },
  sheetInput: { backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 12 },
  sheetFieldLabel: { fontFamily: FONTS.headingBold, fontSize: 15, color: COLORS.textPrimary, marginBottom: 8 },
  roleOptionChip: { backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill },
  roleOptionChipActive: { backgroundColor: COLORS.deepBlue, borderColor: COLORS.deepBlue },
  roleOptionText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary },
  snapshotAttachBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.tint1, padding: 12, borderRadius: 14, marginBottom: 12 },
  snapshotAttachText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.deepBlue },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkboxLabel: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.textPrimary },
  rateLimitBanner: { backgroundColor: COLORS.tint1, padding: 12, borderRadius: 14, marginBottom: 12 },
  rateLimitText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.navyBlue },
  snapshotCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.tint1, padding: 10, borderRadius: 12, marginTop: 10 },
  snapshotCardText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.deepBlue },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyTextInput: { flex: 1, minHeight: 50, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.textPrimary },
  replySendBtn: { minHeight: 50, paddingHorizontal: 18, borderRadius: 16, backgroundColor: COLORS.deepBlue, alignItems: 'center', justifyContent: 'center' },
  replySendBtnText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.white },
});

// ============================================================================
// APP ROOT
// ============================================================================
const ScreenRouter = () => {
  const { currentRoute } = useNav();
  switch (currentRoute.name) {
    case 'Splash': return <SplashScreen />;
    case 'Home': return <HomeScreen />;
    case 'MapPage': return <MapPageScreen />;
    case 'SkyWhere': return <SkyWhereScreen />;
    case 'SkyFound': return <SkyFoundScreen />;
    case 'SkyPair': return <SkyPairScreen />;
    case 'DeltaWhatChanged': return <DeltaWhatChangedScreen />;
    case 'DeltaNumbers': return <DeltaNumbersScreen />;
    case 'DeltaOverTime': return <DeltaOverTimeScreen />;
    case 'DuetTwoViews': return <DuetTwoViewsScreen />;
    case 'DuetDiffer': return <DuetDifferScreen />;
    case 'DuetChecked': return <DuetCheckedScreen />;
    case 'SpotTap': return <SpotTapScreen />;
    case 'SpotRadarSays': return <SpotRadarSaysScreen />;
    case 'SpotEvidence': return <SpotEvidenceScreen />;
    case 'TrustList': return <TrustListScreen />;
    case 'TrustDetails': return <TrustDetailsScreen />;
    case 'BriefBuild': return <BriefBuildScreen />;
    case 'BriefPreview': return <BriefPreviewScreen />;
    case 'AdvisorHello': return <AdvisorHelloScreen />;
    case 'AdvisorChat': return <AdvisorChatScreen />;
    case 'AdvisorWalkthrough': return <AdvisorWalkthroughScreen />;
    case 'CommunityHome': return <CommunityHomeScreen />;
    case 'CommunityPosts': return <CommunityPostsScreen />;
    case 'CommunityPostDetail': return <CommunityPostDetailScreen />;
    default: return <HomeScreen />;
  }
};

export default function App() {
  useFonts({
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgVeryLight} translucent={false} />
        <View style={appStyles.outerWorkspace}>
          <View style={appStyles.phoneFrame}>
            <NavigationProvider>
              <ScreenRouter />
            </NavigationProvider>
          </View>
        </View>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  outerWorkspace: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#DCE8F5' : COLORS.bgVeryLight, alignItems: 'center', justifyContent: 'center' },
  phoneFrame: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? FRAME.width : undefined, maxHeight: Platform.OS === 'web' ? FRAME.height : undefined, backgroundColor: COLORS.bgVeryLight, borderRadius: Platform.OS === 'web' ? 36 : 0, overflow: 'hidden', borderWidth: Platform.OS === 'web' ? 6 : 0, borderColor: '#0F172A' },
});
// === END OF PART B ===