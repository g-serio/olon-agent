# Spec: Frontend Control Room UI

## Objective
Ridisegnare l'esperienza iniziale del prodotto come una control room chiara e production-grade per due agenti OlonJS.

L'obiettivo e' far capire subito all'utente:
- cosa sta configurando
- quali provider e modelli usera'
- come sta guidando la direzione creativa del lavoro
- in quale stato si trova la pipeline

La UX deve supportare il modello di prodotto approvato:
- creativo di default
- `clone mode` e `reference mode` solo su comando esplicito
- multi-provider reale
- open source / self-hosted con env vars
- `shadcn/ui` come base implementativa per i tenant generati, non come estetica del prodotto

## Source Of Truth
- Direzione prodotto approvata in chat
- Codice frontend esistente:
  - `src/App.tsx`
  - `src/components/steps/BrandStep.tsx`
  - `src/components/LlmSetupPanel.tsx`
- Regole attive:
  - `frontend-ui-engineering`
  - `spec-driven-development`
  - `planning-and-task-breakdown`
  - `incremental-implementation`
  - `code-review-and-quality`

## Commands
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

## Project Structure
- `src/App.tsx` -> orchestration della shell principale
- `src/components/steps/BrandStep.tsx` -> step iniziale da ridisegnare
- `src/components/LlmSetupPanel.tsx` -> pannello provider/modelli attuale
- `src/app/globals.css` -> styling globale corrente
- `docs/specs/` -> specifiche approvate

## Problem Statement
Lo step iniziale attuale funziona ma comunica ancora come un form tecnico:
- design system upload
- provider setup

Non comunica bene invece:
- la natura a 2 agenti del prodotto
- la differenza tra configurazione tecnica e direzione creativa
- la gerarchia tra input progetto, routing LLM e istruzioni di layout
- il fatto che il default sia creativo/originale

## Users
- Sviluppatore o designer tecnico che vuole generare un tenant OlonJS
- Utente self-hosted che configura le API key via env vars
- Utente che vuole controllare provider/modelli e direzione del layout senza dover gestire chiavi dalla UI

## Success Criteria
- Lo step iniziale e' leggibile come una control room, non come un insieme di field casuali.
- Provider, chiavi e routing dei due agenti sono chiari e scansionabili.
- La direzione design viene resa esplicita:
  - originale di default
  - reference mode solo se richiesto
  - clone mode solo se richiesto
- L'utente capisce la gerarchia:
  - input progetto
  - setup AI
  - direzione design
- Il layout e' curato, accessibile e coerente su desktop e mobile.
- Il redesign non rompe il flusso esistente.

## UX Direction

### Core framing
Lo step iniziale deve sembrare una "control room creativa" con tre blocchi principali:

1. `Project Input`
2. `AI Setup`
3. `Design Direction`

L'utente deve poter leggere la pagina dall'alto verso il basso come una sequenza logica.

### 1. Project Input
Contiene:
- upload design system JSON
- upload SVG opzionali
- messaggio chiaro sul ruolo di questi asset

Requisiti UX:
- l'upload JSON e' l'azione primaria del blocco
- il preview dei token e' leggibile e contestualizzato
- gli SVG non devono competere visivamente con il design system

### 2. AI Setup
Contiene:
- stato provider disponibili
- selezione provider/modello per Agente 1
- selezione provider/modello per Agente 2

Requisiti UX:
- l'utente deve capire subito quali provider sono pronti
- la UI non deve chiedere di inserire chiavi manualmente
- la selezione per agente deve essere leggibile come routing decision
- devono emergere i due ruoli, non due form identici senza significato

### 3. Design Direction
Contiene:
- comportamento creativo di default
- spiegazione chiara delle modalita'
- spazio per reference future

Requisiti UX:
- default mode chiaramente mostrato come "Original layout"
- `Reference mode` e `Clone mode` non devono sembrare attivi di default
- copy esplicita:
  - senza reference forti -> layout originale
  - "tipo questo sito" -> sintesi di pattern/layout
  - "ricopia questo sito" -> replica controllata

Nota:
in questa milestone la UI puo' essere anche informativa/preparatoria se la feature reference non e' ancora tutta implementata.

## Information Architecture

### Page order
1. Hero/intro sintetica dello step
2. Project Input
3. AI Setup
4. Design Direction
5. CTA di avanzamento

### Hierarchy rules
- Il titolo di pagina deve raccontare il lavoro: configurare il motore e la direzione del tenant
- Ogni blocco deve avere:
  - titolo
  - descrizione
  - contenuto
- I blocchi devono avere peso visivo diverso ma coordinato

## Visual Direction

### Desired feel
- strumento serio e creativo
- editoriale/strumentale
- non "AI dashboard"
- non "developer panel grigio"

### Rules
- tipografia forte e leggibile
- superfici ben separate
- spacing intenzionale
- stati e badge sobri ma chiari
- niente rumore visivo gratuito
- niente gradienti gratuiti o AI slop

### Anti-patterns
- card tutte identiche senza gerarchia
- pill colorate ovunque
- copy debole o burocratica
- griglie tecniche senza respiro
- ogni pannello trattato allo stesso livello

## Accessibility
- Tutti i campi e i selector devono avere label esplicite
- Contrasto adeguato per testo e stati
- Focus state chiari
- Ordine di tab coerente con la gerarchia visiva
- Nessuna informazione importante affidata solo al colore

## State And Behavior

### Existing state to preserve
- `dsJson`
- `dsFileName`
- `svgAssets`
- `providerAvailability`
- `providerSetupLoaded`
- `agent1Config`
- `agent2Config`
- `llmReady`

### New presentation concepts
Da introdurre almeno a livello UI:
- summary della readiness globale
- summary del routing dei 2 agenti
- design mode summary con default creativo esplicito

### Forward-compatible states
La UI deve poter ospitare in futuro:
- reference URLs
- label esplicite per `Reference mode`
- label esplicite per `Clone mode`
- eventuali preset di routing/provider

## Boundaries

### Always
- mantenere il flusso funzionante
- migliorare gerarchia e leggibilita'
- mantenere l'internazionalizzazione di fatto attuale del copy UI in italiano
- preservare le logiche esistenti di provider availability

### Ask first
- cambiare la sequenza globale degli step della pipeline
- introdurre nuove dipendenze UI
- modificare in profondita' il contratto di stato della pipeline

### Never
- rendere clone/reference il default
- degradare accessibilita' o leggibilita'
- introdurre un'estetica generica da prodotto AI
- nascondere lo stato di disponibilita' dei provider

## Verification Strategy
- `npm run typecheck`
- verifica manuale del layout desktop
- verifica manuale del layout mobile
- verifica della leggibilita' degli stati provider/modello
- verifica che il pulsante di avanzamento conservi il gating attuale

## Acceptance Checklist
- [ ] Lo step iniziale ha tre blocchi chiari: Project Input, AI Setup, Design Direction
- [ ] La pagina comunica il modello a 2 agenti
- [ ] Il default creativo/originale e' esplicito
- [ ] Reference/clone risultano modalita' speciali e non default
- [ ] Provider e modelli sono leggibili senza rumore tecnico inutile
- [ ] Il layout appare production-grade e non generico
- [ ] Il flusso continua a funzionare senza regressioni
