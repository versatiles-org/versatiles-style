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
1Y["guessSchema.ts"]
20["guessStyle.ts"]
25["osm.ts"]
29["satellite.ts"]
2A["index.ts"]
2B["schema-builder.ts"]
end
subgraph 3["options"]
4["index.ts"]
5["minimize.ts"]
1T["osm.ts"]
subgraph 1U["parts"]
1V["* (18 files)"]
end
1W["satellite.ts"]
1X["osm-overlay.ts"]
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
2C["random.ts"]
end
subgraph F["shortbread"]
G["layer-groups-map.ts"]
1I["context.ts"]
subgraph 1J["layers"]
1K["* (13 files)"]
end
1L["schema.ts"]
27["index.ts"]
28["groups.ts"]
end
subgraph H["dsl"]
I["index.ts"]
J["assemble.ts"]
K["build.ts"]
N["text.ts"]
P["context.ts"]
X["group-maps.ts"]
end
subgraph L["lib"]
M["opacity.ts"]
O["symbol-layout.ts"]
11["index.ts"]
12["fetchFontFaces.ts"]
13["utils.ts"]
14["fetchTileJSON.ts"]
15["loadTileSource.ts"]
16["fontCovers.ts"]
17["inlineSources.ts"]
18["tileSource.ts"]
19["styleMeta.ts"]
1Z["schema-signatures.ts"]
26["languages.ts"]
2F["schema-audit.ts"]
end
subgraph Q["themes"]
R["index.ts"]
S["colorful.ts"]
T["gray.ts"]
U["muted.ts"]
V["natural.ts"]
W["toner.ts"]
36["types.ts"]
end
subgraph Y["features"]
Z["index.ts"]
10["elevation-source.ts"]
1A["hillshade.ts"]
1B["icon.ts"]
1C["landcover.ts"]
1D["projection.ts"]
1E["satellite-overlay.ts"]
1F["sky.ts"]
1G["sun.ts"]
1H["terrain.ts"]
end
subgraph 1M["cartography"]
1N["index.ts"]
1O["boundaries.ts"]
1P["buildings.ts"]
1Q["labels.ts"]
1R["roads.ts"]
1S["transitstops.ts"]
end
subgraph 21["types"]
22["index.ts"]
23["tilejson.ts"]
24["vector_layer.ts"]
37["maplibre.ts"]
end
2D["index.ts"]
2E["variants.ts"]
subgraph 2G["migrate"]
2H["calibrate.ts"]
2I["evaluate.ts"]
2J["math.ts"]
2K["probes.ts"]
2L["derive.ts"]
2M["guess.ts"]
2N["index.ts"]
end
subgraph 2O["omt"]
2P["api.ts"]
2Q["context.ts"]
2R["schema.ts"]
2S["layer-groups-map.ts"]
subgraph 2T["layers"]
2U["* (13 files)"]
end
2V["options.ts"]
2W["index.ts"]
end
subgraph 2X["protomaps"]
2Y["api.ts"]
2Z["context.ts"]
30["schema.ts"]
31["layer-groups-map.ts"]
subgraph 32["layers"]
33["* (13 files)"]
end
34["options.ts"]
35["index.ts"]
end
end
2-->4
4-->5
4-->1X
4-->1T
4-->1V
4-->1W
5-->7
5-->G
5-->1T
5-->1V
5-->1W
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
G-->I
G-->Z
G-->4
G-->1I
G-->1K
I-->J
I-->K
I-->P
I-->X
I-->N
J-->K
J-->N
K-->7
K-->M
N-->O
N-->4
P-->7
P-->4
P-->R
R-->S
R-->T
R-->U
R-->V
R-->W
X-->N
Z-->10
Z-->1A
Z-->1B
Z-->1C
Z-->1D
Z-->1E
Z-->1F
Z-->1G
Z-->1H
10-->11
11-->12
11-->14
11-->16
11-->17
11-->15
11-->19
11-->18
11-->13
12-->4
12-->13
14-->4
14-->15
15-->13
16-->4
17-->4
17-->15
17-->18
18-->13
1A-->7
1A-->10
1B-->O
1E-->M
1F-->7
1G-->7
1H-->10
1I-->I
1K-->I
1K-->1L
1K-->1N
1N-->1O
1N-->1P
1N-->1Q
1N-->1R
1N-->1S
1O-->I
1P-->I
1Q-->I
1R-->I
1S-->I
1T-->1V
1V-->R
1V-->13
1W-->1X
1W-->1V
1X-->1V
1Y-->1Z
20-->11
20-->1Z
20-->4
20-->22
20-->1Y
20-->25
20-->29
22-->23
22-->24
25-->7
25-->Z
25-->11
25-->26
25-->4
25-->5
25-->27
25-->G
25-->1K
25-->1L
25-->R
25-->2
27-->1I
27-->28
27-->1K
28-->1K
29-->Z
29-->1E
29-->11
29-->4
29-->5
29-->27
29-->G
29-->2
29-->25
2A-->1Y
2A-->20
2A-->25
2A-->29
2C-->8
2D-->2A
2D-->7
2D-->11
2D-->4
2D-->22
2D-->2E
2E-->2A
2E-->4
2H-->7
2H-->4
2H-->2I
2H-->2J
2H-->2K
2L-->1Y
2L-->25
2L-->29
2L-->4
2L-->G
2L-->1L
2L-->R
2L-->2H
2L-->2I
2L-->2J
2L-->2K
2M-->11
2M-->12
2M-->4
2M-->2L
2N-->2L
2N-->2M
2P-->2
2P-->7
2P-->Z
2P-->11
2P-->26
2P-->4
2P-->R
2P-->2Q
2P-->2S
2P-->2U
2P-->2V
2P-->2R
2Q-->P
2Q-->2R
2S-->I
2S-->2Q
2S-->2U
2S-->2V
2U-->I
2U-->J
2U-->2R
2U-->1N
2V-->13
2V-->4
2V-->5
2W-->2P
2W-->2R
2Y-->2
2Y-->7
2Y-->Z
2Y-->11
2Y-->26
2Y-->4
2Y-->R
2Y-->2Z
2Y-->31
2Y-->33
2Y-->34
2Y-->30
2Z-->P
2Z-->30
31-->I
31-->2Z
31-->33
31-->34
33-->I
33-->J
33-->30
33-->1N
34-->13
34-->4
34-->5
35-->2Y
35-->30

class 0,1,3,1U,6,F,1J,H,L,Q,Y,1M,21,2G,2O,2T,2X,32 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
