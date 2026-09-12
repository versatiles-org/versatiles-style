# Supporting the OpenMapTiles and Protomaps schemas

**Status: proposal. Not scheduled, not part of 6.0.0.**
Written 2026-09-12 against `feature/api-v6`, with v6.0.0 still untagged; revised the same day to
recommend option A after a risk pass (§9). Numbers here were measured against that branch, not
estimated — re-measure before acting on them.

---

## 1. Summary

Adding OpenMapTiles (OMT) and Protomaps Basemap support is possible, and the plumbing is far cheaper
than expected: the library already treats a schema as **data**, and its option vocabulary is already
schema-neutral. The expensive part is the cartography; the dominant long-term cost is maintenance,
not bundle size.

- **Recommended integration: option A — parallel per-schema modules, no registry**, each exposed as
  its own function from its own subpath export (§4, §5).
- **Why A over the more elegant B:** it does not touch cartography that just shipped, it dissolves
  four API defects instead of mitigating them, and it is a _path to_ B rather than an alternative —
  after a second schema exists you can extract shared style from two real implementations instead of
  betting on an abstraction derived from one.
- **Bundle cost for the CDN build: zero, by construction** — the browser entry simply does not import
  the other schemas. No build flags, no runtime divergence.
- **Cheapest decision gate is §7 step 2**: vendor `OMT_SCHEMA` and run the _existing_ conformance
  suite against it, before writing a single layer.
- **Library-only.** Decided 2026-09-12: no new variants in `variants.ts`. The VersaTiles CDN serves
  Shortbread tiles, so there is nothing to publish for the other schemas (§5.5).
- **Own branch.** Decided 2026-09-12: `feature/schema-support`, cut from `main` after the 6.0.0 tag
  (§7 step 0).

---

## 2. What already exists

Four things that would otherwise have to be built:

1. **The schema is data, not code.** `src/shortbread/schema.ts` (288 lines) is a vendored
   `Record<sourceLayer, { minzoom, maxzoom, fields[] }>` — 23 layers taken from the live TileJSON.
   Everything schema-aware reads that record.
2. **`applyDataFloor` is eight lines**, already parameterised in all but name
   (`SCHEMA[sourceLayer]?.minzoom`).
3. **The conformance suite is generic over the record.** `schema.test.ts` walks the built style,
   collects every `source-layer` and every `['get', field]`, and diffs against the schema. Point it at
   another record and another style and it works unchanged. This is the test that caught
   `symbol-transit-subway` filtering on a field the tiles never carried.
4. **The option vocabulary is schema-neutral.** `ResolvedLayerGroups` names concepts
   (`land.forest`, `roads.streets.residential`, `labels.places`), not layers, and every layer
   self-tags its group path. The 45 colour keys are equally semantic.

`guessStyle` also already dispatches on schema: `isShortbread()` (≥3 matching source-layers, or a
≥50% match rate), falling back to a debug inspector style.

### Measured bundle composition

|                                                              |    raw |       gzip |
| ------------------------------------------------------------ | -----: | ---------: |
| whole browser bundle                                         | 99,388 |     27,368 |
| Shortbread-specific (`layers/` + glue)                       | 47,042 | **11,701** |
| schema-neutral (colors, themes, options, api, features, lib) | 52,054 |     15,722 |

The halves sum to 27,423 gzip against 27,368 for the whole bundle — cross-file compression saves
~55 bytes, so these standalone figures are trustworthy.

> Note: F6 in the release checklist records 76,936 raw / 21,524 gzip. That is stale; the bundle has
> grown ~29% since, largely via the ten-theme expansion (`src/themes` is 10.5% of the bundle).

---

## 3. What is per-schema

Per schema, regardless of approach: a vendored schema record, the cartography, a source name, the
name-field convention (`buildContext` hardcodes `'name_' + language`; OMT carries
`name_de`/`name_en`/`name_int` as well as `name:de`, Protomaps uses `name:de`), an appearance-zoom
table (the `STREET_APPEAR` analogue — where the `water-stream` class of bug lives), and the `MERGES`
table, which is keyed by layer id.

### What option A shares and what it duplicates

|                                                              |  lines | under A                                                |
| ------------------------------------------------------------ | -----: | ------------------------------------------------------ |
| `build.ts` — the layer DSL                                   |    411 | **shared** (largest single file, fully schema-neutral) |
| `schema.ts` — vendored record                                |    288 | per-schema, but it is data                             |
| `context.ts`, `layer-groups-map.ts`, `groups.ts`, `index.ts` |    142 | small per-schema seams                                 |
| `layers/` cartography                                        |  2,357 | **duplicated**                                         |
| `layers/` tests                                              | ~1,150 | **duplicated**                                         |
| `color`, `themes`, `options`, `features`, `lib`, `api`       |      — | shared                                                 |

### The structural finding that option B would have depended on

Only one of the 13 cartography modules separates structure from style:

| module     | lines | style-dispatch functions |
| ---------- | ----: | -----------------------: |
| roads      |   634 |                   **14** |
| labels     |   342 |                        0 |
| pois       |   341 |                        0 |
| landcover  |   188 |                        0 |
| boundaries |   121 |                        0 |
| water      |   108 |                        0 |
| buildings  |    46 |                        0 |

`roads.ts` splits `buildStructures()` (lines 18–171: ids, source-layers, filters, nothing else) from
style functions dispatched by `roadStyle(ctx, id)`, keyed on the semantic layer id — a 24% structure
/ 72% style split. Every other module interleaves the two at the emit site.

Under option B this ratio was the whole economic case, and it was also the plan's biggest unknown:
`roads.ts` is the most regular module in the codebase, so the ratio may not generalise. Recorded here
because it matters again if B is ever revisited (§7 step 7).

---

## 4. Integration options

The risks split along **two independent axes**, which an earlier draft of this document conflated:

- **Implementation** — how the cartography is written (A vs B vs C).
- **API** — how a caller selects a schema (a `schema` option with a registry, vs one function per
  schema).

Most of the API defects in §5 come from the registry, not from B. Dropping the registry fixes them
for any implementation choice.

|       | approach                                                            | per-schema cost                           | verdict                                                           |
| ----- | ------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| **A** | parallel `src/omt/` beside `src/shortbread/`                        | ~2,350 lines + ~1,150 test lines + record | **recommended**                                                   |
| **B** | shared style, per-schema structure (generalise the `roads.ts` seam) | ~650 lines + record + zoom table          | elegant, but bets on an unproven ratio and refactors working code |
| **C** | filter-translation adapter over the existing cartography            | ~300 lines of mapping                     | rejected — see below                                              |
| **D** | do nothing                                                          | 0                                         | the honest fallback                                               |

**Why C fails.** Much of it is mechanical — Shortbread `tunnel=true` ↔ OMT `brunnel=tunnel` ↔
Protomaps `is_tunnel`. Three areas are not: Shortbread splits
`water_lines`/`water_polygons`/`ocean`/`dam_*`/`pier_*` where OMT has `water` + `waterway`; POI
classification is raw OSM tags (`amenity`, `shop`, `tourism`, …) against OMT `class`/`subclass` and
Protomaps' 100+ `kind` values; and zoom availability differs per layer, which no filter rewrite can
fix. The result is 80% of a map plus a long tail of silent wrongness — exactly what the conformance
suite exists to catch.

**Why A over B.** Three reasons, in order of weight:

1. **A barely touches working code.** B refactors six modules of cartography that just came through
   a 201-commit release guarded by 1,212 tests. A adds a sibling directory and changes nothing that
   renders today. It is not literally zero: `build.ts` (411 lines, the shared DSL) lives in
   `src/shortbread/` and must move to a shared location — 13 import sites plus a 10 KB test file —
   and step 1 of §7 ships inside 6.0.0 by definition. Both are mechanical; neither changes output.

2. **A dissolves the API defects** rather than mitigating them (§5.2): no registry means no broken
   codegen, no impure builder, no weakened key validation and no divergent builds.
3. **A is a path to B.** With two real implementations you can extract shared style from evidence.
   Abstracting from one implementation is how the wrong abstraction gets locked in — and the ids that
   style rules key on would have been Shortbread's dialect, permanently.

**A's real cost is duplication** (§9, risk 13). Bound it by scope, not cleverness: cap support at two
schemas, or declare non-Shortbread schemas a best-effort tier with thinner cartography.

---

## 5. API design

### 5.1 Why `schema` should not be an option on `osm()`

Adding `schema: true` to `resolveOsm`'s `checkKeys` whitelist is a one-line change. That is the trap.

1. **Bundle.** For `osm()` to build any schema it must import all of them — ~11.7 KB gzip per schema
   for every consumer. The only escape is `await import()`, which makes `osm()` async, reversing F1
   and breaking the 107 synchronous variant builds.
2. **Statics.** `osm.layerGroups` is a module-level cached singleton built from `shortbreadLayers`;
   `slots`, `defaults` and `supportsLandcover` are equally Shortbread-specific.
3. **Validation.** `checkKeys`'s `known` argument is `NoInfer<KnownKeys<T>>` — derived from the
   options type so that, as its comment says, "the check cannot drift". Option validity is
   schema-dependent (`features.landcover` is a Shortbread extension), so one static whitelist can no
   longer be right for every schema.

An injected **module** (`osm({ schema: omtModule })`) fixes 1 but fails differently:
`minimizeOptions` and `toCode` must serialise options into a URL-storable object and a runnable
snippet, and a module reference cannot round-trip. H deliberately removed the last function-valued
option; this would reintroduce one.

### 5.2 Why not a registry either

A `schema` **string** plus a registry (browser build registering Shortbread only) was the previous
recommendation. It solves the bundle and serialisation problems, but a risk pass found four costs:

1. **`toCode()` emits an unrunnable snippet.** `styleCode()` hardcodes
   `import { osm, inlineSources } from '@versatiles/style'`. With `schema: 'omt'` the output would
   lack both the subpath import and the `registerSchema` call.
2. **`osm()` stops being a pure function of its arguments** — identical options yield different
   results depending on what was registered, which also makes `minimizeOptions`/`toCode` output
   environment-dependent. Plus double registration, ordering, duplicate library copies, SSR.
3. **`checkKeys` loses its single type-derived whitelist** (see 5.1.3).
4. **It introduces the library's first build-time behavioural divergence** — the same version with
   different capability per distribution channel, and `toCode()` output that may not run where it is
   pasted. `src/` currently has no build flags at all.

### 5.3 Recommended: one function per schema, one subpath each

```ts
import { osm } from '@versatiles/style'; // Shortbread — unchanged
import { omt } from '@versatiles/style/omt'; // OpenMapTiles
import { protomaps } from '@versatiles/style/protomaps';

omt({ theme: 'colorful', layers: { labels: false }, text: { language: 'de' } });
```

Why this costs users almost nothing: the option vocabulary is already schema-neutral, so `theme`,
`colors`, `recolor`, `layout`, `text`, `layers`, `sun`, `sky` and `projection` mean the same thing
everywhere. Only the schema-bound edges differ.

What it buys:

- **Bundle**: the browser entry imports Shortbread only, so the other schemas cannot be present. No
  build flags, no registry, no runtime throw that fires in one channel and not another.
- **Codegen**: `omt.toCode()` emits `import { omt } from '@versatiles/style/omt'` — runnable as-is.
- **Purity**: no global mutable state; each function is a pure function of its options.
- **Validation**: each function keeps its own static, type-derived `checkKeys` whitelist, so the
  "cannot drift" guarantee survives intact, per schema.
- **Groups**: each schema declares its own group tree, so a group it cannot express is an _unknown
  key that throws_ rather than an option that silently does nothing.

The cost is that option objects are no longer portable between schemas, and that three names must be
documented instead of one.

**One thing A does not get for free: `guessStyle` auto-dispatch.** `guessStyle` lives in the main
entry, so under A it can only know Shortbread — importing every schema there is exactly the bundle
cost A avoids. The payoff named in §9 (a real style for any vector tileset, rather than the debug
inspector) therefore needs a scoped injection point:

```ts
import { guessStyle } from '@versatiles/style';
import { omt } from '@versatiles/style/omt';

await guessStyle(tileJSON, { schemas: [omt] });
```

This is acceptable precisely where a global registry was not: `guessStyle` is already async, already
does runtime schema detection (`isShortbread()`), already accepts a function-valued option (`fetch`),
and its options are never fed through `minimizeOptions`/`toCode`.

### 5.4 `satellite()`

`satellite()` takes its overlay from Shortbread. Under A it stays Shortbread-only in the main entry;
an OMT-overlaid imagery style would be a `satellite` exported from the `omt` subpath. This is the one
place the design duplicates public surface.

### 5.5 Publishing, variants and sprites

**Decided 2026-09-12: no new variants in `variants.ts`.** Schema support is library-only — the
VersaTiles CDN serves Shortbread tiles, so there is nothing to publish for OMT or Protomaps. This
removes a whole class of cost: no extra published styles, no extra CDN payload, no extra compare
baselines, no growth in the 107-variant matrix.

It has one non-obvious consequence. `sprite-coverage.test.ts` derives its icon set from
`getStyleVariants()` and guards two directions — icons referenced but missing, and icons built but
unused (dead weight, #20). With no published OMT variants, OMT's icon references are never seen by
that guard, and any OMT-only icon added to `base` would look unused and trip it.

**Therefore a design constraint, not just a risk: non-Shortbread schemas reuse the existing icon
set.** Map OMT's `class`/`subclass` and Protomaps' `kind` onto icons `base` already contains. The
sprite sheets are a static manifest (`scripts/config/sprites.ts`), and `base` is 92 KB at 1× / 229 KB
at 2× downloaded by _every_ map — so growing it for a schema the CDN does not even serve would make
existing users pay for unused icons. If a schema genuinely needs an icon `base` lacks, it belongs in
a separate sheet, not in `base`.

---

## 6. Statics

Sorting the `osm.*` statics by what they actually depend on:

| static                        | depends on schema?     | handling                                             |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| `palettes`                    | no                     | unchanged                                            |
| `colors(palette)`             | no                     | unchanged                                            |
| `colorKeys`                   | no (shared vocabulary) | unchanged — some keys are inert under a given schema |
| `resolveOptions(options)`     | already carried        | unchanged                                            |
| `minimizeOptions(options)`    | already carried        | unchanged                                            |
| `toCode(options)`             | already carried        | unchanged                                            |
| `slots`                       | neutral _by contract_  | require every schema to emit the same four anchors   |
| `languages(tileJSON)`         | can be made neutral    | scan for both `name_xx` and `name:xx`                |
| `supportsLandcover(tileJSON)` | Shortbread-only        | stays on `osm`, not copied to other schemas          |
| `layerGroups`                 | **yes**                | each schema function carries its own                 |
| `defaults`                    | **yes**                | each schema function carries its own                 |

Under option A this needs no new mechanism at all: `omt` is its own `Object.assign(fn, { … })` with
its own statics, exactly as `osm` is today. `omt.layerGroups` is correct by construction because it
is built from `omt`'s own layers, and `osm.*` keeps its current meaning unchanged.

Two items that a registry design would have forced **before the tag** dissolve under A:

- `getLayerGroupMap()`'s module-level cache stays valid — each schema module has its own.
- `osm.layerGroups` can stay a getter; it never needs to take an argument.

---

## 7. Phased plan

0. **Work on a dedicated branch: `feature/schema-support`, cut from `main` after the 6.0.0 tag.**
   Step 1 below is pre-tag and belongs on `feature/api-v6`; cutting the schema branch earlier would
   carry unreleased release-prep churn and force a rebase when 6.0.0 lands.
1. **Pre-tag packaging (small, independent, breaking if deferred).** Add an `exports` map,
   `sideEffects: false`, multi-entry rollup, and untangle the two back-imports
   (`features/landcover.ts` -> `LANDCOVER_LAYERS`, `features/satellite-overlay.ts` ->
   `scaleLayerOpacity`). Adding `exports` after publication blocks deep imports that work today.
   **This is the only step that touches the 6.0.0 release**, and it stays on `feature/api-v6`.
2. **Vendor `OMT_SCHEMA`** from OpenFreeMap's TileJSON and point the existing conformance suite at
   it. It reports, mechanically, which cartographic concepts OMT cannot express - before a single
   layer is written. **Cheapest decision gate; do it first and be willing to stop here.**
3. **Move the shared DSL.** Lift `build.ts` (and the neutral part of `context.ts`) out of
   `src/shortbread/` - 13 import sites and a 10 KB test file. Mechanical and output-identical,
   verifiable by the existing suite plus `npm run compare -- --baseline` reporting no change.
4. **Seed `src/omt/`** with one module (water or landcover) plus its schema record and context seam.
   Measure the real effort per module against the estimate.
5. **Port the remaining modules**, POIs last - the messiest mapping, and constrained by §5.5 to the
   icons `base` already contains.
6. **Wire the API**: `omt()` with its own statics, exported from `@versatiles/style/omt`, plus the
   `guessStyle({ schemas })` injection point from §5.3.
7. **Protomaps second**, deriving its record from the PMTiles archive metadata.
8. **Only then reconsider B**, extracting shared style from two real implementations if the
   duplication has become painful in practice.

---

## 8. Testing

The central question for option A is **divergence**: a fix landing in one schema and silently not in
the other. Two mechanisms, in order of value.

### 8.1 Primary guard - cross-schema style invariants (offline, deterministic)

`src/shortbread/invariants.test.ts` already checks generation-stage contracts and, notably, derives
them from the vendored schema _rather than restating them_: every data layer reads a known
source-layer, the source-layer set is stable, every group tag resolves to a leaf, no
`minzoom > maxzoom`, ids are unique, every plain-string paint colour parses.
`api/style-invariants.test.ts` validates the final per-layer paint.

**Generalise both to run against any schema's style.** This catches the bug class screenshots cannot,
with no tiles and no network. The decisive example: _"no layer's opacity ramp completes below its own
`minzoom`"_ is exactly the `airport-taxiway` defect - a dead fade on a layer that never rendered -
and it is a pure property of the style object. Add one invariant per bug of that shape as they are
found, and every schema inherits the guard at once.

Candidates worth asserting across schemas: every group the schema claims to support yields at least
one layer; no layer gated below its source-layer's data floor; casing and fill of the same feature
gated together; no `maxzoom` at or below `minzoom`.

### 8.2 Secondary - cross-schema screenshot comparison

Rendering the same area under two schemas and comparing is worth doing, but its scope must be stated
honestly, because the obvious use is the one it cannot serve.

**What it can catch:**

- gross structural failure - no roads, no labels, no water: a filter that matches nothing;
- **theme fidelity (risk 4)**, its best use: compare _colour distributions_ (share of pixels near
  each palette colour, by ΔE) rather than diffing pixels, and ask whether `colorful` still reads as
  `colorful` on another schema;
- zoom-ramp sanity, by sweeping zooms and looking for a layer that appears or vanishes a level early.

**What it cannot catch - including the risk it looks designed for:**

- **Divergence.** A cross-schema diff confounds "the style diverged" with "the data differs", and
  that confound _is_ the measurement. A missing `airport-taxiway` is indistinguishable from an area
  where OMT simply carries no taxiway. Use §8.1 for this.
- Anything subtle: label collision and placement shift with tiny input changes, so pixel deltas are
  dominated by noise - the classic false positive in map screenshot testing.
- Browser-accurate output: `@maplibre/maplibre-gl-native` has no projection support, so screenshots
  are flat Mercator while browsers draw a globe.

**Operationally** it needs live tiles from both sources, so it is a periodic review tool, not a CI
gate. `scripts/screenshots.ts` already renders 1024x768 PNGs through the native renderer for the five
themes and is the natural place to extend. (Its header comment still claims `osm()`/`satellite()` are
async - stale since F1.)

### 8.3 Per-schema conformance and data sources

- **OMT - OpenFreeMap.** Unmodified OpenMapTiles, no API key, no request limits, commercial use
  allowed. Attribution required: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap". Its TileJSON
  at `https://tiles.openfreemap.org/planet` yields the full 16-layer inventory with per-layer zooms
  and fields.
  **Caveat:** the `tiles` URL embeds a build timestamp
  (`.../planet/20260906_080001_pt/{z}/{x}/{y}.pbf`), so tests must resolve the TileJSON rather than
  hardcode a tile URL. `guessStyle` already accepts a TileJSON object, which fits.
- **Protomaps.** Daily builds at `maps.protomaps.com/builds`, no key, but the docs discourage
  hotlinking - vendor a small PMTiles extract for CI instead.
- `render.e2e.test.ts` already rasterises styles fully offline with mocked resources, so the "does
  this draw at all" harness exists per schema.
- **Sprite coverage** stays Shortbread-only, by the §5.5 constraint: other schemas reuse icons `base`
  already carries, so the sheet never grows and the unused-icon guard keeps working.

---

## 9. Problems and risks

`A` marks how option A changes each risk.

### Tier 1 - structural

| #   | risk                                                                                      | under A                                                                                       |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | The 24/72 structure/style ratio may not generalise beyond `roads.ts`                      | **moot** - A does not depend on it                                                            |
| 2   | Shared style keys on layer ids, so the canonical vocabulary would be Shortbread's dialect | **solved** - each schema names layers idiomatically                                           |
| 3   | Concept mismatch makes some option groups inexpressible                                   | **improved** - an unknown key that throws, not a silent no-op                                 |
| 4   | Same theme, different map: the 45 colour keys assume features exist                       | **not solved**; mitigated by per-schema tuning and the §8.2 colour-distribution check         |
| 5   | Regression risk to cartography that just shipped                                          | **mostly solved**; residual: the `build.ts` move (§7 step 3) and step 1 shipping inside 6.0.0 |

### Tier 2 - API (6-9 are registry-caused and avoided by §5.3)

| #   | risk                                                                                   | under A                                 |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------- |
| 6   | `toCode()` emits a snippet missing the subpath import and registration                 | **solved**                              |
| 7   | Registry makes `osm()` impure; `minimizeOptions`/`toCode` become environment-dependent | **solved**                              |
| 8   | `checkKeys` loses its single type-derived whitelist                                    | **solved** per schema                   |
| 9   | First build-time behavioural divergence between npm and the CDN bundle                 | **solved**                              |
| 10  | **`guessStyle` auto-dispatch is not free under A**                                     | needs the scoped injection point (§5.3) |

### Tier 3 - divergence, testing and tooling

| #   | risk                                                                                                | under A                                               |
| --- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 11  | **Silent divergence: a fix lands in one schema and not the other**, with no test that sees it       | mitigated by §8.1 invariants; **not** by screenshots  |
| 12  | `build.ts` becomes a coupling point: one DSL shared by N schemas                                    | accepted; keep its tests with the moved file          |
| 13  | Sprite coverage: with no published variants, other schemas' icon references are never checked       | contained by the §5.5 reuse-existing-icons constraint |
| 14  | Vendored records go stale silently - conformance checks style-against-record, not record-vs-reality | not solved; needs a refresh procedure                 |
| 15  | External tileset dependencies: OpenFreeMap's URL rotates daily, Protomaps discourages hotlinking    | not solved - keep tile-backed checks out of CI (§8.2) |
| 16  | Per-schema appearance-zoom tables are silent-failure territory                                      | partly addressed by §8.1                              |
| 17  | Test multiplication: ~1,150 lines of layer tests and a snapshot set per schema                      | inherent to A                                         |
| 18  | **Maintenance multiplication** - every cartographic fix made N times                                | **A's core cost**, accepted deliberately              |

### Tier 4 - surface and process

| #   | risk                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 19  | Per-schema group trees mean `OmtOptions` != `OsmOptions`; downstream UI tools (`maplibre-versatiles-styler`, the `optionMeta` idea) multiply                       |
| 20  | Packaging mechanics: `rollup-plugin-dts` is single-entry; `tsconfig.json`'s `paths` needs a per-subpath entry; `moduleResolution: node10` cannot see subpath types |
| 21  | `satellite()` duplication across subpaths (§5.4)                                                                                                                   |
| 22  | No demonstrated demand; OSM Bright, MapTiler and Protomaps' own styles exist, maintained by the schema owners                                                      |
| 23  | Half-ported is worse than absent - 80% coverage reads as broken                                                                                                    |
| 24  | Solo-maintainer bandwidth immediately after a long release cycle                                                                                                   |
| 25  | Attribution wording differs per tileset; Protomaps reaches z15 where the others stop at z14; `osm()` means "Shortbread" although all three carry OSM data          |

**Resolved by decision:** publishing per-schema variants - and with it the extra CDN payload, compare
baselines and growth of the 107-variant matrix - is off the table (§5.5).

### Stop criteria

Abandon in favour of option D if **any** of these holds:

- the step-2 conformance run shows more than a handful of layer groups cannot bind;
- step 4 shows a module costs materially more than the ~180-line average implied by the cartography
  total;
- **no named downstream consumer** - a specific issue, or a project that would adopt it - has asked
  for it by the time step 2 completes. "No demand" has to be falsifiable, or it never stops anything.
