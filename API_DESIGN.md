# API Design

## Table of Contents

- [API Design](#api-design)
  - [Core Principles](#core-principles)
  - [Shared Types](#shared-types)
    - [Layer visibility](#layer-visibility)
    - [Text & icons](#text-icons)
    - [Colors](#colors)
    - [Atmosphere & lighting](#atmosphere-lighting)
    - [Function options](#function-options)
  - [`osm()`](#osmoptions-stylespecification)
  - [`satellite()`](#satelliteoptions-stylespecification)
  - [`guessStyle()`](#guessstyleurl-options-promise-stylespecification)
  - [`isDarkMode()`](#isdarkmode-boolean)
  - [`fetchTileJSON()`](#fetchtilejsonurl-options-promise-tilejsonspecification)
  - [`inlineSources()`](#inlinesourcesstyle-options-promise-stylespecification)
  - [`Color`](#color)
  - [Other exports](#other-exports)
  - [Migration from v5](#migration-from-v5)

## Core Principles

- `osm()` and `satellite()` are **synchronous** — no hidden I/O. Only `guessStyle()` is async, because it must read a TileJSON before it can decide what to build.
- All URL configuration lives in a `urls` object; everything else in options is about rendering
- In `urls`, each key accepts a URL string (MapLibre fetches the TileJSON at map load time) or a pre-fetched `TileJSONSpecification` object. A string containing `{z}` is treated as a raw tile template rather than a TileJSON URL.
- A source is emitted with **either** `url` **or** `tiles`, never both — MapLibre gives explicit source options precedence over the document it fetches, so emitting both means fetching a TileJSON and then discarding it.
- `fetchTileJSON` gets a TileJSON when you need one at build time; `inlineSources` resolves an already-built style into a self-contained one.

---

## Shared Types

### Layer visibility

Each key in `LayerGroupOptions` accepts `true`/`false` to show or hide, a `number` (0–1) to set opacity, or — for grouped keys — an object to configure sub-groups individually.

```ts
// `layers` also accepts a scalar in place of the object, cascading to every group:
//   osm({ layers: false })  — no data layers at all (the v5 `empty` style)
//   osm({ layers: 0.5 })    — the whole map at half opacity
type LayerGroupOptions = {
  land?:
    | boolean
    | number
    | {
        forest?: boolean | number; // land-forest
        vegetation?: boolean | number; // land-grass (grass, grassland, meadow, wet_meadow), land-vegetation (heath, scrub)
        rock?: boolean | number; // land-rock (bare_rock, scree, shingle)
        wetland?: boolean | number; // land-wetland (bog, marsh, string_bog, swamp)
        sand?: boolean | number; // land-sand (beach, sand)
        glacier?: boolean | number; // land-glacier
        agriculture?: boolean | number; // land-agriculture (farmland, orchards, vineyards)
        urban?: boolean | number; // land-commercial, land-industrial, land-residential, land-park, land-garden, land-burial, land-leisure, land-waste
      };
  water?:
    | boolean
    | number
    | {
        ocean?: boolean | number; // water-ocean
        rivers?: boolean | number; // river/canal/stream/ditch lines and wide river polygons
        lakes?: boolean | number; // lakes, reservoirs, basins, docks
        piers?: boolean | number; // piers, dams, breakwaters, groynes
      };
  roads?:
    | boolean
    | number
    | {
        motorways?: boolean | number; // motorway + trunk (surface, tunnel, bridge, links, outlines)
        highways?: boolean | number; // primary, secondary, tertiary (all variants)
        streets?:
          | boolean
          | number
          | {
              residential?: boolean | number; // street-minor (residential + unclassified), street-livingstreet
              service?: boolean | number; // street-service (driveways, parking aisles, access roads)
              pedestrian?: boolean | number; // street-pedestrian, street-pedestrian-zone
              track?: boolean | number; // street-track
              bus?: boolean | number; // street-bus (busway + bus_guideway)
            };
        paths?: boolean | number; // path, cycleway
        footway?: boolean | number; // footways and pedestrian paths
        steps?: boolean | number; // stairs
      };
  transit?:
    | boolean
    | number
    | {
        rail?: boolean | number; // rail, light_rail, subway, tram, narrow_gauge, monorail, funicular
        aerialways?: boolean | number; // cable car, gondola, chair lift, drag lift, etc.
        ferries?: boolean | number; // ferry routes
        stops?: boolean | number; // bus stops, tram stops, train stations, airports as symbols
      };
  buildings?: boolean | number;
  sites?: boolean | number; // schools, hospitals, parking, construction, etc.
  airport?: boolean | number; // runways, taxiways
  pois?: boolean | number; // points of interest symbols
  boundaries?:
    | boolean
    | number
    | {
        country?: boolean | number; // boundary-country, -disputed, -maritime (admin_level=2)
        state?: boolean | number; // boundary-state (admin_level=4)
      };
  markings?: boolean | number; // oneway arrows and bicycle lane markings
  labels?:
    | boolean
    | number
    | {
        places?: boolean | number; // label-place-* (neighbourhood → capital)
        streets?: boolean | number; // label-street-* + label-motorway-*
        states?: boolean | number; // label-boundary-state
        countries?: boolean | number; // label-boundary-country-small/medium/large
        addresses?: boolean | number; // label-address-housenumber
        water?: boolean | number; // label-water-area, -river, -stream
      };
  icons?: boolean | number; // convenience alias for { pois, transit.stops, markings } together
};
```

### Text & icons

`TextOptions` sets the language and fonts for all text labels. `LayoutOptions` controls the size and density of both labels and icons.

```ts
type TextOptions = {
  language?: string; // 'local', 'user', 'de', 'en', …; default: 'local'
  languageStrict?: boolean; // omit labels with no translation; default: false
  fontNormal?: string; // regular font name
  fontBold?: string; // bold font name
};

type LayoutOptions = {
  scale?: number | { labels?: number; icons?: number }; // size multiplier
  spacing?: number | { labels?: number; icons?: number }; // exclusion-radius multiplier (>1 = fewer)
};
```

`'local'` uses the feature's native name (`name` field); `'user'` reads `navigator.language` at call time (falls back to `'local'` in Node.js). Use `osm.languages(tileJSON)` / `satellite.languages(tileJSON)` to discover which language codes are available in a given tileset.

### Colors

`ColorsOptions` sets named color values for the palette. `RecolorOptions` applies post-processing transforms on top of the resolved palette — useful for tinting, grayscale, or contrast adjustments without redefining individual colors.

```ts
type ColorsOptions = {
  // base
  background?: string; // canvas color behind all layers
  land?: string; // land surface
  water?: string; // water bodies (lakes, rivers, ocean)
  glacier?: string; // glaciers

  // natural land cover  (nature*)
  natureWood?: string; // forests
  natureGrass?: string; // grassland, meadow, wet meadow
  naturePark?: string; // parks, gardens, heath, scrub
  natureAgriculture?: string; // farmland, orchards, vineyards
  natureSand?: string; // beaches and sand
  natureRock?: string; // bare rock, scree, shingle
  natureWetland?: string; // marshes, bogs, swamps
  natureLeisure?: string; // playgrounds, golf courses

  // urban land use  (area*)
  areaResidential?: string; // residential areas
  areaCommercial?: string; // commercial and retail areas
  areaIndustrial?: string; // industrial areas, quarries
  areaWaste?: string; // landfill
  areaBurial?: string; // cemeteries

  // sites  (site*)
  siteConstruction?: string; // construction sites
  siteEducation?: string; // schools, colleges, universities
  siteHospital?: string; // hospitals
  siteDanger?: string; // danger areas
  sitePrison?: string; // prisons
  siteParking?: string; // parking areas
  siteSports?: string; // sports centres and pitches

  // buildings  (building*)
  building?: string; // building fill
  buildingBg?: string; // building outline / shadow

  // roads  (road*)
  roadStreet?: string; // local street fill
  roadStreetBg?: string; // local street casing
  roadMotorway?: string; // motorway fill
  roadMotorwayBg?: string; // motorway casing
  roadTrunk?: string; // trunk, primary, secondary fill
  roadTrunkBg?: string; // trunk, primary, secondary casing

  // transit  (transit*)
  transitRail?: string; // railways (main, light rail, tram)
  transitSubway?: string; // subways
  transitCycle?: string; // cycleways
  transitFoot?: string; // footways, paths, steps, pedestrian streets

  // boundaries  (boundary*)
  boundary?: string; // country and state boundaries
  boundaryDisputed?: string; // disputed boundaries

  // labels & symbols  (label*)
  label?: string; // label text
  labelHalo?: string; // label halo
  labelShield?: string; // motorway shield background
  labelSymbol?: string; // transit icon tint
  labelPoi?: string; // POI icon and label tint
  labelHousenumber?: string; // house-number labels
  labelWater?: string; // lake, sea and river names
};

type RecolorOptions = {
  // mode-independent (same visual effect on light and dark palettes):
  invertBrightness?: boolean; // flip lightness of all colors
  rotateHue?: number; // hue rotation in degrees; 0 = no change
  saturate?: number; // -1 = grayscale, 0 = no change, +1 = double
  tint?: { color: string; amount?: number }; // amount 0–1; default: 1
  // mode-dependent (absolute operations; effect differs between light and dark palettes):
  gamma?: number; // > 0; 1 = no change, < 1 = brighten midtones, > 1 = darken
  contrast?: number; // > 0; 1 = no change, < 1 = flatten, > 1 = increase
  brightness?: number; // 0 = no change; positive = brighter, negative = darker
  blend?: { color: string; amount?: number }; // amount 0–1; default: 1
};
```

### Atmosphere & lighting

Used by both `osm()` and `satellite()`. Require `features.terrain: true` to have any visible effect.

```ts
type SunOptions = {
  direction?: number; // azimuth in degrees; 0 = north, 90 = east; default: 315
  altitude?: number; // elevation in degrees; 0 = horizon, 90 = zenith; default: 45
  color?: string; // light color; default: '#ffffff'
  intensity?: number; // 0–1; default: 0.5
};

// `sky` accepts `true` (defaults), `false` (omit the sky block entirely), or an object.
// MapLibre only draws the sky when pitched or in globe projection.
type SkyOptions = {
  skyColor?: string; // color of the sky above the horizon; default: '#87CEEB'
  horizonColor?: string; // color at the horizon; default: '#ffffff'
  skyHorizonBlend?: number; // 0–1; blend between sky and horizon; default: 0.5
  horizonFogBlend?: number; // 0–1; blend between horizon and fog; default: 0.5
  atmosphereBlend?: number; // 0–1; atmospheric haze intensity; default: 0
};

type HillshadeOptions =
  | boolean
  | {
      exaggeration?: number; // default: 0.1
      shadowColor?: string; // default: '#000000'
      highlightColor?: string; // default: '#ffffff'
      accentColor?: string; // default: '#000000'
      anchor?: 'map' | 'viewport'; // default: 'map'
    };
```

### Function options

`OsmContentOptions` is the shared base used by both `osm()` and `satellite({ osmOverlay })`. `OsmOptions` and `SatelliteOptions` extend it with their respective URL and feature configurations.

```ts
type Palette = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

type OsmContentOptions = {
  theme?:
    | Palette // shorthand for { palette }
    | {
        darkMode?: boolean | 'auto'; // default: false; 'auto' = system preference (browser only)
        palette?: Palette; // default: 'colorful'
      };
  layers?: LayerGroupOptions;
  text?: TextOptions;
  layout?: LayoutOptions;
  colors?: ColorsOptions;
  recolor?: RecolorOptions;
};

type OsmOptions = OsmContentOptions & {
  urls?: {
    base?: string; // default: the page origin, or 'https://tiles.versatiles.org' if unusable
    osm?: string | TileJSONSpecification; // defaults to "/tiles/osm/tiles.json"
    elevation?: string | TileJSONSpecification; // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string; // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?: string | Array<{ id: string; url: string }>; // defaults to [{ id: "base", url: "/assets/sprites/base" }]
  };
  features?: {
    terrain?: boolean | { exaggeration?: number }; // exaggeration default: 1
    hillshade?: HillshadeOptions;
    landcover?: boolean; // ESA WorldCover at z0–z10; default: false
    buildings?: 'flat' | 'extruded'; // default: 'flat'
  };
  sun?: SunOptions;
  sky?: boolean | SkyOptions; // default: true
  projection?: 'globe' | 'mercator' | 'vertical-perspective'; // default: 'globe'
};

type SatelliteOptions = {
  urls?: {
    base?: string; // default: the page origin, or 'https://tiles.versatiles.org' if unusable
    satellite?: string | TileJSONSpecification; // defaults to "/tiles/satellite/tiles.json"
    osm?: string | TileJSONSpecification; // defaults to "/tiles/osm/tiles.json"
    elevation?: string | TileJSONSpecification; // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string; // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?: string | Array<{ id: string; url: string }>; // defaults to [{ id: "base", url: "/assets/sprites/base" }]
  };
  osmOverlay?: boolean | OsmContentOptions; // default: true (palette 'gray'); false for bare imagery
  raster?: {
    // keys mirror MapLibre's raster-* paint properties
    opacity?: number;
    hueRotate?: number;
    brightnessMin?: number;
    brightnessMax?: number;
    saturation?: number;
    contrast?: number;
  };
  features?: {
    terrain?: boolean | { exaggeration?: number }; // exaggeration default: 1
    hillshade?: HillshadeOptions;
  };
  sun?: SunOptions;
  sky?: boolean | SkyOptions; // default: true
  projection?: 'globe' | 'mercator' | 'vertical-perspective'; // default: 'globe'
};
```

---

## `osm(options?): StyleSpecification`

```ts
osm(options?: OsmOptions)
```

Static properties for introspection:

```ts
osm.palettes:     Palette[]           // ['colorful', 'natural', 'muted', 'gray', 'toner']
osm.colorKeys:    (keyof ColorsOptions)[]  // all color key names
osm.layerGroups:  LayerGroupMap       // maps each LayerGroupOptions key to the layer IDs it controls
osm.defaults:     ResolvedOsmOptions  // fully resolved defaults (palette: 'colorful', darkMode: false)
osm.colors(palette: Palette, darkMode: boolean): Record<string, string>
osm.languages(tileJSON: TileJSONSpecification): string[]
osm.supportsLandcover(tileJSON: TileJSONSpecification): boolean
osm.slots: {
  belowLabels:  string  // below text labels, above icons/symbols
  belowSymbols: string  // below all symbols, above streets
  belowStreets: string  // below streets, above fill layers
  belowFills:   string  // below all fill layers
} // stable layer IDs for use as MapLibre `beforeId`; omit beforeId to place above everything
osm.resolveOptions(options?: OsmOptions): ResolvedOsmOptions
osm.minimizeOptions(options?: OsmOptions): OsmOptions
osm.toCode(options?: OsmOptions): string
```

`osm.defaults` and `osm.resolveOptions()` leave `sky.skyColor` and `sky.horizonColor` unset unless
you set them: `osm()` derives them from the palette's `water` and `background` when it builds. So a
resolved object can be fed straight back in as options — edit `colors.water` on top of it and the sky
still follows.

`osm.supportsLandcover(tileJSON)` tells whether a tileset can back `features.landcover`: it is true
when the `land` layer starts below the zoom where plain Shortbread's first land kind appears (z7), which
means the tiles carry the low-zoom landcover extension. Missing metadata counts as `false`.

`osm.minimizeOptions(options)` returns the smallest options object that builds the same style: every
value equal to its default is dropped, with colours compared against the chosen palette's own
defaults. `osm(osm.minimizeOptions(x))` builds the same style as `osm(x)` — including for a full
`osm.resolveOptions()` object that a UI has edited — so it is the thing to store in a URL or a config
file.

`osm.toCode(options)` returns a runnable snippet for those options, minimised first:

```ts
osm.toCode({ theme: 'gray', layout: { scale: { labels: 1.5 } } });
// import { osm, inlineSources } from '@versatiles/style';
//
// const style = await inlineSources(osm({
//   theme: "gray",
//   layout: { scale: { labels: 1.5 } }   (formatted over several lines)
// }));
```

It always goes through `inlineSources`, because the VersaTiles tile server publishes relative tile
URLs that MapLibre cannot resolve on its own. A custom `urls.fetch` function cannot be written out and
is left out.

`osm.layerGroups` mirrors the shape of `LayerGroupOptions`, with the layer IDs each group controls
at the leaves — useful for building a UI over the options, or for finding a layer to target with
`beforeId`. It is derived from the layers themselves, so it cannot drift from what the options
actually control.

```ts
osm.layerGroups.land.glacier; // ['land-glacier']
osm.layerGroups.buildings; // ['building:outline', 'building', 'building-3d']
Object.keys(osm.layerGroups.roads.streets); // ['pedestrian', 'track', 'service', …]
```

`buildings` lists all three footprint layers even though `features.buildings: 'flat'` and
`'extruded'` are mutually exclusive in any one style — the group controls whichever is generated.
`icons` is a cross-cutting alias, so it is listed as the union of `pois`, `markings` and
`transit.stops`.

The v5 palette builders (`colorful`, `shadow`, `graybeard`, `eclipse`, `neutrino`) have been removed in v6. Use `osm()` with an explicit `theme.palette` and `theme.darkMode` instead — see [Migration from v5](#migration-from-v5) below.

---

## `satellite(options?): StyleSpecification`

```ts
satellite(options?: SatelliteOptions)
```

Static properties for introspection:

```ts
satellite.colorKeys: string[] // color keys available in osmOverlay.colors
satellite.defaults:  ResolvedSatelliteOptions
satellite.languages(tileJSON: TileJSONSpecification): string[]
satellite.slots: {
  belowLabels:  string // below text labels, above icons/symbols
  belowSymbols: string // below all symbols, above the raster layer
  belowRaster:  string // below the satellite raster layer
} // stable layer IDs for use as MapLibre `beforeId`; omit beforeId to place above everything
satellite.resolveOptions(options?: SatelliteOptions): ResolvedSatelliteOptions
satellite.minimizeOptions(options?: SatelliteOptions): SatelliteOptions
satellite.toCode(options?: SatelliteOptions): string
```

Likewise `satellite.defaults` and `satellite.resolveOptions()` leave the two sky colours unset;
`satellite()` takes them from the overlay's palette, or a generic sky blue when `osmOverlay` is
`false`.

`satellite.minimizeOptions` and `satellite.toCode` work the same way. Overlay colours are compared
against the overlay's palette — `gray` unless `osmOverlay.theme` says otherwise — and an overlay
left at its defaults minimises away entirely, since the overlay is on by default.

The OSM vector overlay (roads, boundaries, labels and POIs over the imagery) is rendered by default.
`true` uses the overlay's own defaults, `false` gives bare imagery with no vector layers, and an
object configures it — the same `boolean | object` shape as `features.terrain` and
`features.hillshade`.

The overlay defaults to the `gray` palette rather than `osm()`'s `colorful`: it is drawn over
imagery, so the least saturated palette keeps roads and labels from competing with the photo.
Pass `osmOverlay: { theme: … }` to choose another. Slot anchors are emitted either way,
so `satellite.slots` references stay valid.

---

## `guessStyle(url, options?): Promise<StyleSpecification>`

```ts
guessStyle(
  url: string,
  {
    urls?: {
      base?:          string
      glyphsPattern?: string
      sprite?:        string | Array<{ id: string; url: string }>
    }
  }
)
```

Downloads the TileJSON at `url` and picks an appropriate style automatically: Shortbread vector tiles
get a full osm style; unknown vector tiles get an auto-colored inspector style (one color per
source-layer); raster tiles get a basic raster layer. Anything it cannot classify falls back to a blank
style rather than throwing — but an invalid `url` argument throws, and network failures propagate.

This is the only asynchronous style function: it has to read the document before it can decide what to
build. The style it returns still _references_ its sources; pass it through
[`inlineSources()`](#inlinesourcesstyle-options-promise-stylespecification) to make it self-contained.

---

## Swapping a style at runtime

Rebuilding a style and handing it to an existing map needs a full reload:

```ts
map.setStyle(osm({ features: { landcover: true } }), { diff: false });
```

MapLibre's default diffing applies the new style to its model — `map.getStyle()` returns the right
thing — but tiles already parsed keep the buckets they were built with. A layer that was outside its
zoom range, or absent, when those tiles loaded stays invisible until something forces a re-parse.
Toggling `features.landcover` is exactly that case: it removes the `minzoom` from each covered fill,
and the loaded tiles carry no bucket for them, so the land cover appears only after a page reload.

---

## Projection

```ts
osm({ projection: 'globe' }); // default
osm({ projection: 'mercator' }); // pre-v6 behaviour
```

Web Mercator exaggerates area away from the equator — Greenland reads as the size of Africa — and
that distortion is worst at exactly the low zooms where the whole world is visible. `globe` is
correct there, and MapLibre transitions back to Mercator as you zoom in.

**Requires MapLibre GL JS 5.0+**, declared as an optional peer dependency so npm flags a mismatch
without forcing an install. Renderers without projection support ignore the property and draw
Mercator, which is the pre-v6 behaviour: MapLibre GL JS 4.x, and the native/server renderers, which
are Mercator-only. A style therefore renders as a globe in a current browser and flat server-side —
worth knowing if you compare the two.

Note the style spec accepts _any_ string for `projection.type`, so an unsupported value (`equal-earth`,
say) passes validation and then silently does nothing. The three values above are the ones MapLibre
implements.

---

## `isDarkMode(): boolean`

Returns `true` if the system preference is dark mode. In Node.js, always returns `false`.

---

## `fetchTileJSON(url, options?): Promise<TileJSONSpecification>`

```ts
fetchTileJSON(
  url: string,
  { fetch?: typeof globalThis.fetch }  // custom implementation; defaults to globalThis.fetch
)
```

Only needed when TileJSON metadata must be available at style-build time: to inline a source via `urls`, or to inspect a tileset with `osm.languages(tileJSON)`. For `osm` and `satellite`, passing a URL string in `urls` is simpler — the call stays synchronous and MapLibre resolves the document at map load.

To resolve an already-built style rather than a single document, use [`inlineSources()`](#inlinesourcesstyle-options-promise-stylespecification).

---

## `inlineSources(style, options?): Promise<StyleSpecification>`

```ts
inlineSources(
  style: StyleSpecification,
  { fetch?: typeof globalThis.fetch }
)
```

Resolves every `url`-referencing source in a style into a self-contained one: fetches the
TileJSON, inlines `tiles`, `minzoom`, `maxzoom`, `bounds` and `attribution`, and removes the
`url`. Returns a new style; the input is not mutated. Sources without a `url` are left alone.

This is the asynchronous half of the API. `osm()` and `satellite()` build a style with no I/O;
this fetches whatever they left as a reference. It is orthogonal to style building, so it also
works on `guessStyle()` output and on hand-written styles.

Use it when the style must stand on its own:

- published `style.json` artifacts,
- offline or air-gapped deployments,
- anywhere the first tile request should not wait for a TileJSON round-trip.

It is also the only place that can set the two source properties MapLibre cannot infer from a
TileJSON: raster `tileSize` (from `tile_size`) and raster-dem `encoding` (from `tile_schema`).
An `encoding` you set explicitly is preserved.

```ts
import { osm, inlineSources } from '@versatiles/style';

const style = osm({ theme: 'colorful' }); // { type: 'vector', url: '…/tiles.json' }
const standalone = await inlineSources(style); // { type: 'vector', tiles: [...], bounds, … }
```

---

## `Color`

Utility class for color manipulation, re-exported from the library for convenience.

```ts
// Parsing
Color.parse(input: string | Color): Color   // hex, rgb(), rgba(), hsl(), hsla()

// Conversion
color.asHex(): string
color.asRGB(): Color.RGB  // { r, g, b, a }
color.asHSL(): Color.HSL  // { h, s, l, a }
color.asHSV(): Color.HSV  // { h, s, v, a }

// Transformations (all return a new Color instance)
color.invertLuminosity(): Color
color.rotateHue(degrees: number): Color
color.saturate(ratio: number): Color             // -1 = grayscale, 0 = identity, +1 = double
color.gamma(value: number): Color                // < 1 = brighten midtones, > 1 = darken
color.contrast(value: number): Color             // > 1 = more contrast
color.brightness(value: number): Color           // -1 to +1
color.tint(amount: number, color: Color): Color  // 0–1; shift hue toward color
color.blend(amount: number, color: Color): Color // 0–1; linear mix toward color
color.fade(amount: number): Color                // 0–1; reduce alpha
```

---

## Other exports

These are exported from the package but are not part of the main API surface above.

```ts
getStyleVariants(features?): StyleVariant[]  // the styles published under /assets/styles/

// Validation — a predicate and an assertion for each shape.
isTileJSONSpecification(spec): spec is TileJSONSpecification
isRasterTileJSONSpecification(spec): spec is TileJSONSpecificationRaster
assertTileJSONSpecification(spec): asserts spec is TileJSONSpecification
assertRasterTileJSONSpecification(spec): asserts spec is TileJSONSpecificationRaster
```

The `is…` functions return a boolean and never throw, so they read as predicates:

```ts
if (isTileJSONSpecification(x)) {
  /* x is a TileJSONSpecification */
}
```

The `assert…` functions throw an `Error` naming the offending field — `spec.tilejson must be
"3.0.0", but got "2.2"` — which is what you want when validating input you expected to be valid.
They were previously one function whose `spec is T` signature promised the first behaviour while
delivering the second.

---

## Migration from v5

| v5                                                      | v6                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `colorful(options)`                                     | `osm(options)`                                                    |
| `colorful({ baseUrl: 'https://…' })`                    | `osm({ urls: { base: 'https://…' } })`                            |
| `colorful({ tiles: ['https://…'] })`                    | `osm({ urls: { osm: { tiles: ['https://…'] } } })`                |
| `colorful({ hideLabels: true })`                        | `osm({ layers: { labels: false } })`                              |
| `colorful({ textScale: 1.2 })`                          | `osm({ layout: { scale: { labels: 1.2 } } })`                     |
| `colorful({ language: null })`                          | `osm({ text: { language: 'local' } })`                            |
| `colorful({ language: 'de', languageStrict: true })`    | `osm({ text: { language: 'de', languageStrict: true } })`         |
| `await colorful({ terrain: true })`                     | `osm({ features: { terrain: true } })`                            |
| `colorful({ experimental: { buildingHeights: true } })` | `osm({ features: { buildings: 'extruded' } })`                    |
| `colorful({ elevationTilejson: '…' })`                  | `osm({ urls: { elevation: '…' }, features: { terrain: true } })`  |
| `shadow(options)`                                       | `osm({ ...options, theme: { palette: 'gray', darkMode: true } })` |
| `graybeard(options)`                                    | `osm({ ...options, theme: { palette: 'gray' } })`                 |
| `eclipse(options)`                                      | `osm({ ...options, theme: { darkMode: true } })`                  |
| `neutrino(options)`                                     | `osm({ ...options, theme: 'muted' })` _(closest match)_           |
| `satellite({ overlayTiles: ['https://…'] })`            | `satellite({ urls: { osm: { tiles: ['https://…'] } } })`          |
| `satellite({ rasterSaturation: -0.3 })`                 | `satellite({ raster: { saturation: -0.3 } })`                     |
| `empty(options)`                                        | `osm({ ...options, layers: false })`                              |
| `satellite({ overlay: false })`                         | `satellite({ osmOverlay: false })`                                |
| `await guessStyle(tileJSON, options)`                   | `await guessStyle(url, options)` — see note below                 |
| `'basics:icon-cafe'` (sprite id)                        | `'base:icon-cafe'` — but see below                                |

The sprite sheet was renamed `basics` → `base` and the old path is no longer published. Most ids
only need the new prefix, but **22 were renamed or split** (`icon-pharmacy` → `icon-pill`,
`icon-place_of_worship` → one of seven religion icons, …). `SPRITES.md` has the full mapping.

`guessStyle` changed more than its name suggests: it takes the tileset's **URL** where v5 took an
already-fetched `TileJSONSpecification`, and downloads the document itself. Passing a TileJSON object
does not fail loudly — it is stringified into a URL — so this is one to grep for rather than rely on
the type checker. In exchange it now never throws: an invalid argument, a failed download or a
malformed document each yield a blank but valid style.

The palette mappings above were chosen by comparing per-colour RGB distance against the published v5
styles: `graybeard`→`gray` and `eclipse`→`colorful`+dark are near-exact, `neutrino`→`muted` is the
closest of the five, and `shadow`→`gray`+dark is approximate — `shadow` has no close v6 equivalent.

### Removed types

Every other v5 export still resolves — `Color`, `RGB`/`HSL`/`HSV`, `RandomColorOptions`,
`TileJSONSpecification*`, `VectorLayer`, `RecolorOptions`, `GuessStyleOptions`,
`SpriteSpecification`, `StyleVariant`, `getStyleVariants`, `guessStyle` and `satellite`.

| v5 type                 | v6                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `StyleBuilderOptions`   | `OsmOptions`                                                                           |
| `StyleBuilderColors`    | `ColorsOptions`                                                                        |
| `StyleBuilderColorKey`  | `keyof ColorsOptions` (or the `osm.colorKeys` array)                                   |
| `StyleBuilderFonts`     | `TextOptions` (`fontNormal` / `fontBold`)                                              |
| `StyleBuilderFunction`  | — the palette builders are gone; use `osm()`                                           |
| `SatelliteStyleOptions` | `SatelliteOptions`                                                                     |
| `Language`              | — it was just `string \| null`; use `text.language`, with `'local'` in place of `null` |
| `styles` (object)       | — use `osm({ theme })`, or `getStyleVariants()` for the published set                  |
