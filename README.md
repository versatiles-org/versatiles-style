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
R["guessSchema.ts"]
T["guessStyle.ts"]
20["osm.ts"]
2P["satellite.ts"]
2Q["index.ts"]
2R["schema-builder.ts"]
end
subgraph 3["options"]
4["urls.ts"]
8["keys.ts"]
9["v5-hints.ts"]
A["colors.ts"]
M["text.ts"]
Q["sprite.ts"]
U["index.ts"]
V["osm-overlay.ts"]
W["parts.ts"]
X["features-hillshade.ts"]
Y["features-terrain.ts"]
Z["features.ts"]
10["icon.ts"]
11["layer-groups.ts"]
12["projection.ts"]
13["recolor.ts"]
14["satellite-raster.ts"]
15["sky.ts"]
16["sun.ts"]
17["theme.ts"]
18["osm.ts"]
19["satellite.ts"]
22["minimize.ts"]
end
subgraph 5["lib"]
6["index.ts"]
7["fetchFontFaces.ts"]
I["utils.ts"]
J["fetchTileJSON.ts"]
K["loadTileSource.ts"]
L["fontCovers.ts"]
N["inlineSources.ts"]
O["tileSource.ts"]
P["styleMeta.ts"]
S["schema-signatures.ts"]
1O["symbol-layout.ts"]
1S["opacity.ts"]
21["languages.ts"]
2V["schema-audit.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
3M["types.ts"]
end
subgraph 1A["features"]
1B["index.ts"]
1C["elevation-source.ts"]
1D["hillshade.ts"]
1N["icon.ts"]
1P["landcover.ts"]
1Q["projection.ts"]
1R["satellite-overlay.ts"]
1T["sky.ts"]
1U["sun.ts"]
1V["terrain.ts"]
end
subgraph 1E["color"]
1F["index.ts"]
1G["color.ts"]
1H["convert.ts"]
1I["ops.ts"]
1J["space.ts"]
1K["parser.ts"]
1L["serialize.ts"]
1M["recolor.ts"]
2S["random.ts"]
end
subgraph 1W["types"]
1X["index.ts"]
1Y["tilejson.ts"]
1Z["vector_layer.ts"]
3N["maplibre.ts"]
end
subgraph 23["shortbread"]
24["layer-groups-map.ts"]
2C["context.ts"]
subgraph 2D["layers"]
2E["* (13 files)"]
end
2F["schema.ts"]
2N["index.ts"]
2O["groups.ts"]
end
subgraph 25["dsl"]
26["index.ts"]
27["assemble.ts"]
28["build.ts"]
29["text.ts"]
2A["context.ts"]
2B["group-maps.ts"]
end
subgraph 2G["cartography"]
2H["index.ts"]
2I["boundaries.ts"]
2J["buildings.ts"]
2K["labels.ts"]
2L["roads.ts"]
2M["transitstops.ts"]
end
2T["index.ts"]
2U["variants.ts"]
subgraph 2W["migrate"]
2X["calibrate.ts"]
2Y["evaluate.ts"]
2Z["math.ts"]
30["probes.ts"]
31["derive.ts"]
32["guess.ts"]
33["index.ts"]
end
subgraph 34["omt"]
35["api.ts"]
36["context.ts"]
37["schema.ts"]
38["layer-groups-map.ts"]
subgraph 39["layers"]
3A["* (13 files)"]
end
3B["options.ts"]
3C["index.ts"]
end
subgraph 3D["protomaps"]
3E["api.ts"]
3F["context.ts"]
3G["schema.ts"]
3H["layer-groups-map.ts"]
subgraph 3I["layers"]
3J["* (13 files)"]
end
3K["options.ts"]
3L["index.ts"]
end
end
2-->4
4-->6
4-->8
4-->Q
6-->7
6-->J
6-->L
6-->N
6-->K
6-->P
6-->O
6-->I
7-->8
7-->4
7-->I
8-->9
9-->A
A-->C
A-->8
C-->D
C-->E
C-->F
C-->G
C-->H
J-->8
J-->K
K-->I
L-->M
M-->8
N-->8
N-->K
N-->O
O-->I
Q-->6
R-->S
T-->6
T-->S
T-->U
T-->8
T-->1X
T-->R
T-->20
T-->2P
U-->V
U-->18
U-->W
U-->19
V-->8
V-->W
W-->A
W-->X
W-->Y
W-->Z
W-->10
W-->11
W-->12
W-->13
W-->14
W-->15
W-->Q
W-->16
W-->M
W-->17
W-->4
X-->8
Y-->8
Z-->X
Z-->Y
Z-->8
10-->8
11-->8
13-->8
14-->8
15-->8
16-->8
17-->C
18-->8
18-->W
19-->1B
19-->8
19-->V
19-->W
1B-->1C
1B-->1D
1B-->1N
1B-->1P
1B-->1Q
1B-->1R
1B-->1T
1B-->1U
1B-->1V
1C-->6
1D-->1F
1D-->1C
1F-->1G
1F-->1K
1F-->1M
1G-->1H
1G-->1I
1G-->1K
1G-->1L
1G-->1J
1I-->1H
1I-->1J
1K-->1J
1L-->1I
1L-->1J
1M-->1G
1N-->1O
1R-->1S
1R-->M
1T-->1F
1U-->1F
1V-->1C
1X-->1Y
1X-->1Z
20-->1F
20-->1B
20-->6
20-->21
20-->U
20-->22
20-->2N
20-->24
20-->2E
20-->2F
20-->C
20-->2
22-->1F
22-->24
22-->X
22-->Y
22-->11
22-->18
22-->13
22-->19
22-->16
22-->M
22-->17
22-->4
24-->26
24-->1B
24-->U
24-->2C
24-->2E
26-->27
26-->28
26-->2A
26-->2B
26-->29
27-->28
27-->29
28-->1F
28-->1S
29-->1O
29-->U
2A-->1F
2A-->U
2A-->C
2B-->29
2C-->26
2E-->26
2E-->2F
2E-->2H
2H-->2I
2H-->2J
2H-->2K
2H-->2L
2H-->2M
2I-->26
2J-->26
2K-->26
2L-->26
2M-->26
2N-->2C
2N-->2O
2N-->2E
2O-->2E
2P-->1B
2P-->6
2P-->U
2P-->22
2P-->2N
2P-->24
2P-->2
2P-->20
2Q-->R
2Q-->T
2Q-->20
2Q-->2P
2S-->1G
2T-->2Q
2T-->1F
2T-->6
2T-->U
2T-->1X
2T-->2U
2U-->2Q
2U-->U
2X-->1F
2X-->U
2X-->2Y
2X-->2Z
2X-->30
31-->R
31-->20
31-->2P
31-->U
31-->24
31-->2F
31-->C
31-->2X
31-->2Y
31-->2Z
31-->30
32-->6
32-->8
32-->31
33-->31
33-->32
35-->2
35-->1F
35-->1B
35-->6
35-->21
35-->U
35-->C
35-->36
35-->38
35-->3A
35-->3B
35-->37
36-->26
36-->37
38-->26
38-->36
38-->3A
38-->3B
3A-->26
3A-->37
3A-->2H
3B-->I
3B-->U
3B-->8
3B-->22
3C-->35
3C-->37
3E-->2
3E-->1F
3E-->1B
3E-->6
3E-->21
3E-->U
3E-->C
3E-->3F
3E-->3H
3E-->3J
3E-->3K
3E-->3G
3F-->26
3F-->3G
3H-->26
3H-->3F
3H-->3J
3H-->3K
3J-->26
3J-->3G
3J-->2H
3K-->I
3K-->U
3K-->8
3K-->22
3L-->3E
3L-->3G

class 0,1,3,5,B,1A,1E,1W,23,2D,25,2G,2W,34,39,3D,3I subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
