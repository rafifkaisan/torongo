# AI use disclosure

## Within the application

The current in-app “Explain Layer” (legacy screen route name: Advisor) is a deterministic, keyword-matched explainer over a small, static, team-authored reference library. It does not call a generative AI API, train a model, classify radar pixels, calculate statistics, or generate measurements. It includes a rule-based refusal for questions asking for forecasts or emergency/safety advice. It should be described as a rule-based explainer, not as a live generative AI assistant.

## Development and documentation assistance

The supplied materials include a Claude conversation and the current ChatGPT-assisted review of the source code, project description, and submission materials. Disclose all tools the team actually used during the hackathon and preparation; the following scopes match the materials available here:

- **Anthropic Claude:** used for product planning, feature consolidation, architecture discussion, script/document drafting, and review of team-provided project notes. It was not used to calculate radar measurements.
- **OpenAI ChatGPT:** used to inspect the supplied application source and project documents, improve repository documentation and submission wording, and identify implementation/claim mismatches. It was not used to calculate radar measurements.
- **Google AI Studio / Gemini:** the Claude conversation contains a prompt prepared for Google AI Studio to rebuild the Expo application from team-provided research PDFs and feature notes, including requests to connect NASA APIs. This establishes that AI Studio was part of the planned workflow, but does not by itself prove whether the prompt was run, which Gemini model was used, what files/data were submitted, or whether the generated code was incorporated into this app. Confirm those details with the team. If AI Studio was used, disclose the exact role, prompt inputs, model if known, and outputs. Do not state that it processed satellite pixels unless it actually did.

## Data provided to AI tools

The materials visible in this handover are application source code, design/product notes, text descriptions, and PDF documents. There is no evidence in the supplied files that raw NISAR or Sentinel-1 raster data were provided to a generative AI model or used by it for scientific calculations. The Claude notes also discuss a fictional “Rafiq Hasan” example-persona image and a generation prompt, but no corresponding image file was included in the supplied project archive. If such an image is actually used in the video or project, identify it as an AI-generated fictional persona and disclose the image-generation tool/model. Confirm this reflects the team's full workflow before submitting.

## Suggested concise form text (verify tools used)

“ChatGPT (OpenAI) and Claude (Anthropic) assisted with project planning, feature/architecture review, source/documentation review, and presentation wording using team-provided code and project notes. A prompt for Google AI Studio was prepared to build/refine the app from supplied research PDFs and feature notes; confirm whether it was run, which model was used, and what outputs were incorporated, then disclose that role accurately. The in-app Explain Layer is a deterministic, keyword-based explainer using static reference text, not a generative model. No AI model calculates radar measurements, flood area, or validation statistics.”
