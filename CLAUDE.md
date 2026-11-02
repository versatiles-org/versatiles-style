# versatiles-style

`@versatiles/style` generates MapLibre `StyleSpecification` objects and the sprite sheets they use. It ships as an npm package (`dist/`, ESM, subpaths `.`, `./omt`, `./protomaps`, `./migrate`), a CDN bundle (UMD, global `VersaTilesStyle`) and release tarballs of prebuilt styles and sprites.

Docs to read rather than guess from: `API_DESIGN.md` (the API contract and the v5/v6 migration tables), `SPRITES.md` (sheets, naming, adding icons), `scripts/README.md` (every script and which comparison tool answers what).

## Layout

- `src/api/`: public builders (`osm`, `satellite`, `guessStyle`, `guessSchema`, `inspectorStyle`) and most style-wide tests.
- `src/options/`: option types, resolving and validation. `parts/` holds the composable pieces. Per-schema options live in `src/omt/` and `src/protomaps/`, not here.
- `src/shortbread/`, `src/omt/`, `src/protomaps/`: one directory per tile schema, with layers and a vendored `schema.ts`.
- `src/cartography/`, `src/features/`, `src/dsl/`: shared layer definitions, optional style parts (light, terrain, sky), layer-building helpers.
- `src/themes/`: `colorful.ts` is hand-written, `tables.ts` is generated.
- `src/migrate/`: `guessOptions`, from a foreign style back to options.
- `src/exports.ts`: what both entries share. `src/index.ts` (npm) adds authoring helpers, `src/browser.ts` (CDN) doesn't.
- `scripts/`: dev tooling, never shipped. `scripts/config/` holds theme and icon tables.
- `dev/`: Vite playground and icon editor (`/icons.html`).
- `icons/`: SVGs filed by provenance, not by sprite sheet.

## Commands

```sh
npm run format              # Prettier, rewrites files
npm run check               # full gate: format, lint, build, typecheck, check-exports, test:all
npm run check-ci            # the same with format:check, as CI runs it
npm test                    # unit project only
npm run test:e2e            # e2e project only; browser-bundle tests skip unless the bundle is built
npm run test:all            # both projects
npx vitest run --project unit src/api/osm.test.ts   # one file
npx vitest run --project unit -u                    # accept intended snapshot changes
npm run typecheck
npm run lint
npm run dev                 # http://localhost:8080
npm run build-node          # dist/ only
npm run generate-themes     # add -- --dry-run to list changes only
npm run compare -- --save-baseline   # before a styling change
npm run compare -- --baseline        # after it: every altered style property
npm run schema-compare      # report at .cache/schema-compare/index.html
npm run vendor-schema -- shortbread --check   # also omt, protomaps; --write updates src/*/schema.ts
```

- `npm run build` deletes `release/`, needs `optipng` on the PATH, and needs network because `build-styles` calls `inlineSources`. It also regenerates tracked files (see below).
- `doc-site` (screenshots from live tiles) is deliberately not part of `build`. Only the docs job in the release workflow runs it.
- `overlay-compare` and the GL JS e2e test need `npx playwright install chromium`. The test skips itself without it, which includes CI.
- `npm run release` only prepares the release. npm publishing happens in `release.yml` from a tag, with trusted publishing. The tag must equal `v` + the `package.json` version or the workflow refuses to run.

## Working rules

- After code changes, run `npm run format`, then `npm run check`. It's slow, so while iterating use `npm run test:all`, `npm run typecheck` and `npm run lint`, and keep the full check for the end.
- When a request bundles independent fixes, treat each as its own step: finish one, run format and check, hand it over with its commit message, and wait before starting the next. Don't mix items in the working tree.
- **Regenerated files in multi-step plans.** The build step of `npm run check` rewrites the bundle-size line in `README.md`, `assets/bundle-treemap.svg`, and, when imports between modules change, `assets/dependency-graph.svg`. Leave them out of each step: after the check, run `git restore --staged --worktree README.md assets/bundle-treemap.svg assets/dependency-graph.svg`, but only when the README diff is just that line. Regenerate them once in the plan's final step. For a single standalone change, include them with the change.
- **Comparison reports show measurements only.** `schema-compare` and similar reports contain screenshots, diffs and numbers, ideally against the baseline, all generated from the run's data. No hand-written findings, causes or fix suggestions in the report: those go in chat or a separate to-do list.
- Generated output for a developer goes under `.cache/`. Build artifacts go to `release/`. Scripts never write next to their source.

## Conventions enforced by tests

- **No import cycles**, at module or directory level (`src/import-graph.test.ts`, runtime imports only).
- **Cross directories through the barrel.** Import `../options/index.js`, not a file inside it. If the barrel lacks the module, re-export it there. Children reaching up (`shortbread/layers/*.ts` to `../context.js`) and test files are out of scope.
- **Kebab-case file names** in `src/`, `scripts/` and `dev/`: `guessStyle` lives in `guess-style.ts`.
- **Every public type must be nameable.** `check-exports` fails if a public signature mentions a type the entries don't export.
- **The CDN bundle has a gzip ceiling** (`GZIP_CEILING` in `scripts/browser-bundle.e2e.test.ts`). Lower it when the bundle shrinks, and don't raise it to get past an accidental import.
- **Styles are validated against two specs**: the installed one, and `maplibre-gl-style-spec-min`, pinned to what MapLibre 5.5.0 ships. That alias holds the `maplibre-gl >=5.5.0` peer range true, so it's excluded from `npm run upgrade`. Change it only together with the peer range.
- **Style snapshots cover shape only** (layer ids and types, source keys). A paint change passes them, so use `npm run compare -- --baseline` to see it.
- **Unit tests are offline.** `vitest.setup.ts` stubs global `fetch` with canned TileJSON, keyed on the URL containing `/osm/`.

## Non-obvious design decisions

- **Anything reachable from `src/exports.ts` lands in the CDN bundle.** That's why each extra schema has its own subpath, and why `guessStyle` takes `schemas: [omt]` instead of importing them. The CDN bundle is Shortbread only.
- **Don't edit `src/themes/tables.ts`.** Tune derived themes in `scripts/config/themes.ts` and lookalikes in `scripts/config/lookalikes.ts`, or change `colorful.ts`, then run `generate-themes`. Review the result as a diff.
- **Adding a subpath** touches `package.json` `exports`, `ENTRIES` in `rollup.config.js`, in `scripts/check-exports.ts` and in `scripts/lib/import-graph.ts`, plus the aliases in `vite.config.ts` and `scripts/ci/smoke.mjs`.
- **Removing or renaming an option** needs a hint in `src/options/parts/v5-hints.ts`, so the unknown-key error names the replacement. The names are off by one: `v6Hint` covers what v7 removed, `v7Hint` what was renamed after 7.0.0. `rollup.config.js` stubs this module for the CDN bundle, so a new hint function must also be added to `stubV5Hints`, or the browser build breaks.
- **`extras` and `icons` sprite names are a public, add-only API**: never rename or remove them. `public-sprites.test.ts` compares them with the list in `SPRITES.md` and rejects duplicates against `base`, with no exception list. `base:*` names are internal. New icons also need a `title`.
- **SVG filenames keep their upstream spelling.** Sprite names are mapped to files in `scripts/config/icons-*.ts`.
- **`prepack` only runs `build-node`.** The tarball ships `dist/` plus three docs, so don't add anything to it that renders, fetches or rewrites tracked files.
- **Light.** One `light` option drives hillshade, 3D buildings and the globe atmosphere, default direction 315°, altitude 45°. MapLibre's atmosphere reads the light differently from fill-extrusion, so `src/features/light.ts` writes a compensated position at globe zooms and the true one from the zoom buildings appear. Don't "simplify" this. A lit hillshade uses method `combined`, because `standard` ignores the altitude.

## API pitfalls for consumers

Check these before writing or reviewing code that uses this library.

- **`inlineSources` is required in practice.** `osm()` and `satellite()` are synchronous and do no I/O, so sources stay `{ type, url }`. VersaTiles TileJSONs list relative tile URLs, and MapLibre then fails with "not a valid URL" and draws nothing. `await inlineSources(style)` also keeps attribution and translates `tile_format`, `tile_schema` and `tile_size`, which MapLibre doesn't read. This is what makes examples need `async` or `<script type="module">`.
- **Pass `urls.base` explicitly** unless the page's own origin serves `/tiles`, `/assets/glyphs` and `/assets/sprites`. It defaults to `location.origin`. It falls back to `tiles.versatiles.org` only when there's no usable origin: Node, or `"null"` in a srcdoc iframe or on `file://`. So code can work in a preview or in Node and break once pasted into a real page. The default is read once, at module load.
- **Unknown option keys throw**, and so do out-of-range numbers, except in `guessStyle`, which never throws and returns a blank style. Keys set to `undefined` are ignored.
- **Lit by default since v7.** `light: false` restores the unlit look. `style.light` is written only if buildings or a visible atmosphere read it, so turning on `building-3d` at runtime also needs the light added. `light` replaced `sun`, and `light.fixedToScreen` replaced `hillshade.anchor` and `light.rotateWithMap` (with the opposite meaning).
- **MapLibre GL JS 5.5+ is required**, because a lit hillshade writes properties older versions reject. A `<script>` tag bypasses the npm peer check.
- **The default projection is `globe`**, and the style carries its own root `sky`. Native and server renderers draw Mercator, so browser and server renders differ. Any string passes spec validation for `projection.type`.
- **Rebuilt styles need `map.setStyle(style, { diff: false })`.** With diffing, already parsed tiles keep their old buckets and layers can stay invisible.
- **Only the `base` sprite sheet loads by default.** To use `extras` or `icons`, list all wanted sheets in `urls.sprite`, including `base`. `base:*` ids can change in any release.
- **The CDN bundle is smaller than npm.** `osm.minimizeOptions`, `osm.toCode`, `osm.validateOptions`, the font-discovery helpers, `randomColor`, `isDarkPalette` and the TileJSON validators are npm-only. The hosted bundle (`https://tiles.versatiles.org/assets/lib/versatiles-style/versatiles-style.js`) can also lag `main`, so check that it exports what you need.
- **OpenMapTiles or Protomaps tilesets rendering as flat translucent blobs** means `guessStyle` fell back to the inspector style: its `schemas` option is missing. `protomaps()` has no default source, and `inlineSources` leaves `pmtiles://` URLs alone.
- **`inlineSources` rejects a TileJSON that doesn't match the source type**, such as a vector source without `vector_layers`.

## Pitfalls in this repo

- `npm run check` can leave `README.md` and `assets/*.svg` modified. That's expected, not stray work.
- `doc-insert` pads the README tables, which is why `doc` ends with `format`. Don't edit the generated `### Bundle Composition` and `### Dependency Graph` sections by hand.
- The dev toolchain needs Node >= 22.12, but the published package promises >= 20. Code reachable from `src/` must run on Node 20; the `package-smoke` CI job tests the packed tarball on 20 through 26.
- `dev/.tiles/` is an expensive tile cache, separate from `.cache/`. Don't clear it casually.
- A `compare` baseline goes stale as commits land, and it then reports every change since it was saved. Save a fresh one right before the change you're checking.
- `schema-compare/baseline.json` is tracked: it's the accepted result. Update it with `--save-baseline` only when the change is meant to shift those scores.
