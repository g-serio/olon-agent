# Implementation Plan: Frontend Entry And Workspace

## Overview
Refactor incrementale dell'entry UI in due superfici:
- landing pubblica
- workspace operativo

Questa slice non tocca la pipeline dopo il setup iniziale.

## Task List

### Task 1: Formalizzare la nuova spec entry -> workspace
- Acceptance:
  - [ ] esiste una spec breve con source of truth, boundaries e success criteria
  - [ ] il piano dichiara che la slice non tocca la pipeline successiva
- Verify:
  - [ ] file spec salvati in `docs/specs/`

### Task 2: Introdurre una landing iniziale
- Acceptance:
  - [ ] all'apertura l'utente vede una landing vera
  - [ ] la landing ha CTA primaria `Inizia un tenant`
  - [ ] la landing comunica open source, multi-provider e flusso a 2 agenti
- Verify:
  - [ ] `npm run typecheck`

### Task 3: Separare il workspace operativo dal tono della landing
- Acceptance:
  - [ ] `BrandStep` diventa uno spazio di setup operativo
  - [ ] niente hero da landing nel workspace
  - [ ] niente card informative che sembrano selezionabili
- Verify:
  - [ ] `npm run typecheck`

### Task 4: Tenere il setup nel fold il piu' possibile
- Acceptance:
  - [ ] provider availability resa come strip sottile
  - [ ] un solo select per fase
  - [ ] layout piu' compatto del precedente
- Verify:
  - [ ] `npm run typecheck`

### Task 5: Review finale della slice
- Acceptance:
  - [ ] nessuna regressione nella pipeline esistente
  - [ ] stile coerente con la direzione chiara/editoriale
  - [ ] rischi residui dichiarati
- Verify:
  - [ ] `npm run typecheck`

## Risks
- il workspace puo' restare ancora troppo alto se il blocco upload non viene compattato abbastanza
- la landing puo' risultare troppo "marketing" se non resta ancorata al prodotto reale
- il riuso del vecchio CSS puo' far rientrare segnali dark o wizard legacy
