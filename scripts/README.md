# `scripts/`

Everything here is development tooling. None of it ships — the published package is `dist/`, built
from `src/`.

Run each script through its `npm run` alias rather than `tsx` directly; the aliases in
`package.json` are what CI uses, and a few pass flags the script needs.

## Where output goes

Scripts never write next to their own source. Everything generated — renders, reports, downloaded
styles, sampled tiles — lands under **`.cache/`** at the repository root, which is gitignored in
full. To start clean:

```sh
rm -rf .cache
```

The one exception is a script whose job is to write source: `generate-themes` rewrites
`src/themes/tables.ts`, and `vendor-schema --write` rewrites `src/*/schema.ts`. Both are meant to
be reviewed as a diff.

The shared tile cache used by the rendering scripts lives in `dev/.tiles/` and is separate,
because it is expensive to refill — see `lib/tile-cache.ts`.

## Build

Run by `npm run build`; you rarely invoke these by hand.

| Script              | Alias                         | Does                                                                             |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `build-styles.ts`   | `build-styles`                | Bundles every style variant into `release/styles.tar.gz`.                        |
| `build-sprites.ts`  | `build-sprites`               | Packs `icons/` into sprite sheets under `release/sprites/`.                      |
| `icons-report.ts`   | `icons-report`, `doc-sprites` | Renders the icon overview; `--public` writes `docs/sprites.html`.                |
| `bundle-treemap.ts` | `doc-bundle`                  | Attributes every byte of the browser bundle to a source file, via the sourcemap. |
| `screenshots.ts`    | `doc-screenshots`             | Renders the style previews used in the README.                                   |

## Checks

Run by `npm run check` and in CI.

| Script             | Alias           | Does                                                                           |
| ------------------ | --------------- | ------------------------------------------------------------------------------ |
| `check-exports.ts` | `check-exports` | Fails if a public signature names a type the entry points do not export.       |
| `ci/smoke.mjs`     | `smoke`         | Installs the packed tarball in a temp dir and imports it, as a consumer would. |
| `schema-gate.ts`   | `schema-gate`   | Reports what a prospective tileset schema could not carry.                     |

The `*.test.ts` files alongside these run under `npm test` with the rest of the suite — the
`*.e2e.test.ts` ones only under `npm run test:e2e`, since they render or hit the network.

## Schemas

The package draws its cartography from three tileset schemas (Shortbread, OpenMapTiles,
Protomaps). These tools are how a schema's record gets written and kept honest.

| Script             | Alias           | Does                                                                                                                         |
| ------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `vendor-schema.ts` | `vendor-schema` | Derives a schema record from live TileJSON. `--write` updates `src/*/schema.ts`, `--check` asks whether it is still current. |
| `schema-values.ts` | `schema-values` | Samples real tiles to show which _values_ a field actually carries — what TileJSON cannot tell you. Needs network.           |
| `schema-gate.ts`   | `schema-gate`   | Scores how much of the cartography a schema can express, before any rendering.                                               |

## Comparing renders

Three separate questions, three tools — the names are close, the jobs are not.

| Script                      | Alias             | Answers                                                                                                                                 |
| --------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `compare/compare.ts`        | `compare`         | Did a change alter a style's **properties**? Diffs the working tree against published v5, or against a saved baseline. No rendering.    |
| `schema-compare/compare.ts` | `schema-compare`  | Do the three **schemas** draw the same place the same way? Renders and scores them side by side against `schema-compare/baseline.json`. |
| `migrate-compare.ts`        | `migrate-compare` | How close does `guessOptions` get on a **foreign** style? Renders each style next to its migration.                                     |

`compare` is the one to reach for around a styling change:

```sh
npm run compare -- --save-baseline   # before
npm run compare -- --baseline        # after — every altered property, listed
```

## Theming

| Script               | Alias             | Does                                                                                                                  |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `generate-themes.ts` | `generate-themes` | Regenerates the nine derived themes from `colorful` into `src/themes/tables.ts`. `--dry-run` lists what would change. |
| `extract-palette.ts` | `extract-palette` | Pulls an area-colour palette out of an existing OpenMapTiles style, as a paste-ready object.                          |

Three files, split by what changes for what reason:
[`config/themes.ts`](./config/themes.ts) is what the themes should look like — settings, fixes and
overrides, the only file to edit when tuning; [`lib/theme-types.ts`](./lib/theme-types.ts) is what
each of those settings means; [`lib/theme-generator.ts`](./lib/theme-generator.ts) is the derivation
that turns one into the other. `colorful` itself is hand-written in `src/themes/colorful.ts` and is
never generated — change a colour there and all nine derived themes follow.

## Icons

| Script                | Alias              | Does                                                                          |
| --------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `icons-provenance.ts` | `icons-provenance` | Checks that every icon sits in the source folder it claims to come from.      |
| `icons-report.ts`     | `icons-report`     | Renders every icon with its name on each sheet and the file it is drawn from. |

Which icons end up on which sheet is configured in [`config/sprites.ts`](./config/sprites.ts).

## Directories

| Directory                     | Holds                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/`                        | Shared modules — tile cache, native rendering, sprite packing, PMTiles and MVT readers, theme generation, output paths. Imported, never run.        |
| `config/`                     | Data tables the scripts read: icon sets, sprite sheets, schema mappings, theme settings.                                                            |
| `compare/`, `schema-compare/` | The two comparison tools, one module per concern. `schema-compare/baseline.json` is tracked — it is the accepted result each run is judged against. |
| `ci/`                         | Plain ESM run by bare `node` in CI, outside the TypeScript project.                                                                                 |
