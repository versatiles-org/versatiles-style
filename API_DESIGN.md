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
  - [`guessStyle()`](#guessstyletilejson-options-stylespecification)
  - [`isDarkMode()`](#isdarkmode-boolean)
  - [`fetchTileJSON()`](#fetchtilejsonurl-options-promise-tilejsonspecification)
  - [`Color`](#color)
  - [Migration from v5](#migration-from-v5)

## Core Principles

- All style functions are **synchronous** — no hidden I/O
- All URL configuration lives in a `urls` object; everything else in options is about rendering
- In `urls`, each key accepts a URL string (MapLibre fetches the TileJSON at map load time) or a pre-fetched `TileJSONSpecification` object
- `fetchTileJSON` is only needed when TileJSON metadata must be available at build time (e.g. `guessStyle`)

---

## Shared Types

### Layer visibility

Each key in `LayerGroupOptions` accepts `true`/`false` to show or hide, a `number` (0–1) to set opacity, or — for grouped keys — an object to configure sub-groups individually.

```ts
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
              residential?: boolean | number; // street-residential, street-livingstreet, street-unclassified
              service?: boolean | number; // street-service (driveways, parking aisles, access roads)
              pedestrian?: boolean | number; // street-pedestrian, street-pedestrian-zone
              track?: boolean | number; // street-track
              bus?: boolean | number; // street-busway, street-busguideway
            };
        paths?: boolean | number; // footway, steps, path, cycleway
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
      };
  icons?: boolean | number; // convenience alias for { pois, transit.stops, markings } together
};
```

### Text & icons

`LabelsOptions` sets the language and fonts for all text labels. `LayoutOptions` controls the size and density of both labels and icons.

```ts
type LabelsOptions = {
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

`ColorsOptions` sets named color values for the palette. `RecolorOptions` applies post-processing transforms on top of the resolved palette — useful for tinting, greyscale, or contrast adjustments without redefining individual colors.

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
};

type RecolorOptions = {
  // mode-independent (same visual effect on light and dark palettes):
  invertBrightness?: boolean; // flip lightness of all colors
  rotateHue?: number; // hue rotation in degrees; 0 = no change
  saturate?: number; // -1 = greyscale, 0 = no change, +1 = double
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
  labels?: LabelsOptions;
  layout?: LayoutOptions;
  colors?: ColorsOptions;
  recolor?: RecolorOptions;
};

type OsmOptions = OsmContentOptions & {
  urls?: {
    base?: string; // defaults to hostname (browser) or required in Node.js
    osm?: string | TileJSONSpecification; // defaults to "/tiles/osm/tiles.json"
    elevation?: string | TileJSONSpecification; // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string; // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?: string | Array<{ id: string; url: string }>; // defaults to [{ id: "basics", url: "/assets/sprites/basics/sprites" }]
  };
  features?: {
    terrain?: boolean | { exaggeration?: number };
    hillshade?: HillshadeOptions;
    landcover?: boolean; // ESA WorldCover at z0–z10; default: false
    buildings?: 'flat' | 'extruded'; // default: 'flat'
  };
  sun?: SunOptions;
  sky?: SkyOptions;
};

type SatelliteOptions = {
  urls?: {
    base?: string; // defaults to hostname (browser) or required in Node.js
    satellite?: string | TileJSONSpecification; // defaults to "/tiles/satellite/tiles.json"
    osm?: string | TileJSONSpecification; // defaults to "/tiles/osm/tiles.json"
    elevation?: string | TileJSONSpecification; // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string; // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?: string | Array<{ id: string; url: string }>; // defaults to [{ id: "basics", url: "/assets/sprites/basics/sprites" }]
  };
  osmOverlay?: false | OsmContentOptions; // default: false
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
    terrain?: boolean | { exaggeration?: number };
    hillshade?: HillshadeOptions;
  };
  sun?: SunOptions;
  sky?: SkyOptions;
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
osm.layerGroups:  LayerGroupOptions   // maps each LayerGroupOptions key to its layer IDs
osm.defaults:     ResolvedOsmOptions  // fully resolved defaults (palette: 'colorful', darkMode: false)
osm.colors(palette: Palette, darkMode: boolean): Record<string, string>
osm.languages(tileJSON: TileJSONSpecification): string[]
osm.slots: {
  belowLabels:  string  // below text labels, above icons/symbols
  belowSymbols: string  // below all symbols, above streets
  belowStreets: string  // below streets, above fill layers
  belowFills:   string  // below all fill layers
} // stable layer IDs for use as MapLibre `beforeId`; omit beforeId to place above everything
osm.resolveOptions(options?: OsmOptions): ResolvedOsmOptions
```

`colorful`, `shadow`, `graybeard`, `eclipse`, and `neutrino` are deprecated aliases. Prefer `osm()` with an explicit `theme.palette` and `theme.darkMode` in new code.

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
```

When `osmOverlay` is omitted or `false`, no vector labels or POIs are rendered.

---

## `guessStyle(tileJSON, options?): StyleSpecification`

```ts
guessStyle(
  tileJSON: TileJSONSpecification,
  {
    urls?: {
      base?:          string
      glyphsPattern?: string
      sprite?:        string | Array<{ id: string; url: string }>
    }
  }
)
```

Inspects `tileJSON` and picks an appropriate style automatically: Shortbread vector tiles get a full osm style; unknown vector tiles get an auto-colored inspector style (one color per source-layer); raster tiles get a basic raster layer. Never throws — invalid fields are silently dropped.

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

Only needed when TileJSON metadata must be available at style-build time — primarily for `guessStyle`. For `osm` and `satellite`, passing a URL string in `urls` is simpler and keeps the call synchronous.

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
color.saturate(ratio: number): Color             // -1 = greyscale, 0 = identity, +1 = double
color.gamma(value: number): Color                // < 1 = brighten midtones, > 1 = darken
color.contrast(value: number): Color             // > 1 = more contrast
color.brightness(value: number): Color           // -1 to +1
color.tint(amount: number, color: Color): Color  // 0–1; shift hue toward color
color.blend(amount: number, color: Color): Color // 0–1; linear mix toward color
color.fade(amount: number): Color                // 0–1; reduce alpha
```

---

## Migration from v5

| v5                                                      | v6                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `colorful(options)`                                     | `osm(options)`                                                    |
| `colorful({ baseUrl: 'https://…' })`                    | `osm({ urls: { base: 'https://…' } })`                            |
| `colorful({ tiles: ['https://…'] })`                    | `osm({ urls: { osm: { tiles: ['https://…'] } } })`                |
| `colorful({ hideLabels: true })`                        | `osm({ layers: { labels: false } })`                              |
| `colorful({ textScale: 1.2 })`                          | `osm({ layout: { labels: { scale: 1.2 } } })`                     |
| `colorful({ language: null })`                          | `osm({ labels: { language: 'local' } })`                          |
| `colorful({ language: 'de', languageStrict: true })`    | `osm({ labels: { language: 'de', languageStrict: true } })`       |
| `await colorful({ terrain: true })`                     | `osm({ features: { terrain: true } })`                            |
| `colorful({ experimental: { buildingHeights: true } })` | `osm({ features: { buildings: 'extruded' } })`                    |
| `colorful({ elevationTilejson: '…' })`                  | `osm({ urls: { elevation: '…' }, features: { terrain: true } })`  |
| `shadow(options)`                                       | `osm({ ...options, theme: { palette: 'gray', darkMode: true } })` |
| `graybeard(options)`                                    | `osm({ ...options, theme: { palette: 'gray' } })`                 |
| `eclipse(options)`                                      | `osm({ ...options, theme: { darkMode: true } })` _(approximate)_  |
| `satellite({ overlayTiles: ['https://…'] })`            | `satellite({ urls: { osm: { tiles: ['https://…'] } } })`          |
| `satellite({ rasterSaturation: -0.3 })`                 | `satellite({ raster: { saturation: -0.3 } })`                     |
