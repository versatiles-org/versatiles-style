# Sprite sheets

VersaTiles Style ships its icons as **two separate sprite sheets**. They are built from the SVGs
under [`icons/`](./icons) by [`scripts/build-sprites.ts`](./scripts/build-sprites.ts) (configured in
[`scripts/config-sprites.ts`](./scripts/config-sprites.ts)) and served at
`…/assets/sprites/<sheet>/sprites{,@2x,@3x,@4x}.{png,json}`.

MapLibre loads any number of sprite sources, each under its own `id`, so a reference is written as
`` `<sheet>:<group>-<name>` `` (e.g. `base:icon-cafe`, `extras:symbol-star`).

| Sheet    | Loaded by default | Stability                         | Purpose                                                          |
| -------- | ----------------- | --------------------------------- | ---------------------------------------------------------------- |
| `base`   | ✅ yes            | **internal** — may change anytime | Everything the style needs to draw a Shortbread map              |
| `extras` | ❌ opt-in         | **public API — add-only**         | Extra icons you can place on the map yourself (pins, symbols, …) |

## `base` — internal

`base` is an implementation detail of the map style. The style references it directly (POI icons,
road markings, fill patterns, transport symbols), and its default sprite entry is:

```js
sprite: [{ id: 'base', url: '/assets/sprites/base/sprites' }];
```

**Do not rely on `base:*` icon names in your own layers.** They exist to serve the style and may be
renamed, added, or removed with any release.

## `extras` — public API (add-only)

`extras` is a curated, standalone sheet of general-purpose icons — map pins, geometric symbols,
arrows, and assorted pictograms — meant for **you** to reference from your own layers (custom
markers, annotations, etc.). It is **not** loaded by default; opt in by listing it alongside `base`:

```js
import { osm } from '@versatiles/style';

const style = await osm({
  urls: {
    sprite: [
      { id: 'base', url: '/assets/sprites/base/sprites' },
      { id: 'extras', url: '/assets/sprites/extras/sprites' },
    ],
  },
});

// then, in a custom layer:
// { "type": "symbol", "layout": { "icon-image": "extras:symbol-star" } }
```

### Stability guarantee

`extras` is a **public API**. Because downstream maps reference these names directly:

- **Add-only.** Icon names are only ever **added** — never renamed or removed. An existing
  `extras:<group>-<name>` will keep resolving in future releases.
- **Public domain.** All icons are **CC0-1.0**, so they are safe to use without attribution.
- **Documented.** The full set below is the contract; the
  [`extras-api` test](./scripts/extras-api.test.ts) fails if this list and the built sprite ever
  disagree, so the two cannot drift apart.

> Adding an icon? Add the SVG under `icons/<group>/`, list its name in
> `scripts/config-sprites.ts` under `spritesheets.extras`, **and** add it to the list below in the
> same change. Removing or renaming an `extras` icon is a breaking change — avoid it.

### Icon list

#### `icon` group

`extras:icon-animal_shelter` · `extras:icon-aquarium` · `extras:icon-bbq` · `extras:icon-beach` ·
`extras:icon-entrance1` · `extras:icon-heart` · `extras:icon-home` · `extras:icon-information` ·
`extras:icon-karaoke` · `extras:icon-mountain` · `extras:icon-mushroom` · `extras:icon-music` ·
`extras:icon-park` · `extras:icon-park1` · `extras:icon-roadblock` · `extras:icon-rocket` ·
`extras:icon-water`

#### `symbol` group

`extras:symbol-arrow` · `extras:symbol-arrow1` · `extras:symbol-arrow2` · `extras:symbol-circle` ·
`extras:symbol-circle_outline` · `extras:symbol-cross` · `extras:symbol-cross_outline` ·
`extras:symbol-diamond` · `extras:symbol-diamond_outline` · `extras:symbol-hexagon` ·
`extras:symbol-hexagon_outline` · `extras:symbol-marker` · `extras:symbol-marker_outline` ·
`extras:symbol-square` · `extras:symbol-square_outline` · `extras:symbol-star` ·
`extras:symbol-star_outline` · `extras:symbol-triangle` · `extras:symbol-triangle_outline` ·
`extras:symbol-x` · `extras:symbol-x_outline`
