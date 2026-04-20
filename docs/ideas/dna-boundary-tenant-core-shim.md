# DNA Boundary: tenant `_core/` shim + `@olonjs/core/dna` sub-export

> Status: **DRAFT — pending feasibility spike** (decompose `App.tsx` into `createTenantApp(config)` factory)
> Authors: ideated 2026-04-19 between OlonJS Core and olon-agent maintainers
> Related: canonical copy lives in [npm-jpcore/docs/ideas/dna-boundary-tenant-core-shim.md](../../../npm-jpcore/docs/ideas/dna-boundary-tenant-core-shim.md)

## Why this matters for olon-agent

Today olon-agent prevents tenant generation from clobbering DNA by
**enumerating** forbidden paths in three places that drift independently:

1. `public/lib/agent1.prompt.txt` — natural-language blacklist (~5 paths)
2. `src/hooks/usePipeline.ts` → `validateAgent1Plan` — checks 2 of those paths
3. `src/app/api/sandbox/route.ts` → `isSystemOwnedFixPath` — different 4 paths

The two failure modes we just diagnosed (empty `main.tsx`, overwritten
`src/lib/draftStorage.ts`) both stem from this enumeration drift: `main.tsx`
appeared in zero of the three blacklists, `draftStorage.ts` in zero too.

This proposal **eliminates the enumerations entirely**: olon-agent reads
`dna.manifest.json` from the sandbox after scaffolding and derives all guards
from it. When `@olonjs/core` adds or removes a DNA file, the manifest in the
template moves with it, and olon-agent automatically tracks the new boundary
without any code change.

## Problem Statement

How might we make the system-owned DNA boundary structurally enforced in the
filesystem of every OlonJS tenant, so that olon-agent guards collapse from a
fragile path blacklist into a single positional rule, and so that DNA stops
being duplicated by-hand across tenants?

## Recommended Direction

Promote the 9 DNA libs and the boot files (App / main / runtime / entry-ssg) from
`apps/tenant-alpha/src/` into a new `packages/core/src/dna/` subtree, exposed
as a sub-export `@olonjs/core/dna`. In each tenant, replace those files with a
small `src/_core/` folder containing one-line shim re-exports plus a factory
call for App boot. Add a `dna.manifest.json` at the tenant root declaring
`writeAllowed` / `writeForbidden` paths; olon-agent reads it from the sandbox
and derives all guards data-driven, so future DNA changes ship with the
tenant scaffold instead of patching the agent's hardcoded blacklist.

## Key Assumptions to Validate

- [ ] `@olonjs/core` bundle size remains acceptable after absorbing ~16 KB of DNA
- [ ] React hooks (`useOlonForms`, `useFormSubmit`, etc.) work correctly when
      consumed from `@olonjs/core/dna` in both Studio mode and visitor SSG
- [ ] Vite dev resolves `@olonjs/core/dna/*` via source-link AND via published package
- [ ] `App.tsx` (~42 KB / 1162 lines) decomposes cleanly into `createTenantApp(config)`
- [ ] **olon-agent can be retrofitted to read `dna.manifest.json` from the sandbox
      with strictly less code than today's `isSystemOwnedFixPath` blacklist**
      → target: net negative LOC in `sandbox/route.ts` and `usePipeline.ts`
- [ ] **Agent 1 prompt shrinks substantially**: the "FIXED TENANT DNA" section
      collapses from an enumerated list to "do not write under `src/_core/**`"

## Olon-agent changes (concrete, post-promotion)

### Before (`src/app/api/sandbox/route.ts`)

```ts
function isSystemOwnedFixPath(filePath: string): boolean {
  return filePath === "src/App.tsx"
    || /^vite\.config\./.test(filePath)
    || /^tsconfig/i.test(filePath)
    || filePath === "package.json";
}
```

### After

```ts
import { minimatch } from "minimatch";
import type { DnaManifest } from "@olonjs/core/dna/manifest";

async function loadManifest(sandbox): Promise<DnaManifest> {
  const raw = await sandbox.files.read("dna.manifest.json");
  return JSON.parse(raw) as DnaManifest;
}

function isSystemOwned(manifest: DnaManifest, filePath: string): boolean {
  return manifest.writeForbidden.some(p => minimatch(filePath, p));
}
```

### Agent 1 prompt section

**Before** (~30 lines enumerating each forbidden path with examples):

```
## FIXED TENANT DNA — NON-NEGOTIABLE
The bash script must NEVER write a `cat >` heredoc for any of:
  src/App.tsx
  src/main.tsx
  src/runtime.ts
  src/entry-ssg.tsx
  src/vite-env.d.ts
  src/lib/base-schemas.ts
  src/lib/draftStorage.ts
  src/lib/cloudSaveStream.ts
  src/lib/getFilePages.ts
  src/lib/IconResolver.tsx
  src/lib/useOlonForms.ts
  src/lib/OlonFormsContext.ts
  src/lib/useFormSubmit.ts
  src/lib/deploySteps.ts
  src/lib/utils.ts
  index.html
  vite.config.*
  package.json
  tsconfig*
```

**After** (1 line):

```
## TENANT DNA BOUNDARY
The bash script must NEVER write any file matching a glob in
`dna.manifest.json` → `writeForbidden`. The scaffold has already produced
`src/_core/`, `src/main.tsx`, `index.html`, `vite.config.ts`, `tsconfig*`,
`package.json` — leave them untouched.
```

### Plan validator

`validateAgent1Plan` becomes a **single check**: `plan.filesToWrite.every(f =>
manifest.writeAllowed.some(p => minimatch(f, p)) && !manifest.writeForbidden.some(p => minimatch(f, p)))`.

## MVP Scope for olon-agent (after npm-jpcore promotes DNA)

1. Add `minimatch` dependency
2. Add `loadManifestFromSandbox()` helper called once after the scaffolding step
3. Replace `isSystemOwnedFixPath` with `isSystemOwned(manifest, path)`
4. Replace prompt's "FIXED TENANT DNA" section with the 1-line rule above
5. Replace `validateAgent1Plan`'s `forbiddenWrites` ceremony with the manifest-driven check
6. Add `validateScriptHeredocsAgainstManifest()` — parse `src_tenant.sh`, ensure no `cat >` targets a `writeForbidden` path
7. Delete dead code in `usePipeline.ts` (lines 793-847)

## Not Doing (and Why)

- **Don't ship olon-agent changes before npm-jpcore promotion** — the manifest
  must exist in tenant scaffolds first, otherwise `loadManifest()` returns null
  and we'd need fallback hardcoded blacklists, defeating the point.
- **Don't add a runtime smoke test in this iteration** — separate concern,
  separate PR. (Tracked as F follow-up.)

## Open Questions for olon-agent side

- Should olon-agent fail closed if `dna.manifest.json` is missing from sandbox?
  (Suggest: yes — fail loudly, don't silently fall back to old blacklist)
- Should we also let `dna.manifest.json` declare `prompt.dnaInstructions` so
  the manifest controls what prompt text the agent injects?
  (Suggest: yes, V2 — closes the loop completely)
