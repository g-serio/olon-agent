# OlonAgent

Generatore open source di tenant OlonJS v1.5 con pipeline a 2 agenti, sandbox E2B e supporto multi-provider per Anthropic, OpenAI e Gemini.

## Quick Start
1. Installa le dipendenze: `npm install`
2. Copia l'ambiente: `cp .env.example .env.local`
3. Configura almeno:
   - `E2B_API_KEY`
   - una tra `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
4. Avvia il progetto: `npm run dev`
5. Apri [http://localhost:3000](http://localhost:3000)

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Avvia Next.js in sviluppo |
| `npm run build` | Build di produzione |
| `npm run start` | Avvia il build di produzione |
| `npm run typecheck` | Controllo TypeScript senza emit |

## Product Model
OlonAgent esegue un solo lavoro end-to-end: trasformare brand input + contenuti in un tenant OlonJS ricostruibile e verificato.

La pipeline attuale ha 2 agenti:
- Agente 1: genera `src_tenant.sh` tramite provider/modello selezionato
- Agente 2: esegue lo script in E2B, prova la build e corregge gli errori TypeScript con provider/modello selezionato

L'utente puo:
- configurare le chiavi via `.env.local`
- scegliere provider e modello separatamente per i due agenti

## Supported Providers
- Anthropic
- OpenAI
- Gemini

Il supporto non e generico per provider arbitrari: questi 3 provider sono implementati come adapter first-class.

## Architecture
Percorsi principali:
- [src/app/api/llm/route.ts](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/app/api/llm/route.ts): endpoint generico per streaming e discovery provider
- [src/lib/llm/index.ts](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/lib/llm/index.ts): registry e dispatch provider
- [src/app/api/sandbox/route.ts](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/app/api/sandbox/route.ts): sandbox E2B + fix loop TypeScript
- [src/hooks/usePipeline.ts](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/hooks/usePipeline.ts): stato globale e orchestrazione pipeline
- [src/components/LlmSetupPanel.tsx](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/src/components/LlmSetupPanel.tsx): configurazione provider e modelli

Documentazione estesa:
- [docs/specs/multi-provider-open-source.md](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/docs/specs/multi-provider-open-source.md)
- [docs/decisions/ADR-001-multi-provider-llm-architecture.md](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/docs/decisions/ADR-001-multi-provider-llm-architecture.md)

## Environment
Chiavi supportate:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `E2B_API_KEY`
- `E2B_TEMPLATE_ID` opzionale

Se `E2B_TEMPLATE_ID` non e configurato, viene usato il template base di E2B.

## Build Template E2B
Il file [e2b.Dockerfile](/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/e2b.Dockerfile) prepara un template con dipendenze OlonJS preinstallate per ridurre il tempo del loop di build.

Esempio:

```bash
npm install -g e2b
e2b template build --dockerfile e2b.Dockerfile --name olon-base
```

## Contributing
- Il codice vivo e la source of truth principale
- Le decisioni architetturali importanti vengono fissate in `docs/decisions/`
- Le specifiche di prodotto e comportamento vengono mantenute in `docs/specs/`
- Per cambiamenti che toccano provider, pipeline o UX pubblica, aggiorna README + spec + ADR se serve
