[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Style

**VersaTiles Style** generates styles and sprites for MapLibre.

> **Upgrading from v5?** v6 is a breaking release: the palette builders (`colorful`, `shadow`, …) are
> replaced by `osm({ theme })`, options are grouped (`textScale` → `text.scale`), all 34 of
> the renamed colour keys moved under a group prefix, and both sprite sheets were renamed.
> Unknown option keys now throw, and the error names the v6 replacement.
>
> - **[Migration from v5](API_DESIGN.md#migration-from-v5)** — the full option, colour-key and type tables.
> - **[Migrating sprite ids from v5](SPRITES.md#migrating-sprite-ids-from-v5)** — `basics` → `base` and `markers` → `extras`/`icons`.
> - **[CHANGELOG](CHANGELOG.md)** — every breaking change in 6.0.0.

---

## Styles Overview

The `osm()` function renders OpenStreetMap vector tiles using one of five built-in color palettes,
each available as a light theme and a dark one (`colorful-dark`, …). `satellite()` renders raster/satellite tiles with an optional
vector overlay.

| Palette       | Preview                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| **colorful**  | <img width="384" src="https://versatiles.org/versatiles-style/colorful.png" alt="colorful style" />   |
| **natural**   | <img width="384" src="https://versatiles.org/versatiles-style/natural.png" alt="natural style" />     |
| **muted**     | <img width="384" src="https://versatiles.org/versatiles-style/muted.png" alt="muted style" />         |
| **gray**      | <img width="384" src="https://versatiles.org/versatiles-style/gray.png" alt="gray style" />           |
| **toner**     | <img width="384" src="https://versatiles.org/versatiles-style/toner.png" alt="toner style" />         |
| **satellite** | <img width="384" src="https://versatiles.org/versatiles-style/satellite.png" alt="satellite style" /> |

---

## Using VersaTiles Styles

### Prebuilt Styles and Sprites

Download the assets from the [latest release](https://github.com/versatiles-org/versatiles-style/releases/latest/):

- **[styles.tar.gz](https://github.com/versatiles-org/versatiles-style/releases/latest/download/styles.tar.gz):** Contains all styles in multiple languages.
  - **Note:** These styles use `tiles.versatiles.org` as the source for tiles, fonts (glyphs), and icons (sprites).
- **[sprites.tar.gz](https://github.com/versatiles-org/versatiles-style/releases/latest/download/sprites.tar.gz):** Includes map icons and other sprites.
- **[Sprite overview](https://versatiles.org/versatiles-style/sprites.html):** every icon in all three sheets, with its sprite ID, title and aliases.
- **[versatiles-style.tar.gz](https://github.com/versatiles-org/versatiles-style/releases/latest/download/versatiles-style.tar.gz):** Contains a JavaScript file to generate styles dynamically in the browser.

---

## Generating Styles On-the-Fly

### Frontend Usage (Web Browser)

Download the latest release:

```bash
curl -Ls "https://github.com/versatiles-org/versatiles-style/releases/latest/download/versatiles-style.tar.gz" | gzip -d | tar -xf -
```

Integrate it into your HTML application:

```html
<div id="map"></div>
<script src="maplibre-gl.js"></script>
<script src="versatiles-style.js"></script>
<script>
  (async () => {
    const style = VersaTilesStyle.osm({
      theme: 'colorful-dark',
      text: { language: 'de' },
      recolor: { gamma: 0.5 },
    });

    const map = new maplibregl.Map({
      container: 'map',
      style: await VersaTilesStyle.inlineSources(style),
    });
  })();
</script>
```

> **`inlineSources` is required, not optional.** `osm()` and `satellite()` are synchronous and do no
> I/O: they leave each source as a `{ type, url }` reference to a TileJSON and let MapLibre fetch it.
> That works only if the TileJSON lists absolute tile URLs — and the VersaTiles ones list **relative**
> templates (`/tiles/osm/{z}/{x}/{y}`), which MapLibre does not resolve. Handing such a style straight
> to `new maplibregl.Map()` fails with
> `Request constructor: /tiles/osm/2/2/2 is not a valid URL` and no tiles appear.
>
> `inlineSources` fetches the TileJSON and folds it in, so the tile URLs come out absolute and the
> attribution, bounds and maxzoom it carries are preserved. That last part matters: the attribution
> is a licensing obligation.
>
> If your own tile server publishes absolute tile URLs, you can skip it and stay fully synchronous.

> **Requires MapLibre GL JS 5.0 or newer.**
> The generated styles set the [`globe` projection](https://maplibre.org/maplibre-style-spec/projection/)
> and a root [`sky`](https://maplibre.org/maplibre-style-spec/sky/). Older versions ignore both and
> render a flat Mercator map with no sky — everything else works, so this degrades rather than breaks.
>
> npm users have this checked automatically through an optional peer dependency. Loading MapLibre
> from a `<script>` tag, as above, bypasses that check entirely — so verify the version yourself.
> To stay on Mercator deliberately, pass `projection: 'mercator'`.

### Backend Usage (Node.js)

Install the library via NPM:

```bash
npm install @versatiles/style
```

Generate styles programmatically:

```javascript
import { osm, inlineSources } from '@versatiles/style';
import { writeFileSync } from 'node:fs';

const style = osm({
  theme: 'colorful',
  text: { language: 'en' },
});
// resolves the TileJSON reference into absolute tile URLs — see the note above
writeFileSync('style.json', JSON.stringify(await inlineSources(style)));
```

The CDN bundle exposes `osm()`, `satellite()`, `guessStyle()`, `guessSchema()`, `inlineSources()`,
`fetchTileJSON()`, `Color` and the rest of the documented API. Three things ship in the npm package
only, because they serve tooling rather than pages: `minimizeOptions()` and `toCode()` on
`osm`/`satellite` (storing options, emitting a snippet — a style editor's job) and `getStyleVariants()`
(enumerating every published variant — the release pipeline's job). The font-discovery helpers
(`fetchFontFaces()`, `fontCovers()`, `fontScripts()`, `languageScript()`, `textScripts()`,
`FONT_SCRIPTS`) are npm-only for the same reason: they serve a font picker, not a map.

A `style.json` written without `inlineSources` still carries a `url` reference, so whoever loads it
hits the same relative-tile problem. This is exactly what the published styles do — `build-styles.ts`
calls `inlineSources` before writing each one.

---

## Style Generation Methods

`osm()` and `satellite()` are **synchronous** and do no I/O; `guessStyle()` is **asynchronous**,
because it has to read the TileJSON before it can decide what to build. All three return a MapLibre
`StyleSpecification` — pass it through `inlineSources` before handing it to MapLibre, as above:

- `osm(options)` - OpenStreetMap vector style. [Documentation](https://versatiles.org/versatiles-style/variables/osm.html)
  - `theme`: a palette name (`'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`), or its dark theme with a `-dark` suffix (`'colorful-dark'`, …).
  - `text`: label language, scale and font — per label topic where wanted (`{ language: 'de', font: 'noto_sans_regular', pois: { general: { scale: 1.2 } } }`).
  - `icon`, `sky`, `sun`, `projection`: icon sizing, the sky block, the 3D light, and the map projection.
  - `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/types/OsmOptions.html).
- `satellite(options)` - raster/satellite style with an optional OSM overlay. [Documentation](https://versatiles.org/versatiles-style/variables/satellite.html) — see [SatelliteOptions](https://versatiles.org/versatiles-style/types/SatelliteOptions.html).
- `guessStyle(source)` - inspect a tileset, given as a TileJSON URL or object, and return the most appropriate style. [Documentation](https://versatiles.org/versatiles-style/functions/guessStyle.html)

```javascript
import { guessStyle } from '@versatiles/style';
const style = await guessStyle(tileJSON); // or the URL of a TileJSON document
```

- `guessSchema(tileJSON)` - recognise a vector tileset's schema (`'shortbread' | 'openmaptiles' | 'protomaps'`) from its TileJSON object, synchronously and without I/O. It reads only `vector_layers`, and scores every schema so a caller can see why. [Documentation](https://versatiles.org/versatiles-style/functions/guessSchema.html)

```javascript
import { guessSchema } from '@versatiles/style';
const guess = guessSchema(tileJSON); // { type: 'vector', schema: 'openmaptiles', candidates: [...] }
```

- `guessOptions(style)` - from `@versatiles/style/migrate`: read a MapLibre style built for OpenMapTiles, Protomaps or Shortbread tiles, and return the `osm()` or `satellite()` options whose style looks most like it — for moving a map onto VersaTiles. `deriveOptions(style, tileJSONs?, fontNames?)` is its synchronous, I/O-free core.

```javascript
import { osm } from '@versatiles/style';
import { guessOptions } from '@versatiles/style/migrate';
const guess = await guessOptions('https://example.org/my-style/style.json');
if (guess.kind === 'osm') map.setStyle(osm(guess.options)); // guess.report says what was not carried over
```

- `fetchFontFaces(urls?)`, `fontCovers(face, language)`, `fontScripts(face)`, `languageScript(language)`, `textScripts(text)`, `FONT_SCRIPTS` and `labelLanguage(language)` - for a font picker over the `font` of each `text` topic: the faces a glyph server publishes (from its `font_families.json`), with titles; whether a face has the glyphs for a label language; which writing systems a face covers, read from the `codeblocks` in that file — a hint, not a guarantee — and which a text uses; and the language `'user'` stands for. `osm.textGroups` lists the layers each topic sets.

```javascript
import { fetchFontFaces, fontCovers, fontScripts } from '@versatiles/style';
const faces = await fetchFontFaces(); // undefined when the server publishes no list
const forGreek = faces?.filter((face) => fontCovers(face, 'el') !== false);
const forCyrillic = faces?.filter((face) => fontScripts(face).includes('Cyrl'));
```

---

## Build Instructions

### Prerequisites

To build new sprites, ensure `optipng` is installed.

### SVG Source Requirements

- SVGs must consist only of paths and should not contain any `transform()` attributes.
- Styles and colors within the SVG are ignored.
- All length values must be specified in pixels without units.

### Recommended icon sources

When adding new icons, [Pinhead Map Icons](https://pinhead.ink/) ([source](https://github.com/waysidemapping/pinhead)) is a useful starting point — a CC0-licensed collection of 1000+ cartographic SVGs designed to be legible at pin-marker scale, unifying icons from Maki, Temaki, OSM Carto, and NPMap.

### Configuration

Define icon sets in the configuration file: [`scripts/config/sprites.ts`](./scripts/config/sprites.ts)

---

## Development

Run the project in development mode:

```bash
npm run dev
```

A local server will be available at <http://localhost:8080>. Use it to select a style, edit definitions in `src/themes/...` and `src/shortbread/...`, and reload the page to view the changes.

### Dependency Graph

<!--- This chapter is generated automatically --->

```mermaid
---
config:
  layout: elk
---
flowchart TB

subgraph 0["src"]
subgraph 1["api"]
2["code.ts"]
O["guessSchema.ts"]
Z["guessStyle.ts"]
14["osm.ts"]
1O["satellite.ts"]
1P["index.ts"]
1Q["schema-builder.ts"]
end
subgraph 3["options"]
4["index.ts"]
5["minimize.ts"]
F["osm.ts"]
subgraph G["parts"]
H["* (18 files)"]
end
M["satellite.ts"]
N["osm-overlay.ts"]
end
subgraph 6["color"]
7["index.ts"]
8["color.ts"]
9["convert.ts"]
A["ops.ts"]
B["space.ts"]
C["parser.ts"]
D["serialize.ts"]
E["recolor.ts"]
1T["random.ts"]
end
subgraph I["themes"]
J["* (7 files)"]
end
subgraph K["lib"]
L["utils.ts"]
P["index.ts"]
Q["fetchTileJSON.ts"]
R["loadTileSource.ts"]
S["inlineSources.ts"]
T["tileSource.ts"]
U["languages.ts"]
V["opacity.ts"]
W["schema-signatures.ts"]
X["styleMeta.ts"]
Y["symbol-layout.ts"]
1V["fetchFontFaces.ts"]
1W["fontCovers.ts"]
1Y["schema-audit.ts"]
end
subgraph 10["types"]
11["index.ts"]
12["tilejson.ts"]
13["vector_layer.ts"]
2P["maplibre.ts"]
end
subgraph 15["features"]
16["* (10 files)"]
end
subgraph 17["shortbread"]
18["index.ts"]
19["context.ts"]
1H["groups.ts"]
subgraph 1I["layers"]
1J["* (13 files)"]
end
1K["schema.ts"]
1N["layer-groups-map.ts"]
end
subgraph 1A["dsl"]
1B["index.ts"]
1C["assemble.ts"]
1D["build.ts"]
1E["text.ts"]
1F["context.ts"]
1G["group-maps.ts"]
end
subgraph 1L["cartography"]
1M["* (6 files)"]
end
1R["browser.ts"]
1S["exports.ts"]
1U["index.ts"]
1X["variants.ts"]
subgraph 1Z["migrate"]
20["calibrate.ts"]
21["evaluate.ts"]
22["math.ts"]
23["probes.ts"]
24["derive.ts"]
25["guess.ts"]
26["index.ts"]
end
subgraph 27["omt"]
28["api.ts"]
29["context.ts"]
2A["schema.ts"]
2B["layer-groups-map.ts"]
subgraph 2C["layers"]
2D["* (13 files)"]
end
2E["options.ts"]
2F["index.ts"]
end
subgraph 2G["protomaps"]
2H["api.ts"]
2I["context.ts"]
2J["schema.ts"]
2K["layer-groups-map.ts"]
subgraph 2L["layers"]
2M["* (13 files)"]
end
2N["options.ts"]
2O["index.ts"]
end
end
1-->4
4-->5
4-->N
4-->F
4-->H
4-->M
5-->7
5-->F
5-->H
5-->M
7-->8
7-->C
7-->E
8-->9
8-->A
8-->C
8-->D
8-->B
A-->9
A-->B
C-->B
D-->A
D-->B
E-->8
F-->H
H-->J
H-->L
M-->N
M-->H
N-->H
1-->P
P-->Q
P-->S
P-->U
P-->R
P-->V
P-->W
P-->X
P-->Y
P-->T
P-->L
K-->4
Q-->R
R-->L
S-->R
S-->T
T-->L
Z-->11
Z-->O
Z-->14
Z-->1O
11-->12
11-->13
14-->7
1-->16
1-->18
14-->J
16-->P
16-->7
18-->19
18-->1H
18-->1N
18-->1J
18-->1K
17-->1B
1B-->1C
1B-->1D
1B-->1F
1B-->1G
1B-->1E
1C-->1D
1C-->1E
1A-->7
1A-->P
1A-->4
1F-->J
1G-->1E
1H-->1J
1J-->1K
1J-->1M
1M-->1B
1N-->16
1N-->F
1N-->19
1N-->1J
1O-->14
1P-->2
1P-->O
1P-->Z
1P-->14
1P-->1O
1R-->1P
1R-->1S
1S-->1P
1S-->7
1S-->P
1S-->4
1S-->11
1T-->8
1U-->1P
1U-->2
1U-->1S
1U-->1V
1U-->1W
1U-->5
1U-->1N
1U-->1X
1V-->L
1X-->1P
1X-->4
20-->7
1Z-->4
20-->21
20-->22
20-->23
24-->1P
24-->5
24-->18
24-->1N
24-->J
24-->20
24-->21
24-->22
24-->23
25-->P
25-->1V
25-->24
26-->24
26-->25
28-->1P
28-->7
28-->16
27-->P
27-->4
28-->J
28-->29
28-->2B
28-->2D
28-->2E
28-->2A
27-->1B
29-->2A
2B-->29
2B-->2D
2B-->2E
2D-->2A
2D-->1M
2F-->28
2F-->2A
2H-->1P
2H-->7
2H-->16
2G-->P
2G-->4
2H-->J
2H-->2I
2H-->2K
2H-->2M
2H-->2N
2H-->2J
2G-->1B
2I-->2J
2K-->2I
2K-->2M
2K-->2N
2M-->2J
2M-->1M
2O-->2H
2O-->2J

class 0,1,3,G,6,I,K,10,15,17,1I,1A,1L,1Z,27,2C,2G,2L subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
