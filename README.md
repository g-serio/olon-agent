# OlonAgent — Site DNA Generator

Pipeline a **3 agenti AI** per generare tenant **OlonJS v1.5** compliant.

## Architettura

```
Step 0  Brand       → Carica DS JSON Schema + SVG assets
Step 1  Contenuto   → Descrivi il dominio/brand
Step 2  Design      → Agent 1 genera HTML/Tailwind creativo (streaming)
Step 3  Review      → Iframe preview + chat per modifiche con Agent 1
Step 4  Conversione → Agent 2 trasforma HTML in script OlonJS v1.5 (streaming)
Step 5  Build       → Agent 3 esegue script in E2B sandbox + fix loop TypeScript
Step 6  Pronto      → Script fixato scaricabile + SaaS provisioning opzionale
```

## Stack

- **Next.js 14** (App Router) + **TypeScript** strict
- **Claude claude-sonnet-4-6** — tutti e tre gli agenti
- **E2B** — sandbox isolato per esecuzione script e fix TypeScript

## Setup

```bash
# 1. Dipendenze
npm install

# 2. Variabili d'ambiente
cp .env.example .env.local
# → ANTHROPIC_API_KEY=sk-ant-...
# → E2B_API_KEY=e2b_...
# → E2B_TEMPLATE_ID=olon-base  (vedi sotto)

# 3. Build template E2B (una tantum)
npm install -g e2b
e2b template build --dockerfile e2b.Dockerfile --name olon-base
# → copia il template ID in E2B_TEMPLATE_ID

# 4. Avvia
npm run dev  # → http://localhost:3000
```

## Build template E2B

Il `e2b.Dockerfile` crea un template con:
- Node.js 20
- Progetto base OlonJS (`/home/user/project`) con `node_modules` pre-installati
- `@olonjs/core`, React 19, Zod, Tailwind v4, TypeScript

Questo rende Agent 3 molto più veloce — `npm install` non parte da zero.

```bash
# Installa CLI E2B
npm install -g e2b

# Build (richiede E2B_API_KEY in env)
e2b template build --dockerfile e2b.Dockerfile --name olon-base

# Output: Template ID — incollalo in E2B_TEMPLATE_ID
```

Se `E2B_TEMPLATE_ID` non è configurato, Agent 3 usa il template base `base` 
che ha Node.js ma non ha `@olonjs/core` pre-installato (lo script lo installerà 
al primo run — più lento).

## Agenti

| Agente | Ruolo | Tokens | Prompt |
|--------|-------|--------|--------|
| Agent 1 | HTML/Tailwind creativo — usa DS, SVG, brand | 16k | `prompts/agent1.ts` |
| Agent 2 | Converte HTML → script OlonJS v1.5 | 64k | `prompts/agent2.ts` (system prompt v1.5) |
| Agent 3 | E2B sandbox: esegue script + fix TypeScript loop | — | `prompts/agent3.ts` |

## Struttura repo

```
src/
├── app/
│   ├── api/claude/route.ts      # Proxy Anthropic API
│   ├── api/sandbox/route.ts     # E2B sandbox + tsc fix loop (SSE)
│   ├── layout.tsx / page.tsx / globals.css
├── App.tsx
├── types.ts
├── api/claude.ts                # Client SSE streaming
├── prompts/agent1.ts | agent2.ts | agent3.ts
├── hooks/usePipeline.ts         # Stato globale + logica pipeline
└── components/
    ├── steps/
    │   ├── BrandStep.tsx
    │   ├── ContentStep.tsx
    │   ├── GeneratingStep.tsx   # Riusato per step 2, 4, 5
    │   ├── HtmlReviewStep.tsx   # Iframe + chat Agent 1
    │   └── DoneStep.tsx
    ├── StepBar.tsx | Terminal.tsx | CodeViewer.tsx | TokenPreview.tsx
e2b.Dockerfile                   # Template custom E2B
```
