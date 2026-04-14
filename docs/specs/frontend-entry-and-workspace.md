# Spec: Frontend Entry And Workspace

## Objective
Separare l'esperienza iniziale in due superfici chiare:

1. una landing pubblica che spiega il prodotto e porta dentro
2. un workspace operativo dove si configurano theme, asset e modelli

L'obiettivo e' eliminare l'ibrido attuale, che oggi non funziona ne' come landing ne' come tool.

## Source Of Truth
- Direzione approvata in chat:
  - prima landing, poi setup
  - il setup non deve sembrare una landing
  - il workspace deve stare nel fold il piu' possibile
  - provider availability resa come strip sottile con LED e label
  - selezione modelli come un solo select per fase
- Codice vivo:
  - `src/App.tsx`
  - `src/components/steps/BrandStep.tsx`
  - `src/components/LlmSetupPanel.tsx`
  - `src/app/globals.css`
- Regole attive:
  - `spec-driven-development`
  - `planning-and-task-breakdown`
  - `incremental-implementation`
  - `frontend-ui-engineering`
  - `code-review-and-quality`

## Commands
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Build: `npm run build`

## Problem Statement
La schermata iniziale e' stata spinta verso una "control room editoriale", ma il prodotto ha bisogno di due momenti diversi:
- un momento pubblico/editoriale
- un momento operativo/strumentale

Se proviamo a far fare entrambe le cose alla stessa vista:
- la landing non racconta bene il valore
- il setup e' troppo rumoroso
- il workspace perde compattezza
- alcune superfici sembrano selezionabili quando non lo sono

## Users
- chi atterra sul progetto e deve capire rapidamente cosa fa
- chi vuole iniziare un tenant OlonJS
- chi deve configurare theme/schema, SVG e modelli senza rumore narrativo

## Desired Flow

### Surface 1: Landing
Deve fare solo queste cose:
- spiegare cosa fa il prodotto
- mostrare il flusso in modo sintetico
- far capire che e' open source e multi-provider
- offrire una CTA chiara per iniziare

### Surface 2: Workspace
Deve fare solo queste cose:
- caricare design system e asset
- mostrare la disponibilita' provider
- scegliere i modelli per fase
- ricordare in modo non intrusivo le regole di comportamento del sistema

## UX Rules

### Landing
- chiara
- luminosa
- editoriale ma non vuota
- CTA primaria evidente
- niente form tecnici nella hero

### Workspace
- compatto
- orientato al task
- niente elementi che sembrino selezionabili se non lo sono
- niente storytelling da landing
- focus su input reali

## Workspace Information Architecture

### Top
- titolo breve
- una riga di contesto
- stato sintetico del setup

### Main area
- `Theme e asset`
  - upload JSON
  - preview token
  - upload SVG

### Side area
- `Modelli`
  - strip provider availability
  - select `Modello creativo`
  - select `Modello build`
- `Regole attive`
  - default originale
  - reference solo se esplicita
  - clone solo se esplicito

Le `Regole attive` non sono un controllo selezionabile.
Sono una legenda operativa.

## Visual Direction

### Landing
- composizione ampia
- ritmo editoriale
- tipografia forte
- superfici leggere

### Workspace
- tool chiaro
- griglia stabile
- card sobrie
- contrasto pulito
- nessuna estetica dark residua

## Boundaries

### Always
- mantenere il flusso pipeline esistente da `Contenuto` in poi
- tenere nascosta la stepbar nello step di setup iniziale
- preservare il gating esistente su provider e avanzamento

### Ask first
- cambiare il numero o il significato degli step successivi
- introdurre nuove dipendenze frontend

### Never
- riunire di nuovo landing e workspace in un'unica vista ibrida
- usare card "attive" per contenuti puramente informativi
- tornare a una UI dark come default

## Success Criteria
- all'avvio si vede una landing vera, non il workspace
- la CTA apre il workspace senza rompere la pipeline
- il workspace non sembra una landing
- `BrandStep` smette di usare elementi informativi come se fossero selezionabili
- la strip provider e' sottile, leggibile e stabile
- i modelli sono selezionati con un solo select per fase
- `npm run typecheck` passa
