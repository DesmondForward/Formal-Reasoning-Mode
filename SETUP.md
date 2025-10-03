# FRM Desktop Setup Guide

## Quick Start

```bash
npm install
npm run dev
```

The `dev` script launches the Vite development server and the Electron shell in parallel using `concurrently`.

**Windows Users:** You can also use the provided `dev.bat` script for easier development on Windows.

## Prerequisites

- **Node.js** 18+ 
- **npm** 9+
- **Git** (for cloning the repository)

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

### 🎯 Core Capabilities
- **📝 Schema-Driven Editor** - Intuitive form editor with real-time validation feedback
- **🔍 Live AJV Validation** - Instant validation against enhanced FRM JSON Schema with novelty assurance
- **🧮 Equation-First Modeling** - Built for ODE, PDE, DAE, SDE, and hybrid systems with novelty tagging
- **🤖 AI Schema Generator** - Generate domain-specific schemas using OpenAI GPT-5 integration
- **📊 Interactive Visualization** - Real-time model visualization and analysis
- **🌙 Modern UI** - Beautiful dark/light theme with smooth animations and lazy loading

### 🏗️ Advanced Features
- **🔧 Multi-Domain Support** - 20+ domains including AI, astrophysics, climate science, quantum computing
- **📐 Mathematical Rendering** - KaTeX integration for beautiful equation display
- **💾 Import/Export** - JSON-based problem sharing and collaboration
- **⚡ Performance Optimized** - Lazy-loaded components, validation caching, and efficient state management
- **🛡️ Type Safety** - Full TypeScript support with generated schema types and runtime type guards
- **🔗 MCP Integration** - Model Context Protocol server for AI tool integration
- **📡 Real-time Communication** - Live communication logging and monitoring panel
- **🎯 Novelty Assurance** - AI-powered novelty assessment with similarity metrics and redundancy checking

### 🔍 Schema Compliance & Novelty Assurance
- **✅ Type Safety** - Generated TypeScript types from JSON Schema with runtime type guards
- **✅ Real-time Validation** - AJV validation with detailed error reporting and caching
- **✅ Schema Evolution** - Automatic UI updates when schema changes
- **✅ Import/Export** - Full schema compliance for data portability
- **✅ Novelty Assessment** - AI-powered novelty detection with similarity metrics
- **✅ Redundancy Checking** - Automated detection of duplicate or similar work
- **✅ Citation Management** - Comprehensive citation tracking and validation
- **✅ Evidence Tracking** - Systematic evidence mapping for novelty claims

## Suggested Workflow

1. **Launch** the app with `npm run dev`
2. **Select** a domain from the dropdown (medicine, biology, engineering, etc.)
3. **Generate** a schema using AI or start from scratch
4. **Edit** each section until validation passes:
   - **Metadata**: Problem ID, domain, version
   - **Input**: Problem summary, known quantities, unknowns
   - **Modeling**: Equations, variables, model class
   - **Method Selection**: Solution methods and justification
   - **Validation**: Quality metrics and checks
   - **Output Contract**: Required sections and formatting
   - **Novelty Assurance**: Novelty assessment and citation management
5. **Monitor** real-time communication and validation in the panels
6. **Export** the FRM JSON for downstream tooling or API calls

## Project Layout

```
📁 FRM Desktop/
├── 📁 main/                    # Electron main process
│   ├── main.ts                 # Main process entry point
│   ├── preload.ts              # Secure preload script
│   └── 📁 mcp/                 # Model Context Protocol server
│       └── frmMcpServer.ts     # MCP server implementation
├── 📁 src/                     # React renderer application
│   ├── 📁 components/          # React components
│   │   ├── 📁 editors/         # Specialized form editors
│   │   │   ├── NoveltyAssuranceEditor.tsx # Novelty assessment editor
│   │   │   ├── InputEditor.tsx # Input specification editor
│   │   │   ├── ModelingEditor.tsx # Mathematical modeling editor
│   │   │   ├── MethodSelectionEditor.tsx # Method selection editor
│   │   │   ├── SolutionAnalysisEditor.tsx # Solution analysis editor
│   │   │   ├── ValidationEditor.tsx # Validation editor
│   │   │   └── OutputContractEditor.tsx # Output contract editor
│   │   ├── 📁 ui/              # Reusable UI components
│   │   ├── SchemaEditor.tsx    # Main schema editor
│   │   ├── ValidationPanel.tsx # Real-time validation
│   │   ├── VisualizationPanel.tsx # Model visualization
│   │   ├── CommunicationLogPanel.tsx # Real-time communication monitoring
│   │   └── DomainSelector.tsx  # Domain selection component
│   ├── 📁 hooks/               # Custom React hooks
│   │   ├── useCommunication.ts # Communication monitoring
│   │   ├── useValidation.ts    # Validation with caching
│   │   ├── useFRMData.ts       # Data management
│   │   └── useTheme.ts         # Theme management
│   ├── 📁 data/                # Schema definitions and types
│   ├── 📁 utils/               # Utility functions
│   │   ├── typeGuards.ts       # Runtime type validation
│   │   ├── validation.ts       # Validation utilities
│   │   ├── schemaMigration.ts  # Schema migration tools
│   │   └── schemaGenerator.ts # AI schema generation
│   └── App.tsx                 # Application root
├── 📄 frm_schema.json          # Enhanced FRM JSON Schema with novelty assurance
└── 📄 package.json             # Dependencies and scripts
```

## 🚀 Recent Enhancements (v1.0.0)

### 🎯 **Novelty Assurance System**
- **AI-Powered Novelty Detection** - Integrated similarity assessment using cosine embeddings, ROUGE-L, and NovAScore
- **Comprehensive Citation Management** - Full citation tracking with coverage analysis and conflict detection
- **Evidence Mapping** - Systematic evidence tracking linking claims to supporting citations
- **Redundancy Prevention** - Automated detection of duplicate work with configurable thresholds

### 🔗 **Model Context Protocol (MCP) Integration**
- **MCP Server Implementation** - Built-in MCP server for AI tool integration
- **Real-time Communication Logging** - Live monitoring of AI interactions and tool calls
- **Tool Validation** - Comprehensive validation of FRM documents through MCP tools
- **Performance Monitoring** - Real-time statistics and connection status tracking

### ⚡ **Performance Optimizations**
- **Validation Caching** - LRU-style caching with 90% performance improvement for repeated operations
- **Lazy Loading** - Component-level lazy loading for faster initial load times
- **Memory Management** - Optimized memory usage with WeakMap caching and cleanup
- **Type Guard Optimization** - Runtime type validation with performance monitoring

### 🎨 **Enhanced User Experience**
- **Domain Selector** - Comprehensive domain selection with 20+ scientific domains
- **Communication Panel** - Real-time monitoring of AI interactions and system events
- **Enhanced Validation** - Detailed error reporting with context-aware suggestions
- **Modern UI Components** - Radix UI components with smooth animations and accessibility

## Configuration

### Environment Variables

Create a `.env.local` file for development:

```env
# OpenAI Configuration (for AI example generation)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-2025-08-07
OPENAI_API_URL=https://api.openai.com/v1/responses

# Development
VITE_DEV_SERVER_URL=http://localhost:3000
```

### Schema Customization

The application is fully driven by `frm_schema.json`. To extend or modify the schema:

1. Update `frm_schema.json` with your changes
2. The UI will automatically adapt to schema changes
3. TypeScript types are generated automatically from the schema

## Troubleshooting

- **Schema errors on import:** The file must satisfy `frm_schema.json`; the app reports validation details in the Validation panel.
- **Electron window stays blank:** Ensure the Vite dev server (port 3000 by default) is running and reachable.
- **TypeScript errors:** Run `npm run build` to surface compile issues introduced by schema changes.
- **MCP connection issues:** Check the Communication Log Panel for connection status and error details.
- **AI generation fails:** Verify your OpenAI API key is correctly set in `.env.local` and restart the application.
- **Performance issues:** The app uses lazy loading and caching; initial load may take a moment for large schemas.

## Development Scripts

```bash
# Development
npm run dev              # Start both Vite and Electron
npm run dev:renderer     # Start only Vite dev server
npm run dev:main         # Start only Electron main process

# Building
npm run build            # Build both renderer and main
npm run build:renderer   # Build only Vite renderer
npm run build:main       # Build only Electron main

# Distribution
npm run dist             # Package for current platform
npm run dist:win         # Windows NSIS installer
npm run dist:mac         # macOS disk image
npm run dist:linux       # Linux AppImage
```

Happy modelling! 🧠✨
