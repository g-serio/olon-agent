# ADR-003: Aggiornare il prompt di Agent 1 al contratto attuale del tenant

## Status

Accepted

## Date

2026-04-29

## Context

Il prompt `public/lib/agent1.prompt.txt` istruisce il modello LLM a generare
tenant OlonJS che oggi non compilano e non avviano. Due failure mode separati:

**1. Import path obsoleto.**
Il prompt mostra in 6 punti (righe 442, 458, 479, 484, 872, 1422) la forma
`from '@/lib/base-schemas'`. Il tenant-target oggi importa i base symbols
da `@olonjs/core`. I file `base-schemas.ts` non esistono nel tenant.

**2. Export mancante: `SECTION_SUBMISSION_SCHEMAS`.**
Il bootstrap del runtime engine consuma due registry da `src/lib/schemas.ts`:
`SECTION_SCHEMAS` e `SECTION_SUBMISSION_SCHEMAS`. Senza il secondo (anche
se vuoto come `{} as const`), il tenant non parte e Agent 2 entra in
fix-loop infinito. Il prompt attuale non lo menziona.

`cn` (clsx + tailwind-merge) è e resta materia **shadcn**. `npx shadcn init`
crea `src/lib/utils.ts` autonomamente, `npx shadcn add` genera componenti
con `import { cn } from "@/lib/utils"` che risolve out-of-the-box. Il prompt
non deve toccare niente di questo flusso.

## Decision

Allineiamo il prompt di Agent 1 al contratto reale, in modo chirurgico:

### 1. Origine dei base symbols

Il prompt deve mostrare ovunque `from '@olonjs/core'` per:

- `BaseSectionData`
- `BaseArrayItem`
- `BaseSectionSettingsSchema`
- `CtaSchema`
- `ImageSelectionSchema`
- `WithFormRecipient`

`@/lib/base-schemas` non va più menzionato.

### 2. File vietati nel tenant generato

Lo script `src_tenant.sh` non deve scrivere `src/lib/base-schemas.ts`. Hard
rule, una sola occorrenza nel prompt.

### 3. Template `src/lib/schemas.ts` aggiornato (STEP 4)

Lo STEP 4 deve produrre:

```typescript
import { ASchema } from '@/components/a';
// ... per ogni capsule generata

export const SECTION_SCHEMAS = {
  'a': ASchema,
  // ... entry per ogni section type
} as const;

/**
 * Submission schemas per section type. Empty `{}` is valid: keep the
 * export so the engine bootstrap doesn't fail.
 */
export const SECTION_SUBMISSION_SCHEMAS = {
  // populated only by capsules that declare a SubmissionSchema
} as const;

export type SectionType = keyof typeof SECTION_SCHEMAS;

export {
  BaseSectionData,
  BaseArrayItem,
  BaseSectionSettingsSchema,
  CtaSchema,
  ImageSelectionSchema,
} from '@olonjs/core';
```

Tre invarianti:
- `SECTION_SCHEMAS` con almeno header + footer
- `SECTION_SUBMISSION_SCHEMAS` esportato anche se `{} as const`
- re-export dei 5 base symbols da `@olonjs/core`

### 4. Capsule schemas → import da `@olonjs/core`

Tutti i template di capsule schema nel prompt che oggi mostrano
`from '@/lib/base-schemas'` devono mostrare `from '@olonjs/core'`.

### 5. Shadcn: zero modifiche

Il flusso shadcn nativo funziona. Il prompt non scrive `utils.ts`, non
patcha `components.json`, non riscrive import. Lascia in pace shadcn.

## Alternatives Considered

### A. Mantenere `@/lib/base-schemas` come thin re-export nel tenant

```typescript
// src/lib/base-schemas.ts
export * from '@olonjs/core';
```

- **Pros:** zero modifiche al prompt sui base-schemas.
- **Cons:** file morto nel tenant, indirection inutile, non risolve
  `SECTION_SUBMISSION_SCHEMAS`, capsule devono comunque sapere dove vivono
  i simboli.
- **Rejected:** indirection senza valore.

### B. Lasciare il prompt fermo, gestire via alias Vite

- **Pros:** zero diff sul prompt.
- **Cons:** alias Vite sono opachi al modello LLM; non risolvono
  `SECTION_SUBMISSION_SCHEMAS`; il tenant non è self-explanatory.
- **Rejected:** la chiarezza sorgente vince.

### C. Reintrodurre validator stringenti contestualmente

- **Pros:** garantisce conformità al primo run.
- **Cons:** unisce questo cambio (solo prompt) al cambio validator (che
  aveva regressioni sul logo, da cui il reset a `db5b87e`).
- **Rejected:** validator vanno in un ADR-004 separato.

## Consequences

### Positive

- Tenant generato compila e parte
- Agent 2 non entra in loop per causa engine bootstrap
- Prompt resta corto: ~+14 righe (12 STEP 4 + 2 hard-rule), zero blocchi
  nuovi in STEP 0
- Nessuna patch su shadcn / `components.json` / `.tsx` import: massima
  semplicità

### Negative / Costs

- 6 occorrenze del prompt da aggiornare (replace puro, zero righe nuove
  qui)
- `SECTION_SUBMISSION_SCHEMAS` è un vincolo silenzioso runtime: se non
  viene generato, il fallimento è opaco (loop Agente 2). Va reso esplicito
  nel template e nel commento.

### Neutral

- `components.json`, `src/lib/utils.ts`, gli import dei file `ui/*.tsx`
  non cambiano: shadcn fa il suo.

## Implementation

Il piano operativo vive in
[`docs/specs/agent1-core-realignment.plan.md`](../specs/agent1-core-realignment.plan.md).
Tre task XS-S, una sola sessione, ~+14 righe sul prompt.

Prerequisiti runtime già verificati:
- `temp/1.6` con `SECTION_SUBMISSION_SCHEMAS = {} as const` builda e parte ✅
- `temp/1.6` senza `SECTION_SUBMISSION_SCHEMAS` → Agent 2 si alloopa ✅

Validator stringenti restano fuori (ADR-004 futuro).

## References

- [`docs/specs/agent1-core-realignment.plan.md`](../specs/agent1-core-realignment.plan.md) — piano operativo
- [`public/lib/agent1.prompt.txt`](../../public/lib/agent1.prompt.txt) — file da patchare
- ADR-001 — architettura multi-provider della pipeline
- ADR-002 — UI Tailwind+shadcn di OlonAgent (interno, non riguarda i tenant generati)
