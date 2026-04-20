# Spike Report: `createTenantApp(config)` factory feasibility

> Canonical copy: [`npm-jpcore/docs/ideas/dna-boundary-spike-report.md`](../../../npm-jpcore/docs/ideas/dna-boundary-spike-report.md)
> Relevance for olon-agent: validates that the proposed DNA promotion is feasible, so the manifest-driven guard simplification planned for `olon-agent` has a real foundation.

## Outcome

**FEASIBLE — HIGH CONFIDENCE.** App.tsx (1162 lines) collapses to a 28-line
tenant shim. The 8 tenant-specific symbols become factory config. Two edge
cases (Vite env inlining, DopaDrawer fonts coupling) have type-safe answers
in the factory API.

## What this means for olon-agent

Once `@olonjs/core` ships the `createTenantApp` factory and the tenant template
emits a `dna.manifest.json`, the olon-agent simplifications described in
[dna-boundary-tenant-core-shim.md](./dna-boundary-tenant-core-shim.md) become
trivial to apply:

- `isSystemOwnedFixPath` → `isSystemOwned(manifest, path)` (3 lines)
- Plan validator's `forbiddenWrites` ceremony → single manifest check
- Agent 1 prompt "FIXED TENANT DNA" section → 1 line
- Net negative LOC in `src/hooks/usePipeline.ts` and `src/app/api/sandbox/route.ts`

Specifically, the failure modes observed in santa13 (empty `main.tsx`,
overwritten `src/lib/draftStorage.ts`) become **structurally impossible**
because those files do not exist at those paths anymore — they live in
`@olonjs/core/dna/`. The tenant scaffold has only 4-5 shim files inside
`src/_core/`, each ~3-10 lines. The agent LLM cannot generate a plausible
"stub" of a 3-line re-export that breaks the app — there's nothing to stub.

## Read the full analysis in the canonical copy

See [`npm-jpcore/docs/ideas/dna-boundary-spike-report.md`](../../../npm-jpcore/docs/ideas/dna-boundary-spike-report.md) for:

- Line-by-line classification of `App.tsx` (DNA vs tenant-config)
- Full TypeScript `CreateTenantAppConfig` interface
- Tenant shim example (28 lines)
- Files-moved map (core ↔ tenant)
- Estimated LOC delta (~−2280 LOC per additional tenant)
- Implementation step sequence (A through G)
