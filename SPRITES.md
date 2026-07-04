# Sprite sheets

VersaTiles Style ships its icons as **two separate sprite sheets**. They are built from the SVGs
under [`icons/`](./icons) by [`scripts/build-sprites.ts`](./scripts/build-sprites.ts) (configured in
[`scripts/config-sprites.ts`](./scripts/config-sprites.ts)) and served at
`…/assets/sprites/<sheet>{,@2x}.{png,json}`.

MapLibre loads any number of sprite sources, each under its own `id`, so a reference is written as
`` `<sheet>:<group>-<name>` `` (e.g. `base:icon-cafe`, `extras:symbol-star`). The source SVGs mirror
that grammar on disk — each lives at `icons/<sheet>/<group>/<name>.svg` — so a reference maps
directly to a file (and `config-sprites.ts` maps 1:1 to the folder tree).

| Sheet    | Loaded by default | Stability                         | Purpose                                                          |
| -------- | ----------------- | --------------------------------- | ---------------------------------------------------------------- |
| `base`   | ✅ yes            | **internal** — may change anytime | Everything the style needs to draw a Shortbread map              |
| `extras` | ❌ opt-in         | **public API — add-only**         | Extra icons you can place on the map yourself (pins, symbols, …) |

## `base` — internal

`base` is an implementation detail of the map style. The style references it directly (POI icons,
road markings, fill patterns, transport symbols), and its default sprite entry is:

```js
sprite: [{ id: 'base', url: '/assets/sprites/base' }];
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
      { id: 'base', url: '/assets/sprites/base' },
      { id: 'extras', url: '/assets/sprites/extras' },
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

> Adding an icon? Add the SVG under `icons/extras/<group>/`, list its name in
> `scripts/config-sprites.ts` under `spritesheets.extras`, **and** add it to the list below in the
> same change. Removing or renaming an `extras` icon is a breaking change — avoid it.

### Icon list

#### `icon` group

`extras:icon-animal_shelter` · `extras:icon-aquarium` · `extras:icon-bbq` · `extras:icon-beach` ·
`extras:icon-entrance` · `extras:icon-heart` · `extras:icon-home` · `extras:icon-information` ·
`extras:icon-karaoke` · `extras:icon-mountain` · `extras:icon-mushroom` · `extras:icon-music` ·
`extras:icon-park` · `extras:icon-park2` · `extras:icon-roadblock` · `extras:icon-rocket` ·
`extras:icon-water`

#### `symbol` group

`extras:symbol-arrow` · `extras:symbol-arrow2` · `extras:symbol-arrow3` · `extras:symbol-circle` ·
`extras:symbol-circle_outline` · `extras:symbol-cross` · `extras:symbol-cross_outline` ·
`extras:symbol-diamond` · `extras:symbol-diamond_outline` · `extras:symbol-hexagon` ·
`extras:symbol-hexagon_outline` · `extras:symbol-marker` · `extras:symbol-marker_outline` ·
`extras:symbol-square` · `extras:symbol-square_outline` · `extras:symbol-star` ·
`extras:symbol-star_outline` · `extras:symbol-triangle` · `extras:symbol-triangle_outline` ·
`extras:symbol-x` · `extras:symbol-x_outline`

## Naming convention

Every icon name — in **all** sheets and groups — follows one convention. It keeps names
predictable and greppable, and it fits the reference grammar `<sheet>:<group>-<name>`.

1. **Characters.** Lowercase ASCII only: `a`–`z`, `0`–`9`, `_`. No uppercase, spaces, or hyphens
   inside a name. (The `-` in a reference separates the group from the name; it never appears
   _within_ a name.)
2. **Words are `snake_case`.** Separate every word with a single underscore — `fire_station`,
   `vending_machine`, `ice_rink`. Never run words together (`firestation`) and never double an
   underscore.
3. **Shape: `subject[_qualifier…][_modifier…]`.** Lead with the thing depicted, narrow it, then add
   variant modifiers as trailing suffixes: `rail_metro`, `hatched_thin`, `star_outline`.
4. **Name what it depicts, not where it's used.** Name the object, not the map feature or OSM tag
   that references it, so an icon can be reused (`bed`, not `hotel`).
5. **Variants.** There are two kinds:
   - **A describable difference → a descriptive suffix.** When versions differ along a nameable
     axis, encode it so the name carries meaning: fill — `_outline`; size — `_small`, `_large`;
     direction — `_left`, `_right`, `_up`, `_down`. Prefer this whenever an axis exists
     (`star` vs. `star_outline`).
   - **Arbitrary alternates → a number.** When versions are just different drawings of the same
     thing with no nameable axis, number them: the canonical one is **unnumbered** and alternates
     start at **2** — `arrow`, `arrow2`, `arrow3` (never a redundant `arrow` _and_ `arrow1`).
     Append the digit directly (`arrow2`, not `arrow_2`). Numbers are **stable**: a new drawing
     takes the next free number and existing ones are never renumbered, and never leave an orphan
     number (an `entrance1` with no `entrance`). This stays open for adding more versions later.
6. **Spell it out; American English.** Prefer full words over abbreviations and use US spelling
   (`theater`, `center`, `gray`). The only accepted abbreviations are near-universal ones: `atm`,
   `bbq`.
7. **Singular** unless the subject is inherently plural (`toilet`, not `toilets`).
8. **Don't repeat the group.** The group already namespaces the icon: `icon-restaurant`, not
   `icon-restaurant_icon`.

| ✅ good           | ❌ avoid         | rule                        |
| ----------------- | ---------------- | --------------------------- |
| `fire_station`    | `firestation`    | separate words (2)          |
| `vending_machine` | `vendingmachine` | separate words (2)          |
| `star_outline`    | `star2`          | modifier, not a number (5)  |
| `theater`         | `theatre`        | US spelling (6)             |
| `drinking_water`  | `water1`         | describe the subject (4, 5) |

### Known deviations (pre-convention)

None — every icon in both sheets follows the convention. (Icon _names_ are American English; the
OSM tag _values_ they match on, e.g. `theatre` or `garden_centre`, keep OSM's own spelling.)
