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
  - [`guessStyle()`](#guessstylesource-options-promise-stylespecification)
  - [`guessSchema()`](#guessschematilejson-schemaguess)
  - [`guessOptions()` and `deriveOptions()`](#guessoptionsstyle-options-promiseoptionsguess)
  - [`isDarkMode()`](#isdarkmode-boolean)
  - [`fetchTileJSON()`](#fetchtilejsonurl-options-promise-tilejsonspecification)
  - [`fetchFontFaces()`](#fetchfontfacesurls-options-promise-fontfaceinfo--undefined)
    - [`fontCovers()`](#fontcoversface-language-boolean--undefined)
    - [`fontScripts()`, `languageScript()`, `textScripts()` and `FONT_SCRIPTS`](#fontscriptsface-string-languagescriptlanguage-string--undefined-textscriptstext-string-and-font_scripts)
  - [`inlineSources()`](#inlinesourcesstyle-options-promise-stylespecification)
  - [`Color`](#color)
  - [Other exports](#other-exports)
  - [Migration from v5](#migration-from-v5)

## Core Principles

- `osm()`, `satellite()` and `guessSchema()` are **synchronous** — no hidden I/O. Only `guessStyle()` is async, because it must read a TileJSON before it can decide what to build.
- All URL configuration lives in a `urls` object; everything else in options is about rendering
- In `urls`, each key accepts a URL string (MapLibre fetches the TileJSON at map load time) or a pre-fetched `TileJSONSpecification` object. A string containing `{z}` is treated as a raw tile template rather than a TileJSON URL.
- A source is emitted with **either** `url` **or** `tiles`, never both — MapLibre gives explicit source options precedence over the document it fetches, so emitting both means fetching a TileJSON and then discarding it.
- `fetchTileJSON` gets a TileJSON when you need one at build time; `inlineSources` resolves an already-built style into a self-contained one.

**Unknown option keys are rejected.** Every options object is checked against the option types, and
a key they do not have throws an error naming its full path — and, for a v5 name, its v6 replacement:
`osm: unknown option "textScale" — in v6 this is "text.scale"`. The unknown keys of one
options object are reported together. Keys set to `undefined` are ignored, and the contents of a pre-fetched TileJSON
passed in `urls` are not options, so they are not checked. `guessStyle()` keeps its never-throws
contract: unknown keys in its options count as an invalid argument and yield the blank style.

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
  markings?: boolean | number; // oneway arrows
  labels?:
    | boolean
    | number
    | {
        boundaries?:
          | boolean
          | number
          | {
              countries?: boolean | number; // label-boundary-country-small/medium/large
              states?: boolean | number; // label-boundary-state
            };
        places?:
          | boolean
          | number
          | {
              cities?: boolean | number; // label-place-capital, -statecapital, -city, -town
              villages?: boolean | number; // label-place-village
              hamlets?: boolean | number; // label-place-hamlet
              districts?: boolean | number; // label-place-suburb, -quarter, -neighbourhood
            };
        streets?:
          | boolean
          | number
          | {
              names?: boolean | number; // label-street-*
              refs?: boolean | number; // label-motorway-shield
              exits?: boolean | number; // label-motorway-exit
            };
        water?:
          | boolean
          | number
          | {
              lakes?: boolean | number; // label-water-area-*
              rivers?: boolean | number; // label-water-river, -stream
            };
        addresses?: boolean | number; // label-address-housenumber
      };
  icons?: boolean | number; // convenience alias for { pois, transit.stops, markings } together
};
```

`labels.places.hamlets` is a group of its own: `labels.places.villages: false` leaves hamlet names
visible, so hiding both takes `villages: false, hamlets: false`, or `places: false` for every settlement
name. The same split applies to their label style in `text.places`.

### Text & icons

`TextOptions` sets the label language and the typography of every label, globally, for a group or for
a single topic. `IconOptions` sets the size and spacing of icons.

```ts
// Every node of the text tree — the root, a group, a topic — takes the same properties.
type LabelStyle = {
  font?: string; // glyph name, e.g. 'noto_sans_regular'
  scale?: number; // multiplies the layer's own text size; default: 1
  spacing?: number; // distance between labels, see below; default: 1
  maxWidth?: number; // wrap width in ems; default: 10
  lineHeight?: number; // line height in ems; default: 1.2
  letterSpacing?: number; // letter spacing in ems; default: 0
  transform?: 'none' | 'uppercase' | 'lowercase'; // default: 'none', see below
  haloWidth?: number; // px; default: 2, see below
  haloBlur?: number; // px; default: 1, see below
};

type TextOptions = LabelStyle & {
  language?: string; // 'local', 'user', 'de', 'en', …; default: 'local'           — root only
  languageStrict?: boolean; // omit labels with no translation; default: false   — root only
  pitchAlignment?: 'map' | 'viewport'; // line labels in a tilted map; default: 'map' — root only
  boundaries?: LabelStyle & { countries?: LabelStyle; states?: LabelStyle };
  places?: LabelStyle & { cities?: LabelStyle; villages?: LabelStyle; hamlets?: LabelStyle; districts?: LabelStyle };
  streets?: LabelStyle & { names?: LabelStyle; refs?: LabelStyle; exits?: LabelStyle };
  water?: LabelStyle & { lakes?: LabelStyle; rivers?: LabelStyle };
  pois?: LabelStyle & { general?: LabelStyle; transit?: LabelStyle }; // POI names, transit stop names
  addresses?: LabelStyle;
};

type IconOptions = {
  scale?: number; // multiplies each icon's own size; default: 1
  spacing?: number; // distance between icons, see below; default: 1
};
```

Each topic takes each property from the nearest node that sets it — the topic, its group, the root —
and otherwise keeps the style's default for that topic. Values never add up: `scale: 2` on `streets`
below `scale: 1.5` on the root gives street names 2. The topics are the groups of `layers.labels`, plus
`pois.general` (POI names) and `pois.transit` (transit stop names); `osm.textGroups` lists the layers
each one sets. `language`, `languageStrict` and `pitchAlignment` apply to every label and are set on the
root only.

```ts
osm({ text: { font: 'fira_sans_regular' } }); // every label
osm({ text: { water: { font: 'fira_sans_regular_italic' } } }); // lake and river names only
osm({
  text: {
    scale: 1.1,
    streets: { letterSpacing: 0.05, refs: { font: 'fira_sans_bold' } },
    addresses: { scale: 0.8, haloWidth: 1 },
  },
  icon: { scale: 1.2 },
});
```

The defaults differ between topics. Every label is set in `noto_sans_regular` with a 2 px halo and a
1 px blur, except:

| Topic                                                                             | Default                                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `streets.refs`                                                                    | `font: 'noto_sans_bold'`, `haloWidth: 0.1`                  |
| `pois.general`                                                                    | `font: 'noto_sans_bold'`, `haloWidth: 0.5`, `haloBlur: 0.5` |
| `streets.exits`                                                                   | `haloWidth: 1`                                              |
| `addresses`                                                                       | `haloWidth: 0`, `haloBlur: 0`                               |
| `boundaries.countries`, `boundaries.states`, `places.hamlets`, `places.districts` | `transform: 'uppercase'`                                    |

The satellite overlay sets every topic in `noto_sans_bold` with a 1 px halo and no blur (house numbers
keep no halo), and setting one overlay topic keeps the others. Font names are not checked, since `osm()`
cannot know which faces a glyph server has; `fetchFontFaces()` lists the faces a server publishes.
`osm.resolveOptions()` spells out every property of every topic, so a UI can show each topic's value.

`spacing` works in two ways, because MapLibre separates symbols by placement. Labels and markings
along a line (street and river names, oneway arrows) repeat at `symbol-spacing`, which is multiplied.
Symbols at a point (places, POIs, house numbers) keep their distance through collision padding, and
MapLibre's 2 px default is too small to multiply, so each step above 1 adds 14 px: `spacing: 2` pads
point labels by 16 px, `spacing: 3` by 30 px. Below 1 the padding shrinks to at most 0 px, which cannot
place labels closer than their own boxes — MapLibre never overlaps them. A POI carries both a name and
an icon: its name takes the text spacing, its icon `icon.spacing`.

`pitchAlignment` decides how labels that follow a line — street, river and motorway names — sit
when the map is tilted: lying on the ground (`'map'`, MapLibre's own behaviour) or standing up facing
the viewer (`'viewport'`), which keeps them readable at high pitch and with terrain. Point labels face
the viewer either way.

`'local'` uses the feature's native name (`name` field); `'user'` reads `navigator.language` when the style is built, falling back to `'local'` where there is no `navigator`. `resolveOptions`, `minimizeOptions` and `toCode` keep `'user'` as it is, so stored options follow each viewer's browser. Use `osm.languages(tileJSON)` / `satellite.languages(tileJSON)` to discover which language codes are available in a given tileset.

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
  tint?: { color?: string; amount?: number }; // amount 0–1; default: 0.5; color default: #ff0000
  // mode-dependent (absolute operations; effect differs between light and dark palettes):
  gamma?: number; // > 0; 1 = no change, < 1 = brighten midtones, > 1 = darken
  contrast?: number; // > 0; 1 = no change, < 1 = flatten, > 1 = increase
  brightness?: number; // 0 = no change; positive = brighter, negative = darker
  blend?: { color?: string; amount?: number }; // amount 0–1; default: 0.5; color default: #ff0000
};
```

### Atmosphere & lighting

Used by both `osm()` and `satellite()`. Require `features.terrain: true` to have any visible effect.

```ts
type SunOptions = {
  direction?: number; // azimuth in degrees; 0 = north, 90 = east; default: 210
  altitude?: number; // elevation in degrees; 0 = horizon, 90 = zenith; default: 60
  anchor?: 'map' | 'viewport'; // whether the light turns with the map; default: 'viewport'
  color?: string; // light color; default: '#ffffff'
  intensity?: number; // 0–1; default: 0.5
};

// `sky` accepts `true` (defaults), `false` (omit the sky block entirely), or an object.
// MapLibre only draws the sky when pitched or in globe projection.
type SkyOptions = {
  skyColor?: string; // color of the sky above the horizon; default: the palette's `colors.water`
  horizonColor?: string; // color at the horizon; default: '#ffffff'
  fogColor?: string; // color of the fog; default: '#ffffff'
  skyHorizonBlend?: number; // 0–1; blend between sky and horizon; default: 0.8
  horizonFogBlend?: number; // 0–1; blend between horizon and fog; default: 0.8
  fogGroundBlend?: number; // 0–1; blend between fog and ground; default: 0.5
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

Each palette is a light theme and has a dark theme of its own, named with a `-dark` suffix (`colorful-dark`, …). To follow the system setting, pick between them with [`isDarkMode()`](#isdarkmode-boolean).

```ts
type Palette =
  | 'colorful'
  | 'colorful-dark'
  | 'natural'
  | 'natural-dark'
  | 'muted'
  | 'muted-dark'
  | 'gray'
  | 'gray-dark'
  | 'toner'
  | 'toner-dark';

type OsmContentOptions = {
  theme?: Palette; // default: 'colorful'
  layers?: LayerGroupOptions;
  text?: TextOptions;
  icon?: IconOptions;
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
osm.palettes:     Palette[]           // ['colorful', 'colorful-dark', 'natural', …, 'toner-dark']
osm.colorKeys:    (keyof ColorsOptions)[]  // all color key names
osm.layerGroups:  LayerGroupMap       // maps each LayerGroupOptions key to the layer IDs it controls
osm.textGroups:   TextGroupMap        // maps each text topic to the text layer IDs its label style sets
osm.defaults:     ResolvedOsmOptions  // fully resolved defaults (theme: 'colorful')
osm.colors(palette: Palette): Record<string, string>
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

`osm.defaults` and `osm.resolveOptions()` fill in every `sky` value except `sky.skyColor`, which stays
unset unless you set it: `osm()` takes it from the palette's `colors.water` when it builds. So a
resolved object can be fed straight back in as options — edit `colors.water` on top of it and the sky
still follows. A UI shows `colors.water` for the sky colour while it is unset.

`osm.supportsLandcover(tileJSON)` tells whether a tileset can back `features.landcover`: it is true
when the `land` layer starts below the zoom where plain Shortbread's first land kind appears (z7), which
means the tiles carry the low-zoom landcover extension. Missing metadata counts as `false`.

`osm.minimizeOptions(options)` returns the smallest options object that builds the same style: every
value equal to its default is dropped, with colours compared against the chosen palette's own
defaults. `osm(osm.minimizeOptions(x))` builds the same style as `osm(x)` — including for a full
`osm.resolveOptions()` object that a UI has edited — so it is the thing to store in a URL or a config
file. A resolved object comes back as small as the options that made it:

- `text` is written as the smallest tree that resolves to the same label styles, one property at a
  time: every topic in `fira_sans_regular` becomes `text: { font: 'fira_sans_regular' }`, and a value
  equal to a topic's own default is left out.
- `layers` collapses every group whose sub-groups all hold the same value: thirteen `false` labels
  become `labels: false`. `icons` is never written — a resolved object sets `pois`, `markings` and
  `transit.stops` itself, so the alias has no effect there.
- `features.terrain`, `features.hillshade` and `sun` become `true` when they equal what `true` resolves to.
- `urls` goes back to `urls.base` when the URLs are its default paths, and is left out on the default base.
- Colours compare by value, so `#bfd9f2` from an `<input type="color">` equals the palette's `#BFD9F2`.
- `recolor.tint` and `recolor.blend` are removed at an amount of 0, and otherwise always carry their amount.

`osm.toCode(options)` returns a runnable snippet for those options, minimised first:

```ts
osm.toCode({ theme: 'gray', text: { scale: 1.5 } });
// returns:
// import { osm, inlineSources } from '@versatiles/style';
//
// const style = await inlineSources(osm({
//   theme: "gray",
//   text: {
//     scale: 1.5
//   },
//   urls: {
//     base: "https://tiles.versatiles.org"
//   }
// }));
```

It always goes through `inlineSources`, because the VersaTiles tile server publishes relative tile
URLs that MapLibre cannot resolve on its own. It always sets `urls.base` too, even where
`minimizeOptions` leaves it out as the default: the default base is the page origin, and a snippet
runs on another page or a server, where it would load tiles, glyphs and sprites from somewhere else.

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

`osm.textGroups` does the same for the text tree: each topic of `text` with the text layers its label
style sets. The topics are the label groups of `layers.labels`, plus `pois.general` and `pois.transit`
for the names drawn with POI and transit-stop icons. It is built from the same group tags, so the two
maps always agree. For a single layer that needs a value no topic gives, these are the IDs for
`map.setLayoutProperty`.

```ts
osm.textGroups.water.rivers; // ['label-water-river', 'label-water-stream']
osm.textGroups.pois.transit; // ['symbol-transit-bus', 'symbol-transit-tram', …]
```

The v5 palette builders (`colorful`, `shadow`, `graybeard`, `eclipse`, `neutrino`) have been removed in v6. Use `osm()` with a `theme` instead — see [Migration from v5](#migration-from-v5) below.

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
satellite.layerGroups: LayerGroupMap // osm.layerGroups, limited to the layers the overlay draws
satellite.textGroups: TextGroupMap // osm.textGroups: the overlay keeps every text layer
satellite.slots: {
  belowLabels:  string // below text labels, above icons/symbols
  belowSymbols: string // below all symbols, above the raster layer
  belowRaster:  string // below the satellite raster layer
} // stable layer IDs for use as MapLibre `beforeId`; omit beforeId to place above everything
satellite.resolveOptions(options?: SatelliteOptions): ResolvedSatelliteOptions
satellite.minimizeOptions(options?: SatelliteOptions): SatelliteOptions
satellite.toCode(options?: SatelliteOptions): string
```

Likewise `satellite.defaults` and `satellite.resolveOptions()` leave `sky.skyColor` unset;
`satellite()` takes it from the overlay's `colors.water`, or leaves it to MapLibre's own sky blue
(`#88C6FC`) when `osmOverlay` is `false`.

`satellite.minimizeOptions` and `satellite.toCode` work the same way. Overlay colours are compared
against the overlay's palette — `gray` unless `osmOverlay.theme` says otherwise — and an overlay
left at its defaults minimises away entirely, since the overlay is on by default.

`osmOverlay.layers` takes the same `LayerGroupOptions` as `osm()`, but the overlay drops every fill and
every land, water, site, airport and tunnel layer, so the imagery stays visible. `satellite.layerGroups`
is `osm.layerGroups` with only what is left: `land`, `water`, `sites`, `airport` and `buildings` are
absent, and `roads` and `transit.rail` have no tunnel layers. A UI over the overlay's layers should
use this map, so that it does not offer switches that change nothing. Those groups are still accepted
in `osmOverlay.layers`, and `satellite.minimizeOptions` removes them.

The OSM vector overlay (roads, boundaries, labels and POIs over the imagery) is rendered by default.
`true` uses the overlay's own defaults, `false` gives bare imagery with no vector layers, and an
object configures it — the same `boolean | object` shape as `features.terrain` and
`features.hillshade`.

The overlay defaults to the `gray` palette rather than `osm()`'s `colorful`: it is drawn over
imagery, so the least saturated palette keeps roads and labels from competing with the photo.
Pass `osmOverlay: { theme: … }` to choose another. Slot anchors are emitted either way,
so `satellite.slots` references stay valid.

---

## `guessStyle(source, options?): Promise<StyleSpecification>`

```ts
guessStyle(
  source: string | TileJSONSpecification,
  options?: {
    urls?: {                          // the same shape as for osm() and satellite()
      base?:          string          // resolves relative URLs; the page origin, or tiles.versatiles.org outside a browser
      glyphsPattern?: string          // where the guessed style loads fonts from
      sprite?:        string | Array<{ id: string; url: string }>
    }
    fetch?: typeof globalThis.fetch   // used when `source` is a URL, as for inlineSources()
  }
)
```

Picks an appropriate style for a tileset: Shortbread vector tiles get a full `osm()` style; unknown
vector tiles get an auto-colored inspector style (one color per source-layer); raster tiles get a basic
raster layer, or a `satellite()` style when the TileJSON's `name` suggests imagery.

`source` is either the **URL** of a TileJSON document, which is downloaded (relative `tiles` resolve
against the document), or a **TileJSON object** you already hold — a tile server has one from its
container's metadata — which is used without any network access (relative `tiles` resolve against `urls.base`). The object is not modified.

It never throws: an invalid `source`, an unknown option key, a failed download or a malformed document
each yield a blank but valid style. It returns a Promise in both forms, so callers need not tell them
apart.

From a URL, a Shortbread or satellite style still _references_ the document; pass it through
[`inlineSources()`](#inlinesourcesstyle-options-promise-stylespecification) to make it self-contained.
From an object, the source is inlined already. `urls.glyphsPattern` and `urls.sprite` apply to the
Shortbread, satellite and inspector styles alike.

---

## `guessSchema(tileJSON): SchemaGuess`

```ts
guessSchema(tileJSON: TileJSONSpecification): SchemaGuess

type SchemaName = 'shortbread' | 'openmaptiles' | 'protomaps'

type SchemaGuess =
  | { type: 'vector'; schema: SchemaName | undefined; candidates: SchemaScore[] }
  | { type: 'raster' }
  | { type: 'unknown' }                // not a TileJSON

type SchemaScore = {
  schema:  SchemaName
  matched: string[]                    // tileset source-layers counted as this schema's
  missing: string[]                    // this schema's source-layers the tileset lacks
  extra:   string[]                    // tileset source-layers not counted as this schema's
  score:   number                      // matched / all tileset source-layers, 0–1
}
```

Recognises the vector schema of a tileset. Synchronous and free of I/O, and takes only a TileJSON
object — download one with [`fetchTileJSON()`](#fetchtilejsonurl-options-promise-tilejsonspecification)
first. It never throws.

It reads `vector_layers` and nothing else; `name` and `attribution` describe who built a tileset, not
what is in it. A source-layer id only one schema uses counts for that schema. The six ids two schemas
share (`boundaries`, `buildings`, `pois`, `landcover`, `landuse`, `water`) are decided by their
`fields` — `class` against `kind`, `admin_level` against `kind_detail` — and count for every schema that
uses them when the fields tell nothing. A schema is recognised when at least half the tileset's
source-layers are its, or at least eight are, and it scores strictly higher than every other schema;
otherwise `schema` is `undefined`. `candidates` lists all three, best first.

It knows all three schemas without importing their styles, so it adds a small table to the root entry
rather than two schemas. `guessStyle()` uses it, and builds OpenMapTiles or Protomaps only when that
schema's function is passed in `schemas`.

---

## `guessOptions(style, options?): Promise<OptionsGuess>`

```ts
import { guessOptions, deriveOptions } from '@versatiles/style/migrate';

guessOptions(
  style: string | StyleSpecification,   // the URL of a style document, or the style itself
  options?: {
    fetch?: typeof globalThis.fetch     // for the style, every TileJSON and the font list
    base?:  string                      // resolves a relative style URL
  }
): Promise<OptionsGuess>

deriveOptions(
  style: StyleSpecification,
  tileJSONs?: Record<string, TileJSONSpecification>,  // per source id, when already at hand
  fontNames?: string[]                                 // glyph names the target glyph server publishes
): OptionsGuess

type OptionsGuess =
  | { kind: 'osm';       options: OsmOptions;       report: GuessReport }
  | { kind: 'satellite'; options: SatelliteOptions; report: GuessReport }
  | { kind: 'unknown';                              report: GuessReport }

type GuessReport = {
  sources:   { id: string; type: string; guess: SchemaGuess }[]
  evidence:  { probe: string; zoom: number; layers: string[] }[]  // what was read, from which layers
  unmatched: string[]                                             // layers nothing read
  warnings:  string[]                                             // what was not carried over
}
```

For moving a map onto VersaTiles: reads a MapLibre style built for **OpenMapTiles, Protomaps or
Shortbread** tiles and returns the options for `osm()` — or `satellite()`, when the style draws imagery
that its vector fills do not cover — whose style looks most like it. The options are minimised, so they
can go straight into `osm.toCode()`. Mapbox styles are not supported.

It lives in its own subpath because it carries the style spec's expression engine, which a caller who
only builds styles should not download. `guessOptions` downloads the style when given a URL, the
TileJSON of every vector source, and the font list of `osm()`'s default glyph server (`fetchFontFaces()`);
`deriveOptions` is the synchronous core and does no I/O. Neither
throws: what cannot be read yields `kind: 'unknown'` with the reason in `report.warnings`.

**How it reads a style.** Nothing is rendered. For each of about sixty _probes_ — a motorway, a forest,
a city label, each with the feature that stands for it in each schema — the style's filters and paint
properties are evaluated with the style spec's own expression engine. That gives, per probe, the fill
colour, the casing, the label colour, halo and size, or the fact that the style draws nothing for it.
A source's schema comes from its TileJSON (`guessSchema`), or from the source-layers the style reads
when there is no TileJSON — as for a `mapbox://` URL.

**How it finds the colours.** `osm()` rarely paints a palette colour as it is: a river is the water
colour saturated and blended, a halo carries the halo colour's alpha. Rather than restating those
derivations, `osm()` is built with perturbed and random palettes, and each probe's colour is fitted
as an affine function of the palette keys it depends on. The foreign style's colours are then inverted
through that model in one least-squares solve. The nearest palette becomes `theme`, and a colour
becomes a `colors` override only where it clearly differs from the palette. The calibration takes
about half a second the first time, once per target and light or dark mode.

**What else it reads:** layer groups the style does not draw (`layers: { pois: false }`), the label
language (`text.language`, `text.languageStrict`), the label size (`text.scale`), whether
street and river names stand up in a tilted map (`text.pitchAlignment`), the fonts
labels are set in (`font` per topic of `text`: a font the glyph server's font list also has as it is —
`Open Sans Bold` → `open_sans_bold` — otherwise its weight on Noto Sans; topics no probe reads follow
their group, then the style's family; without a font list, weights only), extruded
buildings, terrain, hillshade, `light` as `sun`, `sky` where it differs from what `osm()` derives, and
the projection — `mercator` when the style names none. For a satellite style, its `raster-*` paint
properties become `raster`, and its vector layers `osmOverlay`.

**What it does not carry over**, and says so in the warnings: fonts the VersaTiles glyph server does
not publish, beyond their weight, and icons (the VersaTiles sprite is used), zoom-dependent styling beyond the probe's zoom, and anything no probe covers —
listed in `report.unmatched`. Tile URLs are not copied: the options build a style on VersaTiles tiles.

To judge a migration by eye, `npm run migrate-compare -- <style URL> …` renders each style next to its
migration at a few places, with live tiles on both sides, into `scripts/migrate-compare/out/index.html`.

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

Returns `true` if the system preference is dark mode. In Node.js, always returns `false`. Use it to
pick a dark theme when the system asks for one:

```ts
const style = osm({ theme: isDarkMode() ? 'colorful-dark' : 'colorful' });
```

It is read when called, so to follow a later change, listen to the `prefers-color-scheme` media query
and rebuild the style.

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

## `fetchFontFaces(urls?, options?): Promise<FontFaceInfo[] | undefined>`

```ts
fetchFontFaces(
  urls?: { base?: string; glyphsPattern?: string },  // resolved as in osm()
  options?: { fetch?: typeof globalThis.fetch }
)

type FontFaceInfo = {
  id: string          // 'fira_sans_condensed_light_italic' — a value for a `font` in `text`
  family: string      // 'Fira Sans'
  title: string       // 'Fira Sans Condensed Light Italic'
  weight: number      // 300
  italic: boolean
  width: string       // 'normal' | 'condensed' | 'extra-condensed' | …
  codeblocks: string  // the Unicode blocks the face covers, as the server publishes them
}
```

The faces a glyph server publishes, for a font picker over the `font` of each `text` topic. It reads
`font_families.json` from the directory that holds the `{fontstack}` folders of `glyphsPattern`
(default `/assets/glyphs/{fontstack}/{range}.pbf` on `base`), which VersaTiles glyph servers publish,
and returns the faces sorted by family, width, weight and italic.

It resolves to `undefined` when there is no list to read — a pattern without a `{fontstack}` path
segment, a server that does not publish the file, or a document that is not a face list — so a UI can
fall back to a free text field. It rejects only when the request itself fails.

### `fontCovers(face, language): boolean | undefined`

Whether a face from `fetchFontFaces()` has the glyphs to write labels in `language` — for a warning in
a font picker, not a guarantee. `language` is any `text.language`: `'user'` is the browser's language
first. Its script comes from `languageScript()`, and a few sample letters of it are checked against the
`codeblocks` the glyph server lists for the face in its `font_families.json`. Those blocks are coarse, and
a face merged from several font files may list only the first file's blocks, so coverage is a hint. It is
`undefined` for `local` (names in every script), for a language `Intl` cannot place, and for a script it
has no sample letters for. MapLibre GL JS draws CJK ideographs, Hangul and kana with a local browser font
by default, so a `false` for Chinese, Japanese or Korean matters to MapLibre Native only.

```ts
const faces = await fetchFontFaces({ base: 'https://tiles.versatiles.org' });
fontCovers(
  faces!.find((f) => f.id === 'libre_baskerville_regular')!,
  'ru'
); // false
```

### `fontScripts(face): string[]`, `languageScript(language): string | undefined`, `textScripts(text): string[]` and `FONT_SCRIPTS`

For filtering a font picker by writing system. `FONT_SCRIPTS` lists the scripts that can be checked, as
ISO 15924 codes in a fixed order, Latin first: `'Latn'`, `'Cyrl'`, `'Grek'`, `'Armn'`, `'Hebr'`, `'Arab'`,
…, `'Hang'`, `'Hani'`, `'Jpan'`. `fontScripts(face)` returns the ones a face covers, in that order, with the
same sample-letter check against `codeblocks` as `fontCovers()` — `[]` for a face with no blocks.
`languageScript(language)` returns the script labels in a language are written in, as `fontCovers()`
determines it: from `Intl.Locale`, with simplified and traditional Chinese as `'Hani'` and Korean as
`'Hang'`, and `'user'` as the browser's language. It is `undefined` for `'local'`, for a language `Intl`
cannot place, and for a script outside `FONT_SCRIPTS`. So `fontCovers(face, language)` is
`fontScripts(face).includes(languageScript(language))` whenever the script is known.

`textScripts(text)` returns the scripts of `FONT_SCRIPTS` that occur in a string — the labels a map shows,
say — in the same order. It reads each character's Unicode script, so digits, punctuation and spaces count
as none. Japanese is not a Unicode script: kana count as `'Jpan'` and kanji as `'Hani'`, so `'東京タワー'`
is `['Hani', 'Jpan']`, which is what a face needs to cover, since `'Jpan'` in `fontScripts()` checks kana
and an ideograph.

```ts
const faces = (await fetchFontFaces())!;
const latinGreekCyrillic = faces.filter((face) =>
  ['Latn', 'Grek', 'Cyrl'].every((script) => fontScripts(face).includes(script))
);
languageScript('uk'); // 'Cyrl'
languageScript('zh-TW'); // 'Hani'
textScripts('Αθήνα / Athens'); // ['Latn', 'Grek']
```

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

| v5                                                                                                        | v6                                                                                                       |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `colorful(options)`                                                                                       | `osm(options)`                                                                                           |
| `colorful({ baseUrl: 'https://…' })`                                                                      | `osm({ urls: { base: 'https://…' } })`                                                                   |
| `colorful({ tiles: ['https://…'] })`                                                                      | `osm({ urls: { osm: { tiles: ['https://…'] } } })`                                                       |
| `colorful({ hideLabels: true })`                                                                          | `osm({ layers: { labels: false } })`                                                                     |
| `colorful({ textScale: 1.2 })`                                                                            | `osm({ text: { scale: 1.2 } })`                                                                          |
| `colorful({ iconScale: 1.2 })`                                                                            | `osm({ icon: { scale: 1.2 } })`                                                                          |
| `colorful({ fonts: { regular, bold } })`                                                                  | `osm({ text: { font: regular, streets: { refs: { font: bold } }, pois: { general: { font: bold } } } })` |
| `colorful({ language: null })`                                                                            | `osm({ text: { language: 'local' } })`                                                                   |
| `colorful({ language: 'de', languageStrict: true })`                                                      | `osm({ text: { language: 'de', languageStrict: true } })`                                                |
| `await colorful({ terrain: true })`                                                                       | `osm({ features: { terrain: true } })`                                                                   |
| `colorful({ hillshade: true })`                                                                           | `osm({ features: { hillshade: true } })`                                                                 |
| `colorful({ experimental: { buildingHeights: true } })`                                                   | `osm({ features: { buildings: 'extruded' } })`                                                           |
| `colorful({ elevationTilejson: '…' })`                                                                    | `osm({ urls: { elevation: '…' }, features: { terrain: true } })`                                         |
| `colorful({ recolor: { rotate } })`                                                                       | `osm({ recolor: { rotateHue } })`                                                                        |
| `colorful({ recolor: { tintColor } })`                                                                    | `osm({ recolor: { tint: { color } } })`                                                                  |
| `colorful({ recolor: { blendColor } })`                                                                   | `osm({ recolor: { blend: { color } } })`                                                                 |
| `colorful({ bounds: […] })`                                                                               | — removed, no replacement                                                                                |
| `shadow(options)`                                                                                         | `osm({ ...options, theme: 'gray-dark' })`                                                                |
| `graybeard(options)`                                                                                      | `osm({ ...options, theme: 'gray' })`                                                                     |
| `eclipse(options)`                                                                                        | `osm({ ...options, theme: 'colorful-dark' })`                                                            |
| `neutrino(options)`                                                                                       | `osm({ ...options, theme: 'muted' })` _(closest match)_                                                  |
| `satellite({ rasterTilejson: '…' })`                                                                      | `satellite({ urls: { satellite: '…' } })`                                                                |
| `satellite({ overlayTiles: ['https://…'] })`                                                              | `satellite({ urls: { osm: { tiles: ['https://…'] } } })`                                                 |
| `satellite({ rasterSaturation: -0.3 })`                                                                   | `satellite({ raster: { saturation: -0.3 } })`                                                            |
| `satellite({ rasterOpacity, rasterHueRotate, rasterBrightnessMin, rasterBrightnessMax, rasterContrast })` | the same names, uncapitalized, under `satellite({ raster: {…} })`                                        |
| `satellite({ overlay: false })`                                                                           | `satellite({ osmOverlay: false })`                                                                       |
| `satellite({ language, textScale, iconScale })`                                                           | the overlay's own options, under `satellite({ osmOverlay: {…} })`                                        |
| `await guessStyle(tileJSON, options)`                                                                     | `await guessStyle(tileJSON, { urls: { base } })` — see note below                                        |
| `'basics:icon-cafe'` (sprite id)                                                                          | `'base:icon-cafe'` — but see below                                                                       |
| `'markers:icon-bicycle'` (sprite id)                                                                      | `'icons:bicycle'` — but see below                                                                        |

`bounds` is the only v5 option with no v6 equivalent: it is rejected with `"bounds" was removed in v6`.
Set the bounds on the map instead of in the style.

v5 shipped **two** sprite sheets, and both changed. `basics` was renamed `base`, and the old path is no
longer published; most ids only need the new prefix, but **22 were renamed or split**
(`icon-pharmacy` → `icon-pill`, `icon-place_of_worship` → one of seven religion icons, …). `markers`
was split into `extras` and `icons`, whose ids drop the group prefix — and watch the arrows, because
`symbol-arrow1` and `symbol-arrow2` each shift by one. `SPRITES.md` has the full mapping for both
sheets, under "Migrating sprite ids from v5".

`guessStyle` still accepts the TileJSON object v5 took, and now also a URL, which it downloads. Its options now use the same `urls` shape as `osm()`: v5's `baseUrl`, `glyphs` and `sprite` are
`urls.base`, `urls.glyphsPattern` and `urls.sprite`. Because
`guessStyle` never throws, the old option names do not fail loudly — they are unknown keys, which yield
a blank style — so this is one to grep for. It returns a Promise in both forms.

The palette mappings above name the closest v6 theme in character. They were chosen by per-colour RGB
distance against the published v5 styles, but the v6 themes have since been retuned against `colorful`,
so none of the four reproduces its v5 style exactly. A v5 style name passed as `theme` is rejected with
an error naming its v6 theme.

**Colour keys were renamed.** v5's 41 `colors` keys became 45: 7 kept their name
(`boundary`, `building`, `glacier`, `label`, `labelHalo`, `land`, `water`), 34 gained a group prefix, and 4 are new
(`background`, `siteSports`, `labelHousenumber`, `labelWater`). A v5 colour key that is not renamed is rejected with an error naming its v6 key.

| v5             | v6                  |
| -------------- | ------------------- |
| `agriculture`  | `natureAgriculture` |
| `buildingbg`   | `buildingBg`        |
| `burial`       | `areaBurial`        |
| `commercial`   | `areaCommercial`    |
| `construction` | `siteConstruction`  |
| `cycle`        | `transitCycle`      |
| `danger`       | `siteDanger`        |
| `disputed`     | `boundaryDisputed`  |
| `education`    | `siteEducation`     |
| `foot`         | `transitFoot`       |
| `grass`        | `natureGrass`       |
| `hospital`     | `siteHospital`      |
| `industrial`   | `areaIndustrial`    |
| `leisure`      | `natureLeisure`     |
| `motorway`     | `roadMotorway`      |
| `motorwaybg`   | `roadMotorwayBg`    |
| `park`         | `naturePark`        |
| `parking`      | `siteParking`       |
| `poi`          | `labelPoi`          |
| `prison`       | `sitePrison`        |
| `rail`         | `transitRail`       |
| `residential`  | `areaResidential`   |
| `rock`         | `natureRock`        |
| `sand`         | `natureSand`        |
| `shield`       | `labelShield`       |
| `street`       | `roadStreet`        |
| `streetbg`     | `roadStreetBg`      |
| `subway`       | `transitSubway`     |
| `symbol`       | `labelSymbol`       |
| `trunk`        | `roadTrunk`         |
| `trunkbg`      | `roadTrunkBg`       |
| `waste`        | `areaWaste`         |
| `wetland`      | `natureWetland`     |
| `wood`         | `natureWood`        |

### Removed types

Every other v5 export still resolves — `Color`, `RGB`/`HSL`/`HSV`, `RandomColorOptions`,
`TileJSONSpecification*`, `VectorLayer`, `RecolorOptions`, `GuessStyleOptions`,
`SpriteSpecification`, `StyleVariant`, `getStyleVariants`, `guessStyle` and `satellite`.

| v5 type                 | v6                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `StyleBuilderOptions`   | `OsmOptions`                                                                           |
| `StyleBuilderColors`    | `ColorsOptions`                                                                        |
| `StyleBuilderColorKey`  | `keyof ColorsOptions` (or the `osm.colorKeys` array)                                   |
| `StyleBuilderFonts`     | `LabelStyle` (`font` on each node of `text`)                                           |
| `StyleBuilderFunction`  | — the palette builders are gone; use `osm()`                                           |
| `SatelliteStyleOptions` | `SatelliteOptions`                                                                     |
| `Language`              | — it was just `string \| null`; use `text.language`, with `'local'` in place of `null` |
| `styles` (object)       | — use `osm({ theme })`, or `getStyleVariants()` for the published set                  |
