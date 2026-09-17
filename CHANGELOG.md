# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2026-09-17

### ⚠ BREAKING CHANGES
- Rewrote the public API around five functions: `osm()`, `satellite()`, `guessStyle()`,
  `guessSchema()` and `inspectorStyle()`.
  `osm()` and `satellite()` are **synchronous** and perform no I/O — a `*.json` source URL becomes a
  source `url` that MapLibre resolves at map load. `guessStyle()` is asynchronous, because it has to
  read the TileJSON before it can decide what to build.
- The package now declares an `exports` map, where v5 had none. The four public entry points are
  `@versatiles/style` and the subpaths `/omt`, `/protomaps` and `/migrate`; deep imports into
  `@versatiles/style/dist/…`, which v5 happened to allow, no longer resolve.
- Added `inlineSources(style)` to resolve a style's source references into a self-contained style,
  and `fetchTileJSON(url)` for when a TileJSON is needed at build time.
- `urls` keys now accept a pre-fetched `TileJSONSpecification` object as well as a URL string.
- Removed the v5 `StyleBuilder` class hierarchy and the palette builder functions
  `colorful`, `eclipse`, `graybeard`, `neutrino`, `shadow`, the deprecated `styles` object, and the
  related `StyleBuilderOptions` / `StyleBuilderColors` / `StyleBuilderColorKey` / `StyleBuilderFonts` /
  `StyleBuilderFunction` / `SatelliteStyleOptions` / `Language` types. (`GuessStyleOptions` remains.)
  Use `osm({ theme })` with the palettes `colorful | natural | muted | gray | toner`, each also available
  as a dark theme (`colorful-dark`, …), instead. See the migration table in `API_DESIGN.md`.
- Removed the old `guess_style` module. `guessStyle()` accepts a TileJSON **URL**, which it downloads,
  or a `TileJSONSpecification` object, which it uses without network access, and returns a Promise.
  Its options use the same `urls` shape as `osm()`: v5's `baseUrl`, `glyphs` and `sprite` are
  `urls.base`, `urls.glyphsPattern` and `urls.sprite`; `fetch` is a top-level option, as for
  `inlineSources()` and `fetchTileJSON()`. It never throws:
  an invalid argument, an unknown option key, a failed download or a malformed document all yield a
  blank — but valid — style.
- `isTileJSONSpecification` / `isRasterTileJSONSpecification` now return a boolean instead of
  throwing, so they behave like the type guards their signatures always claimed. The throwing
  behaviour, with its descriptive validation messages, moved to the new
  `assertTileJSONSpecification` / `assertRasterTileJSONSpecification`.
- `osm()` and `satellite()` no longer accept `urls.fetch`. They do no I/O, so it was never used; passing
  it is now an unknown-option error. A custom `fetch` belongs to the functions that download:
  `inlineSources()`, `fetchTileJSON()` and `guessStyle()`.
- **Unknown option keys now throw** instead of being silently ignored. `osm()`, `satellite()`, their
  `resolveOptions`/`minimizeOptions`/`toCode`, `inlineSources()` and `fetchTileJSON()` reject any
  key they do not know, with an error naming the unknown keys and, for a v5 name, its v6
  replacement (`osm: unknown option "textScale" — in v6 this is "text.scale"`).
  `guessStyle()` returns its blank style instead, keeping its never-throws contract.
- The `colors` keys were renamed to group-prefixed names (`wood` → `natureWood`, `streetbg` →
  `roadStreetBg`, `poi` → `labelPoi`, …): 34 of the 41 v5 keys changed. See the table under
  "Migration from v5" in `API_DESIGN.md`. A v5 key that is not renamed is rejected with an error naming its v6 name.
- `colorOptionsKeys` is no longer exported; use `osm.colorKeys` or `satellite.colorKeys`, which
  expose the same array.
- **Pedestrian squares are now labelled.** `label-street-pedestrian-zone` reads Shortbread's
  `streets_polygons_labels` at z14, so named squares and plazas are no longer anonymous grey
  polygons. `runway`, `taxiway` and `service` kinds in that layer stay unlabelled — it carries no
  `ref`, so runways would seldom label, and service polygons are not drawn.
- **Water is now labelled.** `label-water-area` (lakes, seas, reservoirs, from z4),
  `label-water-river` (rivers and canals, z12) and `label-water-stream` (streams and ditches, z14)
  read Shortbread's `water_polygons_labels` and `water_lines_labels`, which no VersaTiles style has
  ever rendered — v5 did not either, so the map had no water names at all. Adds a `labelWater`
  colour and a `layers.labels.water` group, split into `lakes` and `rivers`.
- **Styles now default to the `globe` projection** and accept a `projection` option
  (`'globe' | 'mercator' | 'vertical-perspective'`). Web Mercator's area distortion is worst at the
  low zooms where the whole world is visible; MapLibre returns to Mercator as you zoom in. This
  raises the required MapLibre GL JS version to **5.0+**, now declared as an **optional peer
  dependency** (`maplibre-gl: >=5.0.0`) — optional because the package has no runtime dependency
  on MapLibre and works for anyone generating style JSON server-side. Older versions and the
  native/server renderers ignore the property and draw Mercator, i.e. the previous behaviour;
  pass `projection: 'mercator'` to keep it explicitly.
- **Published satellite styles reshaped.** `assets/styles/satellite/style.json` is now **bare
  imagery**; the vector overlay moved to `satellite/overlay.json`. `satellite/nooverlay.json` is
  retired — use `satellite/style.json`, which is the same thing. The same applies to `terrain/*`.
  `satellite/en` and `satellite/de` are unchanged and still carry the overlay.
  Note this is deliberately the opposite of the library default: `satellite()` includes the overlay,
  because a bare style is the more useful published artifact but the less useful API default.
- **Sprite sheet renamed `basics` → `base`**, and `/assets/sprites/basics/sprites` is no longer
  published. Most ids only need the new prefix, but 22 were renamed or split — see the mapping table
  in `SPRITES.md`.
- **The `markers` sheet is now split into `extras` and `icons`, and its ids moved — a prefix swap is not
  enough.** v5's `icon` group became the `icons` sheet, whose ids drop the group prefix
  (`markers:icon-bicycle` → `icons:bicycle`); `extras` keeps five groups: `badge`, `pattern`, `pin`,
  `shape`, `symbol`. Every geometric shape left `symbol` for `shape`, so `markers:symbol-star` is now
  `extras:shape-star`, not `extras:symbol-star`. Names were also audited against the naming
  convention, because several described where an icon was _used_ rather than what it _draws_:
  `icon-karaoke` → `icons:microphone`, `icon-aquarium` → `icons:fish`, `icon-animal_shelter` →
  `icons:cat`, `icon-park`/`icon-park1` → `icons:tree`/`icons:conifer`, `icon-water` →
  `icons:droplet`, `icon-roadblock` → `icons:no_entry`, `icon-home` → `icons:house`. `icon-heart` moved to
  `extras:shape-heart` and `icon-entrance` to `extras:symbol-entrance`, `symbol-marker` became `pin-teardrop`, `icon-information` was
  dropped (`base` already draws one), and `symbol-arrow1`/`arrow2` shifted to `arrow2`/`arrow3` —
  so a v5 map using `markers:symbol-arrow2` wants `extras:symbol-arrow3` and a prefix swap would
  silently give it the wrong drawing. The full table is in `SPRITES.md`.
- **The public icons grew from 38 to 234** — 96 in `extras`, 138 in `icons` — and both sheets are a
  supported, add-only public API. They are separate sheets so a map that only places pins does not
  download every pictogram. Alongside the existing shapes and arrows they now carry map pins (including numbered ones), numbered badges,
  tileable `fill-pattern` tiles, and pictograms for transport, weather and hazards, energy, nature,
  civic and commerce, culture and interface. All CC0.
- **The sprite JSON now carries picker metadata.** Each entry in **every** sheet gains a `title` and
  optional `aliases` for search, and entries that point somewhere other than their own middle gain a
  `center` as a fraction of the icon's box — a map pin's tip (`[0.5, 1]`) and every arrowhead. MapLibre ignores fields
  it does not know, so this is additive, and no second request is needed to build an icon picker.
  Many `base` aliases are the v5 name the icon used to carry, so a style editor searching
  `pharmacy` still finds `base:icon-pill`.
- **Two `base` icons renamed** (`base` is internal and may change with any release, but for
  completeness): `base:marking-arrow` → `base:marking-oneway`, which is what it actually marks, and
  `base:pattern-warning` → `base:pattern-hatched`, which is what it actually draws — it is diagonal
  hatching, and the old name described the danger-area fill it was used for.
- The v5 style names (`eclipse`, `graybeard`, `neutrino`, `shadow`, `empty`) are **still published**
  as aliases of their closest v6 equivalent, so existing `assets/styles/<name>/…` URLs keep working.
  They are deprecated and will be dropped in 7.0. The v6 themes behind them were retuned, so these
  styles look different from their v5 originals.
- `defaults` and `resolveOptions()` on `osm` and `satellite` no longer fill in `sky.skyColor` and
  `sky.horizonColor`. The style still derives them from the palette when it is built, so a resolved
  object can be passed back to `osm()`/`satellite()` without pinning the sky to the old colours.
- An unknown palette name now throws `osm.theme: unknown palette "…"`, listing the valid palettes, instead
  of `TypeError: Cannot read properties of undefined (reading 'light')`. The v5 style names are not
  accepted as themes; the error names the v6 theme to use (`"eclipse" is a v5 style name — in v6 use
  "colorful-dark"`).
- Removed `getStyleVariants()` and the `StyleVariant` type from the public API. They enumerated the
  styles *this project* publishes to its CDN, which is release tooling rather than library API, and
  they now live in `scripts/lib/variants.ts`. Nothing outside this repository used them.
- Rewrote `Color` as a single immutable class over six colour spaces — sRGB, HSL, HWB, HSV, OKLab and
  OKLCh — replacing the `RGB`/`HSL`/`HSV` class hierarchy. Those three were type-only exports, so no
  runtime value disappeared; see "Migration from v5: colours" in `API_DESIGN.md` for the mapping.
- Colour parsing is strict. Input that v5 silently misread now throws a `ColorParseError` naming the
  problem: `rgb(100%,0%,0%)` was read as `rgb(100,0,0)`, `rgba(255,0,0,50%)` came out opaque,
  `rgb(-5,0,0)` became `rgb(5,0,0)`, and a trailing `;` was accepted. Percentages, signs, decimals,
  angle units and `/` alpha now mean what CSS says they mean.
- Named colours are not supported: write the hex. Nor are `calc()`, `color-mix()`, relative colour
  syntax, `color()`, `light-dark()`, `currentColor` or `none` components — each rejected by name.
- `tint()` toward a colour with no hue now leaves the colour unchanged. v5 read white, black and grey
  as hue 0°, so tinting toward any of them turned every colour red.
- `blend()` interpolates alpha instead of keeping the base's, and `lighten()`/`darken()` clamp their
  ratio to 0–1, as `blend()` and `tint()` already did.
- `randomColor()` without a seed now returns a different colour each call (v5 seeded with 0 and so
  always returned the same one), and a numeric or `'weak'` `saturation` is honoured rather than ignored.

### Added
- `hwb()`, `hsv()`, `oklab()` and `oklch()` as input syntax, and `Color.to(space)` with typed per-space
  accessors (`color.oklch.l`), `Color.mix()` with the four CSS hue-interpolation methods, `deltaEOK()`,
  `contrastRatio()`, `luminance()`, `inGamut()`, `toGamut()` (CSS Color 4 gamut mapping) and
  `with({ … })` for channel edits.
- `toCSS(space?)` writes a colour in any supported space; `asString()` continues to write the sRGB
  legacy syntax that MapLibre reads.

### Fixed
- The sky is now recoloured with the rest of the style. `recolor` walked layer paint only, so an
  inverted-brightness map darkened the ground and kept a bright blue sky above it. The 3D light is
  deliberately left alone: its colour is an illuminant, and inverting white gives black, which is not
  dark lighting but no light at all.
- `sky.{skyColor,horizonColor,fogColor}`, `hillshade.{shadowColor,highlightColor,accentColor}` and
  `sun.color` are validated instead of being copied into the style unexamined. An unreadable colour
  there used to reach MapLibre and render as nothing in the native renderer.
- The four `marking-*` layers no longer emit `hsl()` while every other colour is `rgb()` — an accident
  of which class a transform happened to return. Same colours, one notation.
- `NativeMap` (screenshot tooling) now reports the engine's `ParseStyle` warnings. A colour the native
  parser cannot read renders as a fully transparent layer and used to pass CI silently.

### Features
- **Two more tile schemas, each on its own subpath.** `omt()` from `@versatiles/style/omt` draws
  [OpenMapTiles](https://openmaptiles.org/) tiles and `protomaps()` from `@versatiles/style/protomaps`
  draws the [Protomaps Basemap](https://docs.protomaps.com/basemaps/layers) — the same cartography
  `osm()` gives Shortbread, from the same option vocabulary (`theme`, `colors`, `recolor`, `layers`,
  `text`, `icon`, `sun`, `sky`, `projection`) and with the same statics. Only the tile source option
  differs: `urls.omt` defaults to OpenFreeMap, and `urls.protomaps` is **required**, because Protomaps
  publishes a PMTiles archive rather than a hosted endpoint. An option a schema cannot express throws
  rather than silently doing nothing — `omt({ features: { landcover: true } })` is an error naming the
  key. They are subpaths rather than root exports so that a page drawing only Shortbread does not
  download them: the import graph decides what the CDN bundle contains, not a build flag.
- `inspectorStyle(tileJSON)` returns a colour-coded style that draws every source-layer of a vector
  tileset — a translucent fill, a line and a `name` label each, nothing filtered — for looking at
  unfamiliar tiles, or at what a tileset carries rather than how it should look. It is the style
  `guessStyle()` already fell back to for vector tiles whose schema it cannot build; exporting it
  means it can also be asked for deliberately, including for a tileset `guessStyle` recognises and
  would otherwise build real cartography for. Synchronous and I/O-free, and unlike `guessStyle` it
  throws on bad input rather than returning a blank style.
- `guessSchema(tileJSON)` names a vector tileset's schema — `'shortbread' | 'openmaptiles' |
  'protomaps'` — synchronously and without I/O, reading only `vector_layers`. It scores every schema,
  so `candidates` shows why. It knows all three without importing any of them, which is what keeps it
  in the root entry.
- `guessStyle()` takes a `schemas` option: pass `omt` or `protomaps` (or a schema of your own) and a
  tileset detected as that schema gets its real style instead of the inspector style. The list is
  additive — Shortbread still wins for Shortbread tiles. Injection rather than a registry, so a caller
  pays only for the schemas they import.
- `guessOptions(style)` from `@versatiles/style/migrate` reads a MapLibre style built for
  OpenMapTiles, Protomaps or Shortbread tiles and returns the `osm()` or `satellite()` options whose
  style looks most like it, with a report of what it read and what it could not carry over — for
  moving an existing map onto VersaTiles. `deriveOptions()` is its synchronous, I/O-free core. Its own
  subpath because it carries the style spec's expression engine and a calibration of the builders.
- Every palette has a dark theme of its own: `colorful-dark`, `natural-dark`, `muted-dark`, `gray-dark`
  and `toner-dark`. Pick one with `isDarkMode()` to follow the system setting. They are published
  like the light themes (`assets/styles/colorful-dark/style.json`, `…/en.json`, `…-terrain/…`).
- `osm.supportsLandcover(tileJSON)` reports whether a tileset carries the low-zoom landcover
  extension that `features.landcover` needs.
- `osm.minimizeOptions(options)` / `satellite.minimizeOptions(options)` return the smallest options
  object that builds the same style — for storing a style in a URL or config file.
- `satellite.layerGroups` maps each group of `osmOverlay.layers` to the layers it controls in the
  overlay: `osm.layerGroups` without land, water, sites, airport and buildings, which the overlay does not
  draw, and without tunnels. `satellite.minimizeOptions()` drops those groups from `osmOverlay.layers`.
- `osm.toCode(options)` / `satellite.toCode(options)` return a runnable snippet for those options,
  wrapped in `inlineSources`, that always sets `urls.base`.
- `text` sets label typography globally, per group or per topic — `boundaries`, `places`, `streets`,
  `water`, `pois` and `addresses`, each with sub-topics. Every node takes the same properties: `font`,
  `scale`, `spacing`, `maxWidth`, `lineHeight`, `letterSpacing`, `transform`, `haloWidth` and `haloBlur`,
  and each topic takes each one from the nearest node that sets it. `text.language`, `text.languageStrict`
  and `text.pitchAlignment` apply to every label. `osm.textGroups` lists the layers each topic sets.
  `guessOptions()` carries over the fonts of a migrated style per topic when the glyph server's font list
  has them (`Open Sans Bold` → `open_sans_bold`), and their weight otherwise. Hamlet names are a topic of
  their own, `places.hamlets`, and so is their visibility, `layers.labels.places.hamlets`:
  `layers.labels.places.villages: false` no longer hides them.
- For a font picker: `fetchFontFaces()` lists the faces a glyph server publishes, with titles.
  `fontCovers()` tells whether a face has the glyphs for a label language, `'user'` included; beyond the
  script's letters it checks the extra letters of 27 languages, such as Polish, Vietnamese and Serbian.
  `fontScripts()` lists the scripts of `FONT_SCRIPTS` a face covers, `languageScript()` gives the script of
  a language, and `textScripts()` the scripts that occur in a text. `labelLanguage()` gives the language
  labels are drawn in, with `'user'` read as the browser's language.
- `icon` sets the size (`icon.scale`) and spacing (`icon.spacing`) of icons, apart from their labels.
- `text.pitchAlignment: 'viewport'` stands street, river and motorway names up in a tilted map
  instead of laying them on the ground. `guessOptions()` carries it over from a style that does the same.
- `text.spacing` and `icon.spacing` thin point labels and icons too — places, POIs and house numbers — by
  widening their collision padding (14 px per step above 1), as well as labels and markings along lines.


## [5.13.1] - 2026-08-15

### Features

- implement fade-in functionality for land and water layers with associated tests ([4889e4a](https://github.com/versatiles-org/versatiles-style/commit/4889e4a1b85d02094b5b9b2104b8ff2d269aee3b))

### Bug Fixes

- update funding information to reflect new organization details ([1c04b12](https://github.com/versatiles-org/versatiles-style/commit/1c04b1276bfc854554db3df5403c350fb72074c0))

### Build System

- **deps:** bump the npm group with 11 updates ([2a02579](https://github.com/versatiles-org/versatiles-style/commit/2a02579c5db351a2235de50f8222ebb064832448))
- **deps:** bump the action group with 2 updates ([4d6c888](https://github.com/versatiles-org/versatiles-style/commit/4d6c8882d73475fbb556ec250f3f6788c3a08203))
- **deps:** bump actions/setup-node from 6 to 7 in the action group ([4343ea5](https://github.com/versatiles-org/versatiles-style/commit/4343ea52647b72271ae036daff36d0e584e3aa10))

### Chores

- update dependencies and devDependencies in package.json ([4c031db](https://github.com/versatiles-org/versatiles-style/commit/4c031dbe83a06e8c4f2b26deaa0ca2ae26ff5b47))

### Styles

- format map function syntax in getShortbreadLayers ([61364c6](https://github.com/versatiles-org/versatiles-style/commit/61364c6dd2cf0087ea126f75c1368132b8c9a45a))

## [5.13.0] - 2026-06-22

### Features

- add experimental options for landcover rendering in style rules, fixes #114 and fixes #115 ([b0c8eaa](https://github.com/versatiles-org/versatiles-style/commit/b0c8eaa149be75d8f7e1a81f9ca1b1fec3258d86))
- enhance style rendering with 3D building support and experimental options, fixes #116 ([affb796](https://github.com/versatiles-org/versatiles-style/commit/affb7962c85dbffe42c1b3442830b49d5f05fc15))
- add support for 3D building heights and synchronize light settings with hillshade ([e574ef2](https://github.com/versatiles-org/versatiles-style/commit/e574ef29b76966d17f02d05bc10c7c2099870254))
- reorganize and enhance label definitions for place and boundary layers ([7080674](https://github.com/versatiles-org/versatiles-style/commit/7080674bb5cf6896c6993b70d28e31f809500a75))
- adjust building opacity for 3D rendering in style rules ([8edfcb1](https://github.com/versatiles-org/versatiles-style/commit/8edfcb13d0fc21c6fd8bdf3ce4ee7fd23b9fa201))
- add languageStrict option for enhanced language handling in style rules, fixes #117 ([4ebe7d4](https://github.com/versatiles-org/versatiles-style/commit/4ebe7d4e0abe3cff3f92fa6f95a295c4a7231ab9))
- increase maxzoom for satellite style to enhance detail in imagery ([f5d6b9d](https://github.com/versatiles-org/versatiles-style/commit/f5d6b9dd44bcea19f60f8a3ab1afbbb078e98a05))

### Build System

- **deps-dev:** bump the npm group with 10 updates ([2478712](https://github.com/versatiles-org/versatiles-style/commit/247871246ab0dc899296684de47a7d6b78ebcea9))

### Chores

- update dependencies in package.json ([03590b0](https://github.com/versatiles-org/versatiles-style/commit/03590b07d99fdc0b5decab8d64698da132253c50))

## [5.12.1] - 2026-05-22

### Features

- add TileJSON files for various vector and raster layers ([67311b3](https://github.com/versatiles-org/versatiles-style/commit/67311b389706a18c3e43508b69a4619e16521ea6))
- update center property to accept three numbers in TileJSON specification ([6a6ba6f](https://github.com/versatiles-org/versatiles-style/commit/6a6ba6fa2590643c702baf7cc6f7c7939bf463fb))
- add tests for real-world TileJSONs and validate generated MapLibre styles ([14670ab](https://github.com/versatiles-org/versatiles-style/commit/14670ab7bd3520c430db6f4197db7d176337e0db))
- enhance guessStyle function with improved TileJSON sanitization and validation ([2d0bc63](https://github.com/versatiles-org/versatiles-style/commit/2d0bc63be0f4288aefe9fdd5c464bab6a09332cd))
- add tests for handling partially invalid TileJSONs and validate vector layer filtering ([35e73c2](https://github.com/versatiles-org/versatiles-style/commit/35e73c253a7967b6dcd1447254e37411133a90a6))

### Bug Fixes

- update diagram structure in README for clarity and organization ([275733a](https://github.com/versatiles-org/versatiles-style/commit/275733a51a43e7dd7e9fec1838afeb3ecde69d52))

### Chores

- update dependencies to latest versions ([e6f8f15](https://github.com/versatiles-org/versatiles-style/commit/e6f8f15fe3375ba5a0898d65f27d636d03a58f2c))

## [5.12.0] - 2026-05-15

### Features

- render highway=busway and highway=bus_guideway as service streets ([1d2d15b](https://github.com/versatiles-org/versatiles-style/commit/1d2d15be8574ae68cbcbc0e03165c4977fa642fd))
- add textScale option to multiply symbol text sizes ([e91c2af](https://github.com/versatiles-org/versatiles-style/commit/e91c2afaa91fc6346477a0e810b735c276ab85d9))
- add iconScale option to scale icon sizes in symbol layers ([58cc1ff](https://github.com/versatiles-org/versatiles-style/commit/58cc1ff5d8c968364926a9a873a9cdac70b7b020))

### Bug Fixes

- fall back across name/name_en/name_<lang> for label text-field ([d734120](https://github.com/versatiles-org/versatiles-style/commit/d734120ce3e5c03efaf2b2dc57c7d5b1549e67d5))
- sort place labels by population for collision priority ([b53ea37](https://github.com/versatiles-org/versatiles-style/commit/b53ea37ff20de5895f47b2815486953b0c4e891f))
- reorder check script for improved execution flow ([eacc8eb](https://github.com/versatiles-org/versatiles-style/commit/eacc8eb7a3f11d5f398d32d31925023afb6446e2))
- render trunk roads one zoom earlier to match tile data availability ([ec736a5](https://github.com/versatiles-org/versatiles-style/commit/ec736a59894ccbbd909128aa3259836a5dd16959))
- derive housenumber colors via blend so they survive theme inversion ([fcc1815](https://github.com/versatiles-org/versatiles-style/commit/fcc18151579b8b6f501115e3343fafa695c4bf95))
- emit glyphs and sprite from satellite style with overlay disabled ([9d69de3](https://github.com/versatiles-org/versatiles-style/commit/9d69de3f73d92659c472fb0733756b833038dfdb))
- normalize attribution strings so MapLibre dedupes cosmetic duplicates ([e6d1f12](https://github.com/versatiles-org/versatiles-style/commit/e6d1f12e08940f2a6f306e346a019f9719d05b6f))

### Code Refactoring

- replace lighten/darken with blend(x, fg|bg) in colorful ([b515c9e](https://github.com/versatiles-org/versatiles-style/commit/b515c9ef67d88180a6830971621af41e09aa16aa))
- enhance documentation for color manipulation methods in Color, HSL, HSV, and RGB classes ([061f6a5](https://github.com/versatiles-org/versatiles-style/commit/061f6a54fce6ea46fe2982cd3348368842070068))

### Documentation

- add recommended icon sources to README, close #96 ([147328c](https://github.com/versatiles-org/versatiles-style/commit/147328cdcd4b3785fa1c84efb3df16a44de2738e))

### Chores

- update dependencies to latest versions ([d9ee972](https://github.com/versatiles-org/versatiles-style/commit/d9ee9722e12201a4693f88ec8282e580391787fc))

## [5.11.0] - 2026-05-08

### Features

- add elevation support with terrain and hillshade options ([6ef75eb](https://github.com/versatiles-org/versatiles-style/commit/6ef75eb8d9a09f3db5042773227e3883d3794fa3))

### Bug Fixes

- update default hillshade exaggeration ([90e454f](https://github.com/versatiles-org/versatiles-style/commit/90e454f3731619207cfd8d1d62edec4bf74e4d39))

### Code Refactoring

- update TypeScript configuration and improve layer definitions ([3ef41c3](https://github.com/versatiles-org/versatiles-style/commit/3ef41c3cf27a78cef7c56efa9f494445dec5dc96))

### Build System

- **deps:** bump actions/upload-pages-artifact in the action group ([5dbfabd](https://github.com/versatiles-org/versatiles-style/commit/5dbfabd6c5bd6264d60aff2ae72072977de10e8a))

### Chores

- update dependencies in package.json ([443fddd](https://github.com/versatiles-org/versatiles-style/commit/443fddd274c997d30b74937466ceb0a1a4f1511c))

### Other Changes

- +label-street-track ([78421f4](https://github.com/versatiles-org/versatiles-style/commit/78421f4e48943b7adc23ca24dcfcce7a01c3760a))
- fix test after adding missing label for tracks ([2c2573e](https://github.com/versatiles-org/versatiles-style/commit/2c2573e4b5b4961ad3c6e65683569cdf99129249))

## [5.10.2] - 2026-04-05

### Bug Fixes

- add index signature to StyleBuilderOptions and SatelliteStyleOptions interfaces

## [5.10.1] - 2026-04-04

### Bug Fixes

- remove center property from satellite source configuration

### Build System

- **deps:** bump the action group with 2 updates

### Chores

- update dependencies and devDependencies in package.json
- update dependencies in package.json

## [5.10.0] - 2026-03-12

### Features

- add support for terrain and hillshade layers in satellite style
- add initial HTML structure, main TypeScript logic, and Vite configuration for development
- add local sprites plugin to serve asset sprites from the release directory
- implement style variants management and update style selection in UI
- add terrain style variants for satellite rendering
- add tile_schema and encoding properties to TileJSONSpecificationRaster interface
- enhance elevation source handling in buildSatelliteStyle function
- add maplibre-gl dependency to package.json and package-lock.json
- add navigation control to the map on initialization
- enhance TileJSON specification with encoding and tile size properties

### Bug Fixes

- update script type and await style initialization in getStylePage function
- update style restoration to use query parameters instead of hash
- update check script to include typecheck command
- update type declarations to use 'any' for compatibility and add tsconfig for dev environment
- add exclusion for TypeScript files in tsconfig
- remove debug log for style loading in loadStyle function
- replace 'any' type with specific type for maplibregl and map variable
- remove exaggerated hillshade option and set default interpolation for hillshade-exaggeration
- change terrain variable from let to const for better immutability
- update hillshade-exaggeration to use interpolation for better zoom handling
- update format script to include log level for prettier
- improve hillshade layer configuration with customizable properties

### Code Refactoring

- remove unused server and MIME type handling code

### Chores

- update dependencies in package.json
- update dependencies to latest versions
- update @types/node to version 25.5.0

### Styles

- standardize HTML structure and formatting in index.html

## [5.9.5] - 2026-03-01

### Bug Fixes

- update test scripts and add end-to-end tests for style object validation
- update CI workflows to run all tests and add end-to-end testing step
- remove unnecessary initialization of saturation variable in HSL conversion
- update import statement for brace expansion and adjust usage in decorate function
- update brace-expansion and other dependencies in package.json
- remove unused inquirer types from dependencies in package.json
- add tslib as a dependency in package.json and package-lock.json

### Build System

- **deps:** bump the npm group with 11 updates

### Chores

- update dependencies and devDependencies in package.json

## [5.9.4] - 2026-02-15

### Bug Fixes

- update badge labels in README for consistency
- reorder build step in release workflow for improved execution
- add verification step for sprites.tar.gz size in release workflow
- remove redundant browser test for style object
- prevent tests from modifying the release directory by mocking fs methods
- update satellite style bounds and center coordinates for accuracy
- simplify mock implementations in sprite generation tests

### Chores

- update dependencies in package.json

## [5.9.3] - 2026-02-10

### Bug Fixes

- use await for satellite style rendering in screenshots script
- update rasterTilejson URLs to use baseUrl resolution

## [5.9.2] - 2026-02-10

### Bug Fixes

- update satellite style functions to use async/await, fetch TileJSON as a source and improve test cases

## [5.9.1] - 2026-02-09

### Bug Fixes

- remove src directory from files in package.json
- add CHANGELOG.md to .prettierignore
- add TypeScript configuration for documentation generation
- streamline testing steps in release workflow
- update bounds for raster source in buildSatelliteStyle function

## [5.9.0] - 2026-02-06

### Features

- add initial Vitest configuration for testing coverage
- add satellite style with customizable options and tests
- add satellite style option to StyleName and update config
- add satellite style to README and update screenshot rendering
- update satellite style

### Bug Fixes

- add .claude to .gitignore
- update node version range in devEngines to support up to 25.0.0
- improve error messages for unsupported types in deepClone and isBasicType functions
- enhance error messages
- improve error handling for unknown layer types in StyleBuilder
- add .vscode to .gitignore
- remove unreachable code in deepMerge
- update node version range in devEngines
- update @maplibre/maplibre-gl-style-spec and @types/node to latest versions
- correct comparison operators for gamma and contrast in recolor function
- improve error message for invalid vector layers
- replace ts-expect-error with type assertions for layer properties
- enforce strict equality checks in multiple files
- improve error handling in isVectorLayers function
- update satellite style tile URLs and rename option

### Performance Improvements

- pre-parse tint/blend colors in CachedRecolor constructor

### Code Refactoring

- remove build step from pre-push hook
- rename validation function for active recolor options
- remove unused toRGB() and toHSL() methods
- simplify StyleBuilderColorKey definition using const assertion
- streamline style name handling and update index page links

### Tests

- add color transformation methods tests for gamma, contrast, tint, blend, and setHue
- add edge cases for tint and blend methods in RGB class
- improve color transformation tests
- add additional tests for randomColor luminosity and saturation options
- add comprehensive tests for deepMerge functionality

### Build System

- **deps-dev:** bump the npm group with 12 updates
- **deps-dev:** bump tar from 7.5.3 to 7.5.6
- **deps-dev:** bump the npm group with 10 updates
- **deps:** update @types/node, @versatiles/release-tool, and esbuild to latest versions

### Chores

- update package.json dependencies
- update dependencies to latest versions

