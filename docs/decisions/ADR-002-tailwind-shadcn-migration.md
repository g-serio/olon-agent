# ADR-002: Adopt Tailwind v4 + shadcn/ui (light theme) for the OlonAgent UI

## Status

Accepted

## Date

2026-04-19

## Context

The current OlonAgent UI is built with bespoke BEM-style CSS in a single ~50KB
`src/app/globals.css` file. Components such as `BrandStep`, `LandingPage`, and
`LlmSetupPanel` reference custom class names (`workspace-shell`,
`surface-card--workspace`, `dropzone--editorial`, `policy-list`, `direction-grid`,
etc.) and the visual language is editorial — large display serif headings, long
descriptive paragraphs, generous vertical rhythm, light cream/ivory palette.

This worked when the product was being explored, but as soon as we stress-test
the screens against actual tool-product expectations, we hit several problems:

1. **Editorial chrome dominates functional surface area.** The `BrandStep` page
   has 3 inputs (DS JSON, SVGs, fonts) but the screen is taller than a viewport
   because of nested eyebrows, `surface-card__copy`, `workspace-brief`,
   per-preset `__summary` + `__rationale` paragraphs, and a `policy-list` that
   describes how the agent behaves rather than letting the user act.
2. **No shared primitives.** Each step re-implements its own buttons, dropzones,
   pills, status indicators in CSS. There is no `Button`, `Card`, `Input`,
   `Popover`, `Dialog` reusable primitive — so consistency relies on copy/paste.
3. **Light-only, low-density palette.** The cream theme is hard to make feel
   like a tool surface, especially next to dense controls (selects, mono inputs,
   status LEDs).
4. **No alignment with the sister product `jsonpages-platform`,** which is the
   shipped Olon control plane the user wants OlonAgent to look and feel like a
   member of. JsonPages-platform uses Tailwind v4 + shadcn/ui (Radix
   primitives) + a token CSS-vars bridge (`--background`, `--card`, `--border`,
   etc.) + Merriweather Variable for display headings + a Labradorite brand
   ramp.
5. **Wording is in Italian** mixed with code-side English. The product targets an
   English-speaking developer audience.

The user's explicit constraints for this migration:

- **Stack must match `jsonpages-platform`** (Tailwind v4 + shadcn + Radix). This
  is the user's option C in the scoping conversation.
- **Layout shape must match `jsonpages-platform`**: sticky `Topbar`, content
  centered in `max-w-screen-xl`, dense card/panel-based pages, no editorial copy.
- **`BrandStep` must fit in fold** at common laptop heights (1280×800 acceptable
  with column-internal scroll, 1440×900 fully visible).
- **Light theme by default** for OlonAgent (whereas `jsonpages-platform` is dark
  by default; both projects share the same token bridge, only the default mode
  differs).
- **All UI wording in English**, zero Italian, including labels, placeholders,
  status messages, button text, empty/error/loading states.
- **All step components migrated** (Brand, Content, Review, Generating,
  Deploying, Done, HtmlReview), not just the first screen.

## Decision

Adopt **Tailwind v4** as the styling system and **shadcn/ui** (Radix
primitives + `cn()` utility composition) as the component primitive layer for
OlonAgent's frontend. Apply the same token CSS-vars bridge architecture used in
`jsonpages-platform`, configured with the **light mode as the default** and dark
mode available via `[data-theme="dark"]` for parity. Migrate all user-facing
components to this stack.

Concrete elements:

- **Build chain:** add `tailwindcss@^4`, `@tailwindcss/postcss@^4`,
  `tw-animate-css`, `postcss.config.mjs` with the `@tailwindcss/postcss` plugin.
- **CSS architecture:** rewrite `src/app/globals.css` as
  - `:root` with light token values (background `#F5F2EE`, card `#FFFFFF`,
    elevated `#EDE9E3`, border `#DDD8D2`, primary `#5B3F9A` Labradorite, etc.)
  - `[data-theme="dark"]` / `.dark` block with the dark counterpart
  - `@theme inline { … }` Tailwind v4 token bridge (`--color-background:
    var(--background)`, etc.) so utility classes resolve to the tokens
  - `@layer base` with global resets, `body`/`h*`/scrollbar styles
- **Component primitives:** add the shadcn/ui set we actually use (`Button`,
  `Card`, `Input`, `Label`, `Select`, `Popover`, `Dialog`, `ScrollArea`) under
  `src/components/ui/`. Use the `new-york` style and `neutral` baseColor as in
  `jsonpages-platform`'s `components.json`.
- **Utility:** add `src/lib/utils.ts` with the standard `cn(…)` helper
  (`clsx` + `tailwind-merge`).
- **Typography:** add `@fontsource-variable/merriweather` for the display family
  and keep `Manrope` (Geist-equivalent) as the primary text font through
  `next/font`. Drop `Cormorant_Garamond`, `Manrope`, `IBM_Plex_Mono` font
  triple — only one display + one primary + one mono is needed, and the
  display Cormorant is one of the contributors to the editorial look we are
  removing.
- **Migration order (incremental):** Foundation → App shell + Topbar →
  `BrandStep` → other steps one at a time → cleanup of dead bespoke CSS.

## Alternatives Considered

### A. Keep bespoke CSS, only refactor structure (no Tailwind, no shadcn)

- **Pros:** zero new dependencies, smallest diff, fastest to land.
- **Cons:** does not solve the absence of shared primitives — every component
  still re-rolls buttons, inputs, popovers; consistency stays a copy/paste
  problem; alignment with `jsonpages-platform` stays only visual, never
  behavioural (no shared `Button` semantics, no shared `Dialog` focus-trap, no
  shared `Select` keyboard handling).
- **Rejected:** this was option A in the user-facing scoping conversation; the
  user picked option C explicitly.

### B. Tailwind v4 only, no shadcn

- **Pros:** full utility-first system without adopting Radix as a transitive
  dependency.
- **Cons:** loses the accessibility floor that Radix provides for free
  (focus trap in `Dialog`, keyboard nav in `Select`/`Popover`, ARIA on
  `Tooltip`), forces re-implementing primitives, diverges from the
  `jsonpages-platform` stack — making future shared component extraction
  harder.
- **Rejected:** the win of stack-parity with `jsonpages-platform` includes
  the primitive layer, not just the utilities.

### C. CSS Modules + a hand-rolled component library

- **Pros:** scoped styles without a utility framework, fewer transitive deps
  than shadcn.
- **Cons:** maximum effort, minimum stack-parity, no community-tested
  accessibility primitives. Same problem as A but in a fancier wrapper.
- **Rejected:** wrong direction relative to the user's "match
  jsonpages-platform" goal.

## Consequences

### Positive

- **Stack parity with `jsonpages-platform`.** Future shared component
  extraction (a `@olon/ui` package, for example) becomes a refactor, not a
  rewrite.
- **Accessibility floor.** Radix primitives ship with focus management,
  keyboard navigation, and ARIA built in.
- **Density.** Tailwind v4 utilities make it cheap to express the dense,
  tool-product visual language without inventing class names.
- **Faster iteration on shape.** Layout changes happen in JSX with utility
  classes, not in a separate CSS file.
- **Single source of design tokens.** The `:root` / `@theme inline` bridge
  means changing a token (e.g. `--card`) updates every utility (`bg-card`)
  consistently.

### Negative / Costs

- **Dependency surface grows** by `tailwindcss@4`, `@tailwindcss/postcss`,
  `tw-animate-css`, `clsx`, `class-variance-authority`, `tailwind-merge`,
  several `@radix-ui/*` packages, `@fontsource-variable/merriweather`.
- **Migration effort.** All step components must be rewritten (one-time
  cost; tracked as Slices 3–4 in the implementation plan).
- **Build pipeline change.** PostCSS now runs Tailwind; this is a Next.js
  built-in path so no custom Webpack config is needed, but it must be set
  up correctly the first time.
- **Old `globals.css` becomes dead** as components are migrated. Slice 5
  removes it. Until then it coexists with the new token CSS to keep the
  in-progress UI working.

### Neutral

- **Light theme default for OlonAgent vs dark default for
  `jsonpages-platform`.** Both projects use the same token names and the
  same `[data-theme="…"]` switching mechanism; only the default mode differs.
  This is intentional: OlonAgent is a single-flow generator surface
  (cream, calm, deliberate), the platform dashboard is an ops cockpit
  (dark, dense, always-on).

## Migration Plan (high level)

1. **Foundation (this slice):** install dependencies, add `postcss.config.mjs`,
   rewrite `src/app/globals.css` as the token bridge (light default), add
   `cn()` utility, add shadcn primitives. Verify `npm run build` and
   `npm run typecheck` pass. No UI change yet.
2. **App shell:** new `Topbar` (logo + step indicator + Models popover +
   provider status LED) wired through `src/app/layout.tsx`. `App.tsx`
   becomes a thin step router.
3. **`BrandStep`:** rewrite in-fold, two-column, sticky header + footer,
   English wording, behaviour card removed, models out (now in Topbar).
4. **Other steps:** Content, Review, Generating, Deploying, Done,
   HtmlReview — same shape, one at a time.
5. **Cleanup:** delete dead bespoke CSS in `globals.css`, dead-code sweep,
   final code review pass.

## References

- Sister project token bridge: `jsonpages-platform/src/app/globals.css`
- Sister project shell shape: `jsonpages-platform/src/app/dashboard/layout.tsx`
  and `jsonpages-platform/src/app/dashboard/components/layout/Topbar.tsx`
- shadcn/ui registry config (mirrors the platform's settings):
  `jsonpages-platform/components.json`
- User-facing scoping decision: option C ("layout + stack") with `all_steps`
  scope, light theme, in-fold `BrandStep`, English-only wording.
