# Sprite sheets

VersaTiles Style ships its icons as **two separate sprite sheets**. They are built from the SVGs
under [`icons/`](./icons) by [`scripts/build-sprites.ts`](./scripts/build-sprites.ts) (configured in
[`scripts/config-sprites.ts`](./scripts/config-sprites.ts)) and served at
`…/assets/sprites/<sheet>{,@2x}.{png,json}`.

MapLibre loads any number of sprite sources, each under its own `id`, so a reference is written as
`` `<sheet>:<group>-<name>` `` (e.g. `base:icon-cafe`, `extras:shape-star`).

**Sprite names and filenames are decoupled.** The SVGs under [`icons/`](./icons) are organized by
**provenance**, not by sheet, and keep their upstream filename — `base:icon-alcohol_shop` is drawn
from `icons/maki/alcohol-shop.svg`, hyphen and all. Which file backs which sprite name is declared
in [`scripts/config-sprites.ts`](./scripts/config-sprites.ts), and that file is the index: run
`npm run icons-report` for a rendered overview of every icon, its sprite ids and its source.

| folder              | what it holds                                                             |
| ------------------- | ------------------------------------------------------------------------- |
| `icons/maki/`       | [Maki](https://github.com/mapbox/maki), CC0 — upstream filenames          |
| `icons/temaki/`     | [Temaki](https://github.com/rapideditor/temaki), CC0 — upstream filenames |
| `icons/versatiles/` | drawn for this project                                                    |
| `icons/unknown/`    | provenance not yet established — see `icons/unknown/source.json`          |

Each folder carries a `source.json` recording the upstream repo, the version we took icons from,
and the license. Keeping upstream filenames is what makes it answerable whether we already hold a
given icon, and what it was called where it came from — renaming on download destroys both.

Those folders are a claim about origin, so `npm run icons-provenance` checks it: it fetches the
upstream releases, indexes every 40-character window of their path data, and reports any icon filed
under `maki/` or `temaki/` that is not found there, or any upstream artwork sitting in
`versatiles/`. Exact equality deliberately is **not** the test — it misses edited imports, and two
icons here (`bus` and `tram`) turned out to be Temaki artwork with one detail redrawn, sharing 192
and 363 characters while matching nothing under equality.

`versatiles/` is identified by a second signal: icons drawn for this project carry a hand-added
`<metadata id="license">` block declaring CC0, which Maki imports never do because they arrive CC0
already. `icons/versatiles/source.json` records how that was measured.

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
// { "type": "symbol", "layout": { "icon-image": "extras:shape-star" } }
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
on any `extras` name that also exists in `base`, with **no exception list** — one would quietly
become the place duplicates go. Two names collided before v6 shipped and both were resolved rather
than waved through: the extras `icon-information` was dropped (`base` already draws an "i"), and
`base:marking-arrow` was renamed `base:marking-oneway`, which is what it actually marks.

> Adding an icon? Put the SVG under `icons/<source>/` keeping its upstream filename, map a sprite
> name to it in `scripts/config-sprites.ts` under `spritesheets.extras`, **and** add that name to
> the list below in the same change. Removing or renaming an `extras` icon is a breaking change —
> avoid it.

### Icon list

#### `icon` group

Pictograms — things you can point at. Vehicles and street furniture the style itself never draws,
plus weather and hazard marks, so a transit tracker, a charging-price map or a storm feed can label
its own features without shipping a sheet.

`extras:icon-ambulance` · `extras:icon-anchor` · `extras:icon-apartment` · `extras:icon-avalanche` ·
`extras:icon-ballot_box` · `extras:icon-battery` · `extras:icon-bbq` · `extras:icon-beach` ·
`extras:icon-bee` · `extras:icon-bicycle` · `extras:icon-binoculars` · `extras:icon-bird` ·
`extras:icon-bookmark` · `extras:icon-bridge` · `extras:icon-building` · `extras:icon-buoy` ·
`extras:icon-bus_stop` · `extras:icon-butterfly` · `extras:icon-cable_car` ·
`extras:icon-calculator` · `extras:icon-calendar` · `extras:icon-camera` · `extras:icon-car` ·
`extras:icon-cat` · `extras:icon-charging_station` · `extras:icon-child` · `extras:icon-clock` ·
`extras:icon-cloud` · `extras:icon-cloud_sun` · `extras:icon-co2` · `extras:icon-coin` ·
`extras:icon-compass` · `extras:icon-conifer` · `extras:icon-cow` · `extras:icon-crane` ·
`extras:icon-credit_card` · `extras:icon-dam` · `extras:icon-deer` · `extras:icon-dollar` ·
`extras:icon-download` · `extras:icon-droplet` · `extras:icon-eclipse` · `extras:icon-euro` ·
`extras:icon-eye` · `extras:icon-factory` · `extras:icon-family` · `extras:icon-fence` ·
`extras:icon-ferry` · `extras:icon-filter` · `extras:icon-fire` · `extras:icon-fire_truck` ·
`extras:icon-first_aid` · `extras:icon-fish` · `extras:icon-flood` · `extras:icon-flower` ·
`extras:icon-fog` · `extras:icon-footprint` · `extras:icon-globe` · `extras:icon-guitar` ·
`extras:icon-headphones` · `extras:icon-heat_pump` · `extras:icon-helicopter` ·
`extras:icon-helping_hand` · `extras:icon-horse_riding` · `extras:icon-hot_air_balloon` ·
`extras:icon-house` · `extras:icon-key` · `extras:icon-layers` · `extras:icon-leaf` ·
`extras:icon-lifebuoy` · `extras:icon-lightning` · `extras:icon-link` · `extras:icon-lock` ·
`extras:icon-mail` · `extras:icon-megaphone` · `extras:icon-microphone` · `extras:icon-moon` ·
`extras:icon-motorcycle` · `extras:icon-mountain` · `extras:icon-museum` · `extras:icon-mushroom` ·
`extras:icon-music` · `extras:icon-no_entry` · `extras:icon-nuclear` · `extras:icon-palette` ·
`extras:icon-parking` · `extras:icon-paw` · `extras:icon-pedestrian` · `extras:icon-person` ·
`extras:icon-play` · `extras:icon-plug` · `extras:icon-police_car` · `extras:icon-power_plant` ·
`extras:icon-power_pole` · `extras:icon-price_tag` · `extras:icon-quay` · `extras:icon-radiation` ·
`extras:icon-radiator` · `extras:icon-rain` · `extras:icon-rainbow` · `extras:icon-raised_fist` ·
`extras:icon-receipt` · `extras:icon-rocket` · `extras:icon-roundabout` · `extras:icon-ruler` ·
`extras:icon-sailboat` · `extras:icon-scooter` · `extras:icon-scuba_diver` · `extras:icon-search` ·
`extras:icon-share` · `extras:icon-shield` · `extras:icon-siren` · `extras:icon-skyscraper` ·
`extras:icon-snowflake` · `extras:icon-solar_panel` · `extras:icon-speaker` ·
`extras:icon-speech_bubble` · `extras:icon-stamp` · `extras:icon-sun` · `extras:icon-surfer` ·
`extras:icon-taxi` · `extras:icon-thermometer` · `extras:icon-ticket` · `extras:icon-tornado` ·
`extras:icon-traffic_light` · `extras:icon-tree` · `extras:icon-truck` · `extras:icon-tunnel` ·
`extras:icon-umbrella` · `extras:icon-van` · `extras:icon-warehouse` · `extras:icon-warning` ·
`extras:icon-wave` · `extras:icon-whale` · `extras:icon-wheelchair` · `extras:icon-wifi` ·
`extras:icon-wind` · `extras:icon-wind_turbine`

#### `pattern` group

Tileable fills for `fill-pattern`, so you can hatch or stipple your own polygons rather than relying
on colour alone. Every tile wraps seamlessly in both directions.

These are the one part of the sheet that is **not** SDF: MapLibre cannot recolour a fill pattern, so
they render as drawn rather than following `icon-color`. `base` carries its own diagonal and
horizontal line fills; these five are the ones it does not have.

```js
{ type: 'fill', paint: { 'fill-pattern': 'extras:pattern-crosshatch' } }
```

`extras:pattern-checker` · `extras:pattern-crosshatch` · `extras:pattern-dots` · `extras:pattern-grid` · `extras:pattern-zigzag`

#### `pin` group

Map markers, drawn on a 24×30 source so the tip sits **on** the bottom edge. Place them with
`icon-anchor: "bottom"` and the point lands on the coordinate; icons in every other group are
centered on it.

Two silhouettes, named for their shape: `teardrop` tapers smoothly from head to point, `balloon` is
a round head on a narrow neck. `teardrop_1`–`teardrop_9` carry a numeral knocked out of the head, so
a numbered marker needs no second layer.

`extras:pin-balloon` · `extras:pin-balloon_outline` · `extras:pin-teardrop` ·
`extras:pin-teardrop_1` · `extras:pin-teardrop_2` · `extras:pin-teardrop_3` ·
`extras:pin-teardrop_4` · `extras:pin-teardrop_5` · `extras:pin-teardrop_6` ·
`extras:pin-teardrop_7` · `extras:pin-teardrop_8` · `extras:pin-teardrop_9` ·
`extras:pin-teardrop_dot` · `extras:pin-teardrop_hole` · `extras:pin-teardrop_outline`

#### `shape` group

Pure geometry, every one a filled/outlined pair at one optical size. Encode a categorical series
by silhouette rather than by colour alone — which is also the accessible way to do it — and the
outline variants stay legible over imagery.

`extras:shape-circle` · `extras:shape-circle_outline` · `extras:shape-cross` ·
`extras:shape-cross_outline` · `extras:shape-diamond` · `extras:shape-diamond_outline` ·
`extras:shape-drop` · `extras:shape-drop_outline` · `extras:shape-heart` ·
`extras:shape-heart_outline` · `extras:shape-hexagon` · `extras:shape-hexagon_outline` ·
`extras:shape-octagon` · `extras:shape-octagon_outline` · `extras:shape-oval` ·
`extras:shape-oval_outline` · `extras:shape-pentagon` · `extras:shape-pentagon_outline` ·
`extras:shape-rounded_square` · `extras:shape-rounded_square_outline` · `extras:shape-square` ·
`extras:shape-square_outline` · `extras:shape-star` · `extras:shape-star4` ·
`extras:shape-star4_outline` · `extras:shape-star6` · `extras:shape-star6_outline` ·
`extras:shape-star_outline` · `extras:shape-triangle` · `extras:shape-triangle_outline` ·
`extras:shape-x` · `extras:shape-x_outline`

#### `badge` group

Numbered discs for ordered things — route stops, ranked results, legend keys. Filled carries a
knocked-out numeral and reads on a light basemap; outlined carries a solid numeral and reads over
imagery. Letters would join this group as `letter_a` rather than starting a group of their own.

`extras:badge-number_0` · `extras:badge-number_0_outline` · `extras:badge-number_1` ·
`extras:badge-number_1_outline` · `extras:badge-number_2` · `extras:badge-number_2_outline` ·
`extras:badge-number_3` · `extras:badge-number_3_outline` · `extras:badge-number_4` ·
`extras:badge-number_4_outline` · `extras:badge-number_5` · `extras:badge-number_5_outline` ·
`extras:badge-number_6` · `extras:badge-number_6_outline` · `extras:badge-number_7` ·
`extras:badge-number_7_outline` · `extras:badge-number_8` · `extras:badge-number_8_outline` ·
`extras:badge-number_9` · `extras:badge-number_9_outline`

#### `symbol` group

Abstract marks that carry a meaning rather than a shape: arrows and chevrons, glyphs for annotating
a feature, and small marks for legends. Arrows are drawn pointing **right**, like `symbol-arrow`;
turn them with `icon-rotate` rather than asking for a second name.

`extras:symbol-arrow` · `extras:symbol-arrow2` · `extras:symbol-arrow3` ·
`extras:symbol-arrow_circle` · `extras:symbol-arrow_curved` · `extras:symbol-arrow_double` ·
`extras:symbol-arrow_return` · `extras:symbol-caret` · `extras:symbol-chart_bar` ·
`extras:symbol-chart_line` · `extras:symbol-chart_pie` · `extras:symbol-check` ·
`extras:symbol-chevron` · `extras:symbol-chevron_double` · `extras:symbol-crosshair` ·
`extras:symbol-dot` · `extras:symbol-entrance` · `extras:symbol-exclamation` ·
`extras:symbol-minus` · `extras:symbol-percent` · `extras:symbol-question` · `extras:symbol-slash` ·
`extras:symbol-trend_down` · `extras:symbol-trend_up`

## Adding an icon

**Borrowed, or drawn?** Prefer a CC0 source. Take the file from Maki or Temaki, drop it into the
matching `icons/<source>/` folder **under its upstream filename**, then give it a sprite name in
`config-sprites.ts`. Only draw one yourself when neither has it; those go in `icons/versatiles/`.

```ts
// scripts/config-sprites.ts — the key is the sprite name, the value is the file it is drawn from
airfield: 'maki/airfield',                                              // fine for `base`
cat: { src: 'maki/animal-shelter', tags: ['pet', 'animal'], description: 'A sitting cat' },
```

`base` may use the bare string form. **`extras` may not** — every icon there needs tags and a
description, and a test fails without them (see below).

The naming convention below governs **sprite names**, not filenames — upstream keeps its own
spelling on disk. `npm run icons-report` renders the whole set and fails if a sprite entry points at
a missing file, if two sprite names in one sheet share a source, or if a source file is referenced
by nothing.

### Metadata for icon pickers

Every `extras` icon carries a one-line `description` and a set of search `tags`, so a sprite picker
can offer search rather than making people scroll 200+ tiles. Tags are the terms someone would
actually type that are **not** already the icon's name — synonyms, spellings, and the job the icon
does:

```ts
bicycle: { src: 'maki/bicycle', tags: ['bike', 'cycling', 'cycle', 'ride', 'velo'], description: 'A bicycle' },
```

The build writes it beside the sheet as `…/assets/sprites/extras.meta.json`, keyed by the same
`<group>-<name>` ids the sprite JSON uses, so a picker can join the two directly:

```json
{
  "icon-bicycle": { "description": "A bicycle", "tags": ["bike", "cycling", "cycle", "ride", "velo"] },
  "badge-number_3": { "description": "A filled disc with the numeral 3 knocked out", "tags": ["badge", "…"] }
}
```

Two tests keep it honest: every `extras` icon must have a description **and** at least one tag, and
no tag may simply repeat the icon's own name — a tag that echoes the name adds nothing to a search
index. `aliases` is accepted alongside them for names an icon used to have.

**Grid.** New icons are drawn on a **24×24** canvas — pins on **24×30**. Older sources sit on
15×15 (the Maki-derived ones) or on a millimetre-derived canvas such as 29.1042 or 39.6875 (the
hand-drawn sets, authored in a mm-based editor); they render correctly and are left alone, so the
repo carries more than one authoring grid on purpose. Anything new, and anything redrawn, uses 24.

**The `width` and `height` attributes are what the build reads** — not the `viewBox`.
`Sprite.fromIcons` takes the group's `size` as the rendered _height_ and derives the width from the
source's aspect ratio:

```
width = round(size × w0 / h0)
```

So the `pin` group's `size: 28` and a 24×30 source give `round(28 × 24/30)` = **22×28**. A source at
the wrong aspect ratio does not fail the build — it just lands a pixel or two off. `config-sprites.test.ts`
asserts the pin geometry and that every icon within a group agrees on one rendered size.

**One color.** Every icon is packed as SDF (`"sdf": true`), so it is a single silhouette that
MapLibre recolors via `icon-color`, and there is no way to bake two colors into one image — see
below for what to do instead. The one exception is `base`'s `pattern` group, which sets
`useSDF: false`: those are tiled polygon fills, not recolorable point symbols.

### Two-color markers

Because an SDF icon is one color, "a dark glyph on a colored pin" is two symbol layers, not one
image. `extras:pin-teardrop_hole` is a pin with a circular well knocked out of the head, so whatever you
draw underneath shows through in its own color:

```js
// 1 — the pin body, tip on the coordinate
{
  type: 'symbol',
  layout: { 'icon-image': 'extras:pin-teardrop_hole', 'icon-anchor': 'bottom', 'icon-allow-overlap': true },
  paint: { 'icon-color': '#E9AC77' },
}
// 2 — the glyph, centered in the well
{
  type: 'symbol',
  layout: {
    'icon-image': 'extras:icon-mountain',
    'icon-size': 0.55,         // the well is 12.8 px across; a 22 px glyph must come down to fit
    'icon-offset': [0, -31.5], // 17.3 ÷ 0.55 — see below
    'icon-allow-overlap': true,
  },
  paint: { 'icon-color': '#333344' },
}
```

Both numbers come off the geometry above, at `icon-size: 1` on layer 1: the head center sits
`28 − 11.5 × (28/30)` = **17.3 px** above the tip, and the well is `2 × 7 × (22/24)` = **12.8 px**
wide, so a 22 px glyph needs `icon-size` of about 0.55 to sit inside it.

> **`icon-offset` is multiplied by `icon-size`.** The style spec is explicit: "each component is
> multiplied by the value of `icon-size` to obtain the final offset in pixels". So the number you
> write is the distance you want **divided by** the scale — 17.3 ÷ 0.55 = 31.5. Writing 17.3 here
> would place the glyph at 9.5 px, down at the pin's neck instead of in the well.

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

### The `markers` sheet is now `extras`

v5 shipped a second sheet called `markers`; v6 renames it `extras` and reorganizes it. Names were
audited against the naming convention above — several described where an icon was _used_ rather than
what it _depicts_ — and the groups were split by the kind of mark they hold.

**Check the group, not just the sheet.** v5 had two groups, `icon` and `symbol`; v6 has five, so a
prefix swap alone is not enough. In particular every geometric shape moved from `symbol` to `shape`:

| v5 `markers:` id                                                                                                                                         | v6 `extras:` id          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `symbol-circle`, `symbol-square`, `symbol-triangle`, `symbol-diamond`, `symbol-hexagon`, `symbol-star`, `symbol-cross`, `symbol-x` (and each `_outline`) | same name under `shape-` |

So `markers:symbol-star` becomes `extras:shape-star` — the group changes, not just the sheet prefix.
Everything not listed here or in the table below keeps its group, so `markers:symbol-arrow` is still
`extras:symbol-arrow`.

| v5 `markers:` id        | v6 `extras:` id                                | why                                       |
| ----------------------- | ---------------------------------------------- | ----------------------------------------- |
| `icon-animal_shelter`   | `icon-cat`                                     | it draws a cat, not a facility            |
| `icon-aquarium`         | `icon-fish`                                    | it draws a fish                           |
| `icon-home`             | `icon-house`                                   | the object, not the concept               |
| `icon-karaoke`          | `icon-microphone`                              | it draws a microphone                     |
| `icon-park`             | `icon-tree`                                    | it draws a deciduous tree                 |
| `icon-park1`            | `icon-conifer`                                 | a different species, not an alternate `2` |
| `icon-roadblock`        | `icon-no_entry`                                | it draws the no-entry sign                |
| `icon-water`            | `icon-droplet`                                 | it draws a droplet                        |
| `icon-entrance1`        | `symbol-entrance`                              | an abstract mark, not a pictogram         |
| `icon-heart`            | `symbol-heart`                                 | a shape, like `star` and `diamond`        |
| `icon-information`      | **dropped** — use `base:transport-information` | `base` already draws it                   |
| `symbol-arrow1`         | `symbol-arrow2`                                | alternates now start at 2                 |
| `symbol-arrow2`         | `symbol-arrow3`                                | shifted by the same renumbering           |
| `symbol-marker`         | `pin-teardrop`                                 | moved to the `pin` group                  |
| `symbol-marker_outline` | `pin-teardrop_outline`                         | moved to the `pin` group                  |

> Watch the arrows: v5 `symbol-arrow1` and `symbol-arrow2` both shift by one, so a v5 map using
> `markers:symbol-arrow2` wants `extras:symbol-arrow3` — a straight prefix swap silently gives you
> the wrong drawing.

The old markers were drawn on a square canvas; in the `pin` group they are re-cut on 24×30 with the
tip on the bottom edge, so they sit slightly taller and want `icon-anchor: "bottom"`.
`extras:pin-balloon` is a **new** silhouette, not a v5 icon.
