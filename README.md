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
11["guessStyle.ts"]
16["osm.ts"]
1Q["satellite.ts"]
1R["index.ts"]
1S["schema-builder.ts"]
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
Q["fetchFontFaces.ts"]
R["fetchTileJSON.ts"]
S["loadTileSource.ts"]
T["fontCovers.ts"]
U["inlineSources.ts"]
V["tileSource.ts"]
W["languages.ts"]
X["opacity.ts"]
Y["schema-signatures.ts"]
Z["styleMeta.ts"]
10["symbol-layout.ts"]
1W["schema-audit.ts"]
end
subgraph 12["types"]
13["index.ts"]
14["tilejson.ts"]
15["vector_layer.ts"]
2N["maplibre.ts"]
end
subgraph 17["features"]
18["* (10 files)"]
end
subgraph 19["shortbread"]
1A["index.ts"]
1B["context.ts"]
1J["groups.ts"]
subgraph 1K["layers"]
1L["* (13 files)"]
end
1M["schema.ts"]
1P["layer-groups-map.ts"]
end
subgraph 1C["dsl"]
1D["index.ts"]
1E["assemble.ts"]
1F["build.ts"]
1G["text.ts"]
1H["context.ts"]
1I["group-maps.ts"]
end
subgraph 1N["cartography"]
1O["* (6 files)"]
end
1U["index.ts"]
1V["variants.ts"]
subgraph 1X["migrate"]
1Y["calibrate.ts"]
1Z["evaluate.ts"]
20["math.ts"]
21["probes.ts"]
22["derive.ts"]
23["guess.ts"]
24["index.ts"]
end
subgraph 25["omt"]
26["api.ts"]
27["context.ts"]
28["schema.ts"]
29["layer-groups-map.ts"]
subgraph 2A["layers"]
2B["* (13 files)"]
end
2C["options.ts"]
2D["index.ts"]
end
subgraph 2E["protomaps"]
2F["api.ts"]
2G["context.ts"]
2H["schema.ts"]
2I["layer-groups-map.ts"]
subgraph 2J["layers"]
2K["* (13 files)"]
end
2L["options.ts"]
2M["index.ts"]
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
P-->R
P-->T
P-->U
P-->W
P-->S
P-->X
P-->Y
P-->Z
P-->10
P-->V
P-->L
K-->4
Q-->L
R-->S
S-->L
U-->S
U-->V
V-->L
11-->13
11-->O
11-->16
11-->1Q
13-->14
13-->15
16-->7
1-->18
1-->1A
16-->J
16-->2
18-->P
18-->7
1A-->1B
1A-->1J
1A-->1P
1A-->1L
1A-->1M
19-->1D
1D-->1E
1D-->1F
1D-->1H
1D-->1I
1D-->1G
1E-->1F
1E-->1G
1C-->7
1C-->P
1C-->4
1H-->J
1I-->1G
1J-->1L
1L-->1M
1L-->1O
1O-->1D
1P-->18
1P-->F
1P-->1B
1P-->1L
1Q-->2
1Q-->16
1R-->2
1R-->O
1R-->11
1R-->16
1R-->1Q
1T-->8
1U-->1R
1U-->7
1U-->P
1U-->4
1U-->13
1U-->1V
1V-->1R
1V-->4
1Y-->7
1X-->4
1Y-->1Z
1Y-->20
1Y-->21
22-->1R
22-->1A
22-->J
22-->1Y
22-->1Z
22-->20
22-->21
23-->P
23-->22
24-->22
24-->23
26-->1R
26-->7
26-->18
25-->P
25-->4
26-->J
26-->27
26-->29
26-->2B
26-->2C
26-->28
25-->1D
27-->28
29-->27
29-->2B
29-->2C
2B-->28
2B-->1O
2D-->26
2D-->28
2F-->1R
2F-->7
2F-->18
2E-->P
2E-->4
2F-->J
2F-->2G
2F-->2I
2F-->2K
2F-->2L
2F-->2H
2E-->1D
2G-->2H
2I-->2G
2I-->2K
2I-->2L
2K-->2H
2K-->1O
2M-->2F
2M-->2H

class 0,1,3,G,6,I,K,12,17,19,1K,1C,1N,1X,25,2A,2E,2J subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
