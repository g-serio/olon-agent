# Regression diagnosis — "pipeline" commit broke system-file isolation

**Status:** diagnostic only, no code change yet
**Author:** drafted with Cursor agent on 2026-04-19
**Subject:** why `olon-agent` started touching system files (empty `App.tsx` / `main.tsx`, edits to `src/lib/*`) after the multi-agent pipeline rewrite
**Scope:** `olon-agent` only (the `npm-jpcore` DNA-boundary refactor is a separate, complementary track)

---

## TL;DR

The regression was introduced in commit `d6b80de` ("pipeline"). The user-facing symptom is the agent emitting empty `src/App.tsx` / `src/main.tsx` and overwriting tenant-side system libs (`src/lib/cloudSaveStream.ts`, `src/lib/base-schemas.ts`, etc.).

The root cause is **not** missing blacklists. Pre-pipeline, there were **zero** explicit blacklists and the agent never touched those files. The root cause is that the post-pipeline prompts grew ~5× in size by inlining the full OlonJS v1.6 specification, and the spec **mentions system files by name** in examples and contracts. Once the model sees `src/App.tsx`, `vite.config.*`, `package.json`, `tsconfig*` written down inside its working prompt, it starts treating them as in-scope. The blacklists added in the same commit are partial patches over a self-inflicted leak.

The correct fix is therefore **subtractive, not additive**: shrink the prompt back to a narrowly-scoped output enumeration (the old "8 categories" pattern), move the spec out of the prompt and into a linked reference file. Keep code-side validation as a safety net — completed but secondary.

---

## 1. Evidence trail

### 1.1 Git timeline (4 commits total on `main`)

```
d6b80de  pipeline                       ← regression introduced here
d57206c  prompts visible (TS → TXT)     ← last known-good prompt format
57c8b40  initial agent shell
…
```

`git status` clean (only `docs/ideas/` untracked). `git stash list` empty. So the regression lives entirely inside `d6b80de`, not in uncommitted post-commit edits.

### 1.2 Pre-pipeline architecture (worked well — user confirmed)

The previous flow used three TypeScript prompt modules (`src/prompts/agent1.ts`, `agent2.ts`, `agent3.ts`). The **real generator** was `agent3.ts` — "OlonJS v1.5 Site Generator", retrieved via `git show d57206c:src/prompts/agent3.ts` (1347 LOC, file saved to `%TEMP%\old_agent3.ts`).

The entire system prompt of `agent3.ts` enumerates **only** the 8 things the agent is supposed to produce:

```
STEP 0  shadcn/ui init      (npx shadcn@latest init + add ...)
STEP 1  Capsules            (src/components/<type>/{View,schema,types,index})
STEP 2  src/types.ts        (module augmentation against @olonjs/core)
STEP 3  src/lib/ComponentRegistry.tsx
STEP 4  src/lib/schemas.ts
STEP 5  src/lib/addSectionConfig.ts
STEP 6  src/index.css       (TOCC overlay + Local Design Tokens v1.4)
STEP 7  Data files          (theme.json, site.json, menu.json, pages/*.json)
FINAL   assets-manifest.json + download_assets.sh
        npm run build       (used as reality check)
```

What the user re-confirmed verbatim in this session:

> 1. Capsules (View.tsx, schema.ts, types.ts, index.ts per sectionType)
> 2. Tenant types (src/types.ts)
> 3. Registry (src/lib/ComponentRegistry.tsx)
> 4. Schema aggregate (src/lib/schemas.ts)
> 5. Add section library (src/lib/addSectionConfig.ts)
> 6. CSS bridge (tenant globals)
> 7. Authored JSON (theme.json, menu.json, site.json)
> 8. Pages (page JSON)

**Crucially, `agent3.ts` contains zero blacklists.** Searched for: `system-owned`, `do not write`, `forbidden`, `App.tsx`, `main.tsx`, `vite.config`, `package.json`, `tsconfig`. None present. The model stayed in scope **by structured omission**: nothing about `App.tsx` was ever mentioned, so the model had no reason to emit it.

This is the pattern that worked.

### 1.3 Post-pipeline architecture (broken)

In `d6b80de`, prompts were converted from TypeScript modules to plain text files (good for human visibility — keep this) **and** simultaneously expanded by ~5×:

| File | Pre (`d57206c`)  | Post (`HEAD`)  | Δ |
|---|---|---|---|
| `src/prompts/agent1.ts` → `public/lib/agent1.prompt.txt` | ~470 LOC narrow | ~2416 LOC | +411 % |
| `src/prompts/agent2.ts` → `public/lib/agent2.prompt.txt` | ~515 LOC narrow | ~1192 LOC | +131 % |
| `src/prompts/agent3.ts`                                  | 1347 LOC narrow | (deleted, role merged) | — |

The expansion inlined the full OlonJS v1.6 specification. The spec, like every spec, **names system files in examples and contracts**:
- "the runtime calls `createTenantApp()` from `src/App.tsx`…"
- "tsconfig path aliases must include `@/*` → `src/*`…"
- "vite plugin order must be `tailwindcss()` → `react()`…"
- "package.json must declare `"@olonjs/core": "workspace:*"`…"
- "files in `src/lib/` like `base-schemas.ts` provide the Zod base contracts…"

These mentions are **descriptive context** for a human reader. To an LLM continuing a generative trajectory, they are **prompts to act**. Mentioning a file in a prompt is implicit permission to write it.

The same commit also added partial blacklists in three places:

1. **`public/lib/agent1.prompt.txt`** — only `src/App.tsx` and `src/lib/base-schemas.ts` flagged as non-negotiable.
2. **`public/lib/agent2.prompt.txt`** (line 49) — incorrectly classifies `src/lib/**` as tenant-authored, making it modifiable.
3. **`src/hooks/usePipeline.ts` `validateAgent1Plan()`** (lines 307-405) — only checks `src/app.tsx` and `src/fonts.css` in `forbiddenWrites`.
4. **`src/app/api/sandbox/route.ts` `isSystemOwnedFixPath()`** (lines 117-122) — incomplete denylist; lines 270-282 contain an ad-hoc check for `src/App_.tsx`, evidence of past attempts by the agent to rename system files around the guard.

These are reactive patches against a leak the prompt itself created.

---

## 2. The mental model

| | Pre-pipeline (worked) | Post-pipeline (broken) |
|---|---|---|
| **Prompt scope** | Narrowly enumerative: "produce these 8 categories" | Encyclopedic: full spec inline, including system-file examples |
| **Guard mechanism** | Structured omission (no system files mentioned) | Explicit but partial blacklists fighting the prompt |
| **Validation code-side** | None needed | Partial denylists in 3 separate places, drifted over time |
| **Result** | Model never wrote `App.tsx`/`main.tsx`/`vite.config.*` | Model writes them empty or rewrites system libs |

The unifying principle: **a model's writable surface is the union of every file path mentioned in its working context, minus the files it is explicitly told to skip**. Blacklists can only shrink the set; they cannot shrink it to zero if the prompt keeps adding paths back. The pre-pipeline strategy kept the union itself small.

---

## 3. Strategy (subtractive fix)

### Primary: shrink the prompt

1. **Delete inline spec from `agent1.prompt.txt` and `agent2.prompt.txt`.** Move the full v1.6 spec to a separate reference file (e.g. `public/lib/spec-v1.6.md`) that the prompt **links** ("for full contract details see …") rather than inlines. Length budget: bring `agent1` down from ~2416 to ≲1100 LOC (−54 %).
2. **Re-adopt the "8 categories" template** verbatim from `old_agent3.ts` STEP 1-7 + assets pipeline. That was the proven enumeration.
3. **Remove all by-name mentions of system files** unless strictly necessary. If a contract has to be referenced (e.g. "your generated `src/types.ts` uses `declare module '@olonjs/core'` to extend the registry"), keep only that and never name `App.tsx` / `main.tsx` / `vite.config.*` / `package.json` / `tsconfig*` / `src/lib/base-schemas.ts` / `src/lib/cloudSaveStream.ts` / `src/lib/deploySteps.ts` / `src/lib/OlonFormsContext.ts` / `src/lib/IconResolver.tsx` / `src/lib/draftStorage.ts` / `src/lib/getFilePages.ts`.

### Secondary: keep code-side validation as a safety net

1. **Complete `validateAgent1Plan()`** with the full system-file denylist (not just `src/app.tsx` + `src/fonts.css`).
2. **Complete `isSystemOwnedFixPath()`** likewise, and remove the ad-hoc `src/App_.tsx` rename guard once the root cause is fixed.
3. **Remove the misclassification** at `agent2.prompt.txt:49` that marks `src/lib/**` as tenant-authored.

These are belt-and-braces. They should never trigger in steady state.

### Future (out of scope here): manifest-driven boundary

The DNA-boundary refactor in `npm-jpcore` (Steps A→G in `\\wsl.localhost\Ubuntu\home\dev\npm-jpcore\docs\…`) will produce a `dna.manifest.json` at tenant root with explicit `writeAllowed` / `writeForbidden` paths. Once that lands, both the prompt and the code-side validation can read it as a single source of truth, and Step 4 of the secondary list above collapses into one shared lookup.

---

## 4. What this changes in our previous plan

We previously assumed the fix was **additive** — extend blacklists in prompts and validators until they cover every system file. That was wrong. Adding blacklists against a prompt that keeps mentioning system files is a perpetual race we cannot win. The diagnosis above flips the priority:

1. **First**: subtract from the prompt (this is the only structural fix).
2. **Then**: complete the code-side denylist as a safety net (cheap, mechanical).
3. **Later**: consolidate via `dna.manifest.json` from the `npm-jpcore` track.

---

## 5. Open questions for next session

1. Where exactly does the v1.6 spec live as a canonical document today? If it already exists outside the prompt, the move to `public/lib/spec-v1.6.md` is just a copy. If not, the spec needs to be extracted and edited for clarity before linking.
2. Does Agent 2 (the fixer) still need its current size, or can it shrink to a checklist + delegating link to the same `spec-v1.6.md`?
3. Is the multi-agent split itself still justified post-shrinkage? The pre-pipeline `agent3.ts` was a single agent. Splitting into `agent1` (planner) + `agent2` (fixer) was likely necessary because `agent3` had grown unwieldy — once we shrink it back, we may be able to collapse to one again. Out of scope for this diagnosis; flag for later.

---

## 6. Source artifacts referenced

- `git show d57206c:src/prompts/agent3.ts` → saved at `%TEMP%\old_agent3.ts` (1347 LOC) — the proven pattern
- `git show d57206c:src/prompts/agent2.ts` → saved at `%TEMP%\old_agent2.ts` (~515 LOC) — pre-pipeline builder, also blacklist-free
- `public/lib/agent1.prompt.txt` (HEAD) — current planner prompt, ~2416 LOC
- `public/lib/agent2.prompt.txt` (HEAD) — current fixer prompt, ~1192 LOC
- `src/hooks/usePipeline.ts` `validateAgent1Plan()` lines 307-405
- `src/app/api/sandbox/route.ts` `isSystemOwnedFixPath()` lines 117-122 + ad-hoc guard lines 270-282
