# Implementation Plan: Allineamento prompt Agent 1 al contratto tenant

## Overview

Implementare le decisioni dell'[ADR-003](../decisions/ADR-003-tenant-core-boundary-realignment.md):
allineare `public/lib/agent1.prompt.txt` al contratto reale del tenant generato
— import dei base symbols da `@olonjs/core`, `SECTION_SUBMISSION_SCHEMAS` come
export obbligatorio in `src/lib/schemas.ts`. Il piano è **chirurgico**: ~+14
righe sul prompt, priorità a sostituzioni invece che aggiunte.

## Architecture Decisions (riassunto da ADR-003)

- I 5 base symbols (`BaseSectionData`, `BaseArrayItem`, `BaseSectionSettingsSchema`, `CtaSchema`, `ImageSelectionSchema`) si importano da `@olonjs/core`
- `@/lib/base-schemas` non è un path valido — non va citato nel prompt
- Il tenant generato non deve scrivere `src/lib/base-schemas.ts`
- `src/lib/schemas.ts` deve esportare **3 cose**: `SECTION_SCHEMAS`, `SECTION_SUBMISSION_SCHEMAS` (anche `{}`), e re-export dei 5 base symbols
- Shadcn (`utils.ts`, `components.json`, import dei `ui/*.tsx`): **fuori scope**, il prompt non lo tocca

## Anti-prompt-explosion principles

| Regola | Applicazione |
|---|---|
| Sostituire, non aggiungere | 6/8 modifiche sono replace puro |
| Zero ridondanza | Una sola hard-rule, non duplicata in 3 punti |
| Niente changelog inline | La storia vive nell'ADR-003, non nel prompt |
| Nuovo materiale solo dove necessario | `SECTION_SUBMISSION_SCHEMAS` solo nel template STEP 4 |

## Task List

### Phase 1: Patch chirurgiche al prompt

**Task 1.1: Sostituire 6 occorrenze di `@/lib/base-schemas` → `@olonjs/core`** ✅

- **Description:** Replace puro su 6 righe di `public/lib/agent1.prompt.txt`.
  Le righe 442, 458, 479, 484 sono import-style; la riga 872 è
  `from './base-schemas'` (re-export, sostituita dentro la riscrittura
  STEP 4 di Task 1.2); la riga 1422 è prosa.
- **Acceptance criteria:**
  - [x] Tutte e 6 le righe puntano a `@olonjs/core` (5 replace diretti + 1 dentro 1.2)
  - [x] Nessun riferimento residuo a `@/lib/base-schemas` nel prompt (eccetto la hard-rule di Task 1.3, voluta)
  - [x] Nessun riferimento residuo a `./base-schemas` nel prompt
- **Verification:**
  - `rg "@/lib/base-schemas" public/lib/agent1.prompt.txt` → 0 match
  - `rg "from '\\./base-schemas'" public/lib/agent1.prompt.txt` → 0 match
- **Files likely touched:**
  - `public/lib/agent1.prompt.txt`
- **Estimated scope:** XS (~6 righe modificate, 0 aggiunte)
- **Line delta:** −36 char (`@olonjs/core` è 6 char più corto di `@/lib/base-schemas`)

**Task 1.2: Aggiornare STEP 4 (`src/lib/schemas.ts` template)** ✅

- **Description:** Il blocco righe ~870-887 deve mostrare:
  (1) re-export da `@olonjs/core` invece che `./base-schemas`
  (2) aggiungere `ImageSelectionSchema` al re-export (5° simbolo)
  (3) aggiungere `SECTION_SUBMISSION_SCHEMAS = {} as const;` con commento breve
- **Acceptance criteria:**
  - [x] Re-export include `ImageSelectionSchema` come 5° simbolo
  - [x] `SECTION_SUBMISSION_SCHEMAS` esportato anche se vuoto
  - [x] Origine `@olonjs/core` esplicita
  - [x] Commento sopra `SECTION_SUBMISSION_SCHEMAS` spiega il vincolo runtime (2 righe)
  - [x] La sezione totale non cresce di più di 12 righe (delta effettivo: +14 sull'intero blocco STEP 4)
- **Verification:**
  - Ispeziona righe 870-905 del prompt patchato
  - Conta righe pre/post (`wc -l`)
- **Dependencies:** Task 1.1
- **Files likely touched:**
  - `public/lib/agent1.prompt.txt`
- **Estimated scope:** S (1 blocco di 18→~30 righe)
- **Line delta:** +12 righe

**Task 1.3: Aggiungere hard-rule "DO NOT write src/lib/base-schemas.ts"** ✅

- **Description:** Una sola regola, in **un solo posto**, vicino alla
  sezione "What to generate" (righe 9-19) o subito dopo. NON ripetere
  dentro ogni STEP. Riguarda solo `base-schemas.ts`. Inserita a riga 21,
  subito dopo l'enumerazione dei file da generare.
- **Acceptance criteria:**
  - [x] La regola appare una sola volta nel prompt
  - [x] È vicina alle altre hard rules iniziali (line 21, fine "What to generate")
  - [x] Massimo 2 righe (1 riga + 1 blank)
- **Verification:**
  - `rg "src/lib/base-schemas\\.ts" public/lib/agent1.prompt.txt | wc -l` → 1
  - Lettura visiva: la regola è in zona "What to generate" / "Hard constraints"
- **Dependencies:** Task 1.1
- **Files likely touched:**
  - `public/lib/agent1.prompt.txt`
- **Estimated scope:** XS
- **Line delta:** +2 righe

#### Checkpoint: Phase 1 — Prompt patchato ✅

- [x] Tutti i task 1.1-1.3 applicati
- [x] `git diff --stat`: 21 insertions, 7 deletions → net +14 righe (match plan)
- [x] `rg "@/lib/base-schemas|\\./base-schemas"` → 1 (solo la hard-rule, voluta)
- [x] `rg "@/lib/utils"` → 0 (il prompt non cita mai utils.ts)
- [x] `rg "src/lib/base-schemas\\.ts"` → 1 (solo la hard-rule)
- [x] Diff visivo verificato: nessuna contraddizione interna
- [ ] Review umana approva il diff prima di procedere a Phase 2

### Phase 2: Verifica live end-to-end

**Task 2.1: Generare un tenant minimale con Agente 1 (smoke test, senza logo)**

- **Description:** Brand semplice (es. "modern bakery"), no DS JSON, no SVG.
  Provider: Anthropic Claude Sonnet (più affidabile per regole stringenti).
  Verificare che lo script generato:
  (1) non scriva mai `src/lib/base-schemas.ts`
  (2) `schemas.ts` contenga sia `SECTION_SCHEMAS` che `SECTION_SUBMISSION_SCHEMAS`
  (3) tutte le capsule importino da `@olonjs/core`
- **Acceptance criteria:**
  - [ ] Lo script bash generato non contiene `cat > src/lib/base-schemas.ts`
  - [ ] Lo script bash contiene `export const SECTION_SUBMISSION_SCHEMAS`
  - [ ] Lo script bash NON contiene `'@/lib/base-schemas'` né `'./base-schemas'`
- **Verification:**
  - Ispezionare `agent1Script` post-run
  - `rg "base-schemas" <script>` → 0
- **Dependencies:** Phase 1 checkpoint
- **Files likely touched:** Nessuno (test)
- **Estimated scope:** S (run + ispezione)

**Task 2.2: Eseguire Agente 2 sul tenant generato**

- **Description:** Lanciare il fix-loop di Agente 2 sullo script di Task 2.1.
  Verificare green build entro 3 iterazioni del fix-loop.
- **Acceptance criteria:**
  - [ ] `npm run build` nel sandbox E2B passa con esito 0
  - [ ] Agente 2 non entra in loop infinito
  - [ ] `install_npm.jpcore.sh` viene prodotto
- **Verification:**
  - Logs sandbox mostrano "vite v6 build successful" o equivalente
  - DeployResult.skipped = true (modalità local), nessun errore fatale
- **Dependencies:** Task 2.1
- **Files likely touched:** Nessuno (test)
- **Estimated scope:** S

**Task 2.3: Generare un tenant CON logo (regression test)**

- **Description:** Stesso flusso di 2.1 ma con un logo SVG caricato. Verificare
  che il problema-logo originale (regressione che ci ha fatto reset a `db5b87e`)
  non si ripresenti. Nota: senza i validator stringenti reintrodotti, qui
  testiamo solo che il flusso non rompa per il logo.
- **Acceptance criteria:**
  - [ ] Agente 1 produce uno script
  - [ ] L'orchestrator inietta correttamente `src/assets/brand/logo.svg`
  - [ ] Agente 2 builda verde
  - [ ] Lo script finale contiene il logo svg corretto
- **Verification:**
  - Ispezionare lo script generato + sandbox logs
- **Dependencies:** Task 2.2
- **Files likely touched:** Nessuno (test)
- **Estimated scope:** S

#### Checkpoint: Phase 2 — Verifica live

- [ ] Smoke test (no logo) verde
- [ ] Smoke test (con logo) verde
- [ ] Confermato che il runtime engine non si alloopa più
- [ ] User approva → si chiude la regressione corrente

### Phase 3 (deferred): Reintroduzione validators stringenti

> Out of scope per questo piano. Sarà oggetto di un ADR-004 dedicato.

Pre-requisiti per pianificarla:
- Phase 2 chiusa con successo
- Comprensione delle false-positive che avevano motivato il reset a `db5b87e`
- Strategia "self-heal nell'orchestrator" per il logo invece di `forbiddenWrite`
  che blocca

Tasks attesi (alto livello, NON ancora pianificati):
1. Re-introdurre `validateScriptAgainstPlan` con `forbiddenWrites` aggiornato
2. Aggiungere check su `SECTION_SUBMISSION_SCHEMAS` nel `schemas.ts` generato
3. Strip self-heal del logo.svg model-authored prima di validare
4. Aumentare osservabilità (log warning sui self-heal)

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Modello LLM ignora hard-rule e scrive `base-schemas.ts` | Tenant divergente / shadow-import | Media | Phase 3 (validator) catch-all in `forbiddenWrites` |
| Prompt cresce e il modello tronca | Script incompleto | Molto bassa | Delta atteso +14 righe / 2625 = +0.5%, trascurabile |
| Capsule pre-realignment esistenti importano da `@/lib/base-schemas` | Tenant vecchio rotto | Solo se rigenerato | Out of scope: stiamo allineando solo generazione fresh |

## File Surface Summary

| File | Modifiche |
|---|---|
| `public/lib/agent1.prompt.txt` | 6 sostituzioni + 2 inserimenti localizzati (~+14 righe) |
| `docs/decisions/ADR-003-tenant-core-boundary-realignment.md` | Già scritto |
| `docs/specs/agent1-core-realignment.plan.md` | Questo file |

Nessuna modifica ai file `.ts/.tsx` di olon-agent. Nessuna modifica alle
guards/validator (sono già rimossi al reset `db5b87e`).

## Success Criteria

- [ ] Phase 1 chiusa: prompt patchato, delta ~+14 righe, nessuna contraddizione
- [ ] Phase 2 chiusa: 2 tenant test (no logo + con logo) generati e buildati green
- [ ] L'utente conferma che la regressione "Agente 2 si alloopa" è risolta
- [ ] ADR-003 e questo plan sono coerenti con lo stato del codice
- [ ] Phase 3 (validators) è separata in nuovo ADR/plan
