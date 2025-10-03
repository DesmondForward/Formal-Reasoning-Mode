# FRM Desktop Setup Guide

## Quick Start

```bash
npm install
npm run dev
```

The `dev` script launches the Vite development server and the Electron shell in parallel.

## AI Example Generation

- Create `.env.local` in the project root with `OPENAI_API_KEY=your-key` and optionally `OPENAI_MODEL=gpt-5-2025-08-07`; `.env` is used as a secondary fallback.
- The Electron main process loads `.env.local` first and never overrides environment variables that are already set, so you can keep secrets out of version control.
- Restart `npm run dev` (or rebuild) after editing the environment so the refreshed key is available to the Generate Schema handler.
- When the AI request fails, the UI falls back to the bundled SEIR example and surfaces the error details from the main process.

## Build Targets

```bash
npm run build        # Renderer (Vite) + main (tsc)
npm run dist         # Package for current platform
npm run dist:win     # Windows NSIS installer
npm run dist:mac     # macOS disk image
npm run dist:linux   # Linux AppImage
```

## What You Get

### Schema Driven
- Full coverage of the FRM JSON Schema
- Strong TypeScript types via `json-schema-to-ts`
- Real-time validation with AJV + draft 2020-12

### Mathematical Tooling
- Dedicated editors for metadata, inputs, modelling, methods, validation, and output contract
- Support for ODE/SEIR-style models with equation lists and initial conditions
- Sensitivity analysis and uncertainty propagation controls

### Desktop Experience
- Electron main process with secure preload bridge (no Node.js in the renderer)
- Tailwind CSS theming with dark/light toggle
- Framer Motion transitions for a modern feel

## Suggested Workflow

1. Launch the app with `npm run dev`
2. Use "Generate Schema" to load the SEIR exemplar
3. Edit each section until validation passes
4. Export the FRM JSON for downstream tooling or API calls

## Project Layout

```
main/           Electron main & preload code
src/            React renderer code
  data/         Schema bindings and defaults
  components/   Editors, panels, reusable UI pieces
  hooks/        State, validation, theme management
frm_schema.json Formal Reasoning Mode schema specification
```

## Troubleshooting

- **Schema errors on import:** The file must satisfy `frm_schema.json`; the app reports validation details in the Validation panel.
- **Electron window stays blank:** Ensure the Vite dev server (port 3000 by default) is running and reachable.
- **TypeScript errors:** Run `npm run build` to surface compile issues introduced by schema changes.

Happy modelling!
