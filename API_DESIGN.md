# API Design

## Core Principles

- All style functions are **synchronous** — no hidden I/O
- All URL configuration lives in a `urls` object; everything else in options is about rendering
- In `urls`, each key accepts a URL string (MapLibre fetches the TileJSON at map load time) or a pre-fetched `TileJSONSpecification` object
- `fetchTileJSON` is only needed when TileJSON metadata must be available at build time (e.g. `guessStyle`)

---

## Shared Types

```ts
type IconsOptions = false | {  // false = hide all symbols
  scale?:   number             // size multiplier; default: 1
  spacing?: number             // exclusion-radius multiplier; >1 = fewer icons
}

type SunOptions = {
  direction?: number  // azimuth in degrees; 0 = north, 90 = east; default: 315
  altitude?:  number  // elevation in degrees; 0 = horizon, 90 = zenith; default: 45
  color?:     string  // light color; default: '#ffffff'
  intensity?: number  // 0–1; default: 0.5
}

type SkyOptions = {
  skyColor?:         string  // color of the sky above the horizon; default: '#87CEEB'
  horizonColor?:     string  // color at the horizon; default: '#ffffff'
  skyHorizonBlend?:  number  // 0–1; blend between sky and horizon; default: 0.5
  horizonFogBlend?:  number  // 0–1; blend between horizon and fog; default: 0.5
  atmosphereBlend?:  number  // 0–1; atmospheric haze intensity; default: 0
}

type LabelsOptions = false | {  // false = hide all labels
  language?:        string   // 'local', 'user', 'de', 'en', …; default: 'local'
  languageStrict?:  boolean  // omit labels with no translation; default: false
  scale?:           number   // size multiplier; default: 1
  spacing?:         number   // exclusion-radius multiplier; >1 = fewer labels
  fontNormal?:      string   // regular font name
  fontBold?:        string   // bold font name
}

type HillshadeOptions = boolean | {
  exaggeration?:   number              // default: 0.1
  shadowColor?:    string              // default: '#000000'
  highlightColor?: string              // default: '#ffffff'
  accentColor?:    string              // default: '#000000'
  anchor?:         'map' | 'viewport'  // default: 'map'
}

type RecolorOptions = {
  // mode-independent (same visual effect on light and dark palettes):
  invertBrightness?: boolean                         // flip lightness of all colors
  rotateHue?:        number                          // hue rotation in degrees; 0 = no change
  saturate?:         number                          // -1 = greyscale, 0 = no change, +1 = double
  tint?:             { color: string; amount?: number }  // amount 0–1; default: 1
  // mode-dependent (absolute operations; effect differs between light and dark palettes):
  adjustGamma?:      number                          // > 0; 1 = no change, < 1 = brighten midtones, > 1 = darken
  adjustContrast?:   number                          // > 0; 1 = no change, < 1 = flatten, > 1 = increase
  adjustBrightness?: number                          // 0 = no change; positive = brighter, negative = darker
  blend?:            { color: string; amount?: number }  // amount 0–1; default: 1
}
```

`'local'` uses the feature's native name (`name` field); `'user'` reads `navigator.language` at call time (falls back to `'local'` in Node.js). Use `osm.languages(tileJSON)` / `satellite.languages(tileJSON)` to discover which language codes are available in a given tileset.

---

## `osm(options?): StyleSpecification`

```ts
osm({
  urls?: {
    base?:          string  // defaults to hostname (browser) or required in Node.js
    osm?:           string | TileJSONSpecification  // defaults to "/tiles/osm/tiles.json"
    elevation?:     string | TileJSONSpecification  // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string  // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?:        string | Array<{ id: string; url: string }>  // defaults to [{ id: "basics", url: "/assets/sprites/basics/sprites" }]
  }
  theme?: {
    darkMode?: boolean | 'auto'                                     // default: false; 'auto' = system preference (browser only)
    palette?:  'colorful' | 'natural' | 'muted' | 'gray' | 'toner'  // default: 'colorful'
  }
  labels?:  LabelsOptions
  icons?:   IconsOptions
  colors?: {
    background?: string  // canvas color and anchor for derived computations; default: white (light) / black (dark)
    land?:       string  // land surface color (slightly offset from background)
    water?:      string  // 41 keys total: water, wood, grass, street, motorway, building, label, …
    // …
  }
  recolor?: RecolorOptions
  features?: {
    terrain?:   boolean | { exaggeration?: number }
    hillshade?: HillshadeOptions
    landcover?: boolean              // ESA WorldCover at z0–z10; default: false
    buildings?: 'flat' | 'extruded'  // default: 'flat'
  }
  sun?: SunOptions
  sky?: SkyOptions
})
```

Static properties for introspection:

```ts
osm.palettes:   string[]            // ['colorful', 'natural', 'muted', 'gray', 'toner']
osm.colorKeys:  string[]            // all 41 color key names
osm.defaults:   ResolvedOsmOptions  // fully resolved defaults (palette: 'colorful', darkMode: false)
osm.colors(theme?: { palette?: string; darkMode?: boolean }): Record<string, string>
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
satellite({
  urls?: {
    base?:          string                          // defaults to hostname (browser) or required in Node.js
    satellite?:     string | TileJSONSpecification  // defaults to "/tiles/satellite/tiles.json"
    osm?:           string | TileJSONSpecification  // defaults to "/tiles/osm/tiles.json"
    elevation?:     string | TileJSONSpecification  // defaults to "/tiles/elevation/tiles.json"
    glyphsPattern?: string                          // defaults to "/assets/glyphs/{fontstack}/{range}.pbf"
    sprite?:        string | Array<{ id: string; url: string }>  // defaults to [{ id: "basics", url: "/assets/sprites/basics/sprites" }]
  }
  osmOverlay?: false | {   // default: false
    labels?: LabelsOptions
    icons?: IconsOptions
    colors?: {
      // like 'colors' in osm(), but with reduced set (e.g. no water, land, …)
    }
  }
  recolor?: RecolorOptions
  raster?: { // keys mirror MapLibre's raster-* paint properties
    opacity?:       number
    hueRotate?:     number
    brightnessMin?: number
    brightnessMax?: number
    saturation?:    number
    contrast?:      number
  }
  features?: {
    terrain?:   boolean | { exaggeration?: number }
    hillshade?: HillshadeOptions
  }
  sun?: SunOptions
  sky?: SkyOptions
})
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
|---------------------------------------------------------|-------------------------------------------------------------------|
| `colorful(options)`                                     | `osm(options)`                                                    |
| `colorful({ baseUrl: 'https://…' })`                    | `osm({ urls: { base: 'https://…' } })`                            |
| `colorful({ tiles: ['https://…'] })`                    | `osm({ urls: { osm: { tiles: ['https://…'] } } })`                |
| `colorful({ hideLabels: true })`                        | `osm({ labels: false })`                                          |
| `colorful({ textScale: 1.2 })`                          | `osm({ labels: { scale: 1.2 } })`                                 |
| `colorful({ language: null })`                          | `osm({ labels: { language: 'local' } })`                          |
| `colorful({ language: 'de', languageStrict: true })`    | `osm({ labels: { language: 'de', languageStrict: true } })`       |
| `await colorful({ terrain: true })`                     | `osm({ features: { terrain: true } })`                            |
| `colorful({ experimental: { buildingHeights: true } })` | `osm({ features: { buildings: 'extruded' } })`                    |
| `colorful({ elevationTilejson: '…' })`                  | `osm({ urls: { elevation: '…' }, features: { terrain: true } })`  |
| `shadow(options)`                                       | `osm({ ...options, theme: { palette: 'gray', darkMode: true } })` |
| `graybeard(options)`                                    | `osm({ ...options, theme: { palette: 'gray' } })`                 |
| `eclipse(options)`                                      | `osm({ ...options, theme: { darkMode: true } })` *(approximate)*  |
| `satellite({ overlayTiles: ['https://…'] })`            | `satellite({ urls: { osm: { tiles: ['https://…'] } } })`          |
| `satellite({ rasterSaturation: -0.3 })`                 | `satellite({ raster: { saturation: -0.3 } })`                     |
