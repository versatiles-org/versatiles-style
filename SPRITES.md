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

### What belongs in `extras`

`extras` holds what **you** place on the map; `base` holds what the **style** draws. So an icon
belongs in `extras` only if `base` does not already have it — the two sheets never carry the same
icon twice. Duplicating one would add bytes to an opt-in sheet and leave a reader guessing which of
the two sheets the icon they want actually lives in.

That rule is enforced, not just stated: the [`extras-api` test](./scripts/extras-api.test.ts) fails
on any `extras` name that also exists in `base`. Two names predate it — `extras:symbol-arrow`
(against `base:marking-arrow`) and `extras:icon-information` (against `base:transport-information`)
— and are grandfathered in the test. Both are defensible as different drawings for different jobs,
and add-only means neither can be withdrawn; the list is not a place to wave through new icons.

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

#### `pin` group

Map markers, drawn on a 24×30 source so the tip sits **on** the bottom edge. Place them with
`icon-anchor: "bottom"` and the point lands on the coordinate; every other group is centered.

`extras:pin-pin` · `extras:pin-pin_dot` · `extras:pin-pin_hole` · `extras:pin-pin_outline`

> `extras:symbol-marker` and `extras:symbol-marker_outline` predate this group and are not going
> anywhere — names are add-only, so they will keep resolving. They are drawn tip-on-the-bottom-edge
> too, so `icon-anchor: "bottom"` works for them exactly as it does here. The difference is
> proportion: a square 22×22 canvas makes them squatter (39.5° at the tip against this group's
> 34.6°, head 78% of the width against 88%), which leaves less room in the head for a glyph. Both
> are good markers — reach for `pin` when you want the headroom, and for the taller silhouette.

## Authoring an icon

**Grid.** New icons are drawn on a **24×24** canvas — pins on **24×30**. Older sources sit on a
15×15 grid (the Maki-derived ones) or on 29.1042 (the hand-drawn symbols); they render correctly and
are left alone, so the repo carries more than one authoring grid on purpose. Anything new, and
anything redrawn, uses 24.

**The `width` and `height` attributes are what the build reads** — not the `viewBox`.
`Sprite.fromIcons` takes the group's `size` as the rendered _height_ and derives the width from the
source's aspect ratio:

```
width = round(size × w0 / h0)
```

So the `pin` group's `size: 28` and a 24×30 source give `round(28 × 24/30)` = **22×28**. A source at
the wrong aspect ratio does not fail the build — it just lands a pixel or two off. `config-sprites.test.ts`
asserts the pin geometry and that every icon within a group agrees on one rendered size.

**One color.** Every icon in both sheets is packed as SDF (`"sdf": true`), so an icon is a single
silhouette that MapLibre recolors via `icon-color`. There is no way to bake two colors into one
image — see below for what to do instead.

### Two-color markers

Because an SDF icon is one color, "a dark glyph on a colored pin" is two symbol layers, not one
image. `extras:pin-pin_hole` is a pin with a circular well knocked out of the head, so whatever you
draw underneath shows through in its own color:

```js
// 1 — the pin body, tip on the coordinate
{
  type: 'symbol',
  layout: { 'icon-image': 'extras:pin-pin_hole', 'icon-anchor': 'bottom', 'icon-allow-overlap': true },
  paint: { 'icon-color': '#E9AC77' },
}
// 2 — the glyph, centered in the well
{
  type: 'symbol',
  layout: {
    'icon-image': 'extras:icon-mountain',
    'icon-offset': [0, -17.3], // well center sits 17.3 px above the tip
    'icon-size': 0.55,         // the well is 12.8 px across; a 22 px glyph needs scaling down
    'icon-allow-overlap': true,
  },
  paint: { 'icon-color': '#333344' },
}
```

Both numbers come off the geometry above and hold at `icon-size: 1` on layer 1: the head center is
`28 − 11.5 × (28/30)` = 17.3 px above the tip, and the well is `2 × 7 × (22/24)` = 12.8 px wide.

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
   - **A depicted digit → an underscore.** When the number is part of the _picture_ rather than a
     way of telling two drawings apart, separate it: `pin_1` is a pin with a **1** on it, while
     `pin2` would be a second drawing of a plain pin. The underscore is the whole difference
     between the two, so it is load-bearing — never write a badge as `pin1` or an alternate as
     `pin_2`.
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

## Migrating sprite ids from v5

The sheet was renamed `basics` → `base`, and the old path
`/assets/sprites/basics/sprites` is **no longer published**. Most ids carried over unchanged, so
`basics:icon-cafe` becomes `base:icon-cafe`.

Twenty-two ids were also renamed or split, and those need more than a prefix swap. Each mapping
below is the icon the v6 style actually uses for the same OSM feature, read out of the generated
style rather than guessed:

| v5 `basics:` id         | v6 `base:` id                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `icon-beer`             | `icon-beer_mug`                                                                                                                                                                                                          |
| `icon-beergarden`       | `icon-beer_mug`                                                                                                                                                                                                          |
| `icon-chemist`          | `icon-tube_and_toothbrush`                                                                                                                                                                                               |
| `icon-dog_park`         | `icon-dog`                                                                                                                                                                                                               |
| `icon-doityourself`     | `icon-do_it_yourself`                                                                                                                                                                                                    |
| `icon-drycleaning`      | `icon-dry_cleaning`                                                                                                                                                                                                      |
| `icon-garden_centre`    | `icon-garden_center`                                                                                                                                                                                                     |
| `icon-hairdresser`      | `icon-scissors_and_comb`                                                                                                                                                                                                 |
| `icon-huntingstand`     | `icon-hunting_stand`                                                                                                                                                                                                     |
| `icon-icerink`          | `icon-ice_rink`                                                                                                                                                                                                          |
| `icon-jewelry_store`    | `icon-ring`                                                                                                                                                                                                              |
| `icon-kiosk`            | `icon-newspaper`                                                                                                                                                                                                         |
| `icon-nursinghome`      | `icon-nursing_home`                                                                                                                                                                                                      |
| `icon-pharmacy`         | `icon-pill`                                                                                                                                                                                                              |
| `icon-playground`       | `icon-seesaw`                                                                                                                                                                                                            |
| `icon-police`           | `icon-police_officer`                                                                                                                                                                                                    |
| `icon-theatre`          | `icon-theater`                                                                                                                                                                                                           |
| `icon-toilet`           | `icon-restrooms`                                                                                                                                                                                                         |
| `icon-toys`             | `icon-rocking_horse`                                                                                                                                                                                                     |
| `icon-vendingmachine`   | `icon-vending_machine`                                                                                                                                                                                                   |
| `icon-waterpark`        | `icon-water_park`                                                                                                                                                                                                        |
| `icon-place_of_worship` | **split by religion** — `icon-latin_cross`, `icon-star_and_crescent`, `icon-star_of_david`, `icon-dharma_wheel`, `icon-om`, `icon-khanda`, `icon-yin_yang`, or `icon-person_kneeling_and_praying` for an unspecified one |

`icon-pub` now uses `icon-pint_glass` while `icon-biergarten` uses `icon-beer_mug`; in v5 both drew
`icon-beer`.
