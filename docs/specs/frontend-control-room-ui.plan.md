# Implementation Plan: Frontend Control Room UI

## Overview
Implementare il redesign dello step iniziale del prodotto come control room creativa e tecnica per due agenti, mantenendo il flusso attuale funzionante e introducendo una gerarchia UX chiara tra input progetto, setup LLM e direzione design.

Spec di riferimento:
- [frontend-control-room-ui.md](/C:/Users/gseri/Desktop/GEMINI/AISTUDIO/Dev/JPS/olon-agent/docs/specs/frontend-control-room-ui.md)

## Architecture Decisions
- Il redesign parte dallo step iniziale esistente, senza cambiare la sequenza globale della pipeline.
- La logica di stato resta dentro `usePipeline`; il primo intervento e' di presentazione e composizione UI.
- `BrandStep` diventa il contenitore della nuova control room.
- `LlmSetupPanel` viene ristrutturato come sottosistema leggibile, non come semplice gruppo di field.
- La `Design Direction` entra prima come blocco UI/spec-ready, anche se alcune capacita' future non sono ancora eseguibili.

## Task List

### Phase 1: Layout Foundation

## Task 1: Ridisegnare la struttura di `BrandStep`

**Description:** Trasformare lo step iniziale da card singola lineare a pagina con sezioni leggibili e gerarchia esplicita.

**Acceptance criteria:**
- [ ] `BrandStep` presenta una introduzione chiara dello step
- [ ] Le aree `Project Input`, `AI Setup` e `Design Direction` sono visivamente distinte
- [ ] Il CTA finale resta coerente con il gating esistente

**Verification:**
- [ ] Typecheck verde: `npm run typecheck`
- [ ] Verifica manuale del render dello step

**Dependencies:** None

**Files likely touched:**
- `src/components/steps/BrandStep.tsx`
- `src/app/globals.css`

**Estimated scope:** Medium

## Task 2: Ristrutturare `LlmSetupPanel` come control panel

**Description:** Migliorare la leggibilita' di provider e routing agenti, facendo emergere readiness e ruolo dei due agenti e rimuovendo la gestione chiavi dalla UI.

**Acceptance criteria:**
- [ ] Provider availability leggibile a colpo d'occhio
- [ ] Nessun campo di override chiavi nel frontend
- [ ] Il pannello comunica chiaramente che il sistema legge solo env vars
- [ ] Routing di Agente 1 e Agente 2 leggibile come decisione intenzionale

**Verification:**
- [ ] Typecheck verde: `npm run typecheck`
- [ ] Verifica manuale di stati provider pronti / non pronti

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/LlmSetupPanel.tsx`
- `src/app/globals.css`

**Estimated scope:** Medium

### Checkpoint: Foundation
- [ ] `npm run typecheck`
- [ ] Nessuna regressione nel gating di avanzamento
- [ ] La pagina non sembra piu' un insieme di field tecnici

### Phase 2: Design Direction Surface

## Task 3: Aggiungere il blocco `Design Direction`

**Description:** Inserire nella UI il contratto prodotto approvato su creativita' di default, reference mode e clone mode.

**Acceptance criteria:**
- [ ] Il default creativo/originale e' esplicito
- [ ] Reference e clone appaiono come modalita' speciali
- [ ] La copy spiega chiaramente cosa succede in ciascun caso

**Verification:**
- [ ] Typecheck verde: `npm run typecheck`
- [ ] Verifica manuale della leggibilita' del blocco

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/steps/BrandStep.tsx`
- `src/app/globals.css`

**Estimated scope:** Small

## Task 4: Migliorare il `Project Input`

**Description:** Rendere upload design system, preview token e asset SVG piu' coerenti con il nuovo layout e con la gerarchia della control room.

**Acceptance criteria:**
- [ ] Upload JSON percepito come azione primaria del blocco
- [ ] Preview token meglio contestualizzata
- [ ] Asset SVG secondari ma chiari

**Verification:**
- [ ] Typecheck verde: `npm run typecheck`
- [ ] Verifica manuale dei casi con e senza file caricati

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/steps/BrandStep.tsx`
- `src/components/TokenPreview.tsx`
- `src/app/globals.css`

**Estimated scope:** Medium

### Checkpoint: UX Contract
- [ ] `npm run typecheck`
- [ ] La pagina comunica creativita' di default
- [ ] L'utente capisce i tre blocchi senza leggere tutto

### Phase 3: Polish And Cohesion

## Task 5: Rifinire gli stati e i sommari

**Description:** Aggiungere piccoli summary UI per readiness complessiva, routing agenti e stato operativo del setup.

**Acceptance criteria:**
- [ ] Stato globale comprensibile senza dover leggere tutti i campi
- [ ] Readiness LLM visibile e non solo implicita nel pulsante
- [ ] Nessun rumore visivo superfluo

**Verification:**
- [ ] Typecheck verde: `npm run typecheck`
- [ ] Verifica manuale su combinazioni di provider pronti / mancanti

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/components/steps/BrandStep.tsx`
- `src/components/LlmSetupPanel.tsx`
- `src/app/globals.css`

**Estimated scope:** Small

## Task 6: Review qualitativa finale del redesign

**Description:** Eseguire una review multi-asse del redesign prima di considerarlo chiuso.

**Acceptance criteria:**
- [ ] Correttezza funzionale preservata
- [ ] Accessibilita' di base verificata
- [ ] Gerarchia visiva coerente con la spec
- [ ] Nessun ritorno a pattern da AI dashboard generica

**Verification:**
- [ ] `npm run typecheck`
- [ ] `npm run build` se l'ambiente lo consente
- [ ] Review manuale desktop/mobile

**Dependencies:** Task 1, Task 2, Task 3, Task 4, Task 5

**Files likely touched:**
- Nessun file funzionale obbligatorio; eventuali rifiniture mirate

**Estimated scope:** Small

### Checkpoint: Complete
- [ ] Tutti i task completati
- [ ] `npm run typecheck` verde
- [ ] Review qualitativa fatta
- [ ] Frontend pronto per la successiva iterazione su reference inputs reali

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Il redesign resta solo cosmetico | Medium | Far emergere information architecture, non solo styling |
| LLM setup continua a sembrare tecnico e freddo | Medium | Introdurre summary, ruoli agente e copy contestuale |
| Il blocco Design Direction promette piu' di quanto oggi esista | Medium | Trattarlo come surface spec-ready, senza fingere feature gia' complete |
| Regressioni di gating sul bottone continua | High | Non toccare la logica di `llmReady`, verificare dopo ogni slice |

## Open Questions
- Quando implementeremo davvero input strutturati per reference URLs e clone/reference mode?
- Vogliamo introdurre preset provider/modelli nella stessa iterazione o in una successiva?
