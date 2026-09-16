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

- `osm(options)` - OpenStreetMap vector style. [Documentation](https://versatiles.org/versatiles-style/functions/osm.html)
  - `theme`: a palette name (`'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`), or its dark theme with a `-dark` suffix (`'colorful-dark'`, …).
  - `text`: label language, and `fonts` — a glyph name per label topic (`{ water: 'fira_sans_regular_italic' }`).
  - `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/interfaces/OsmOptions.html).
- `satellite(options)` - raster/satellite style with an optional OSM overlay. [Documentation](https://versatiles.org/versatiles-style/functions/satellite.html) — see [SatelliteOptions](https://versatiles.org/versatiles-style/interfaces/SatelliteOptions.html).
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
1H["osm.ts"]
2O["satellite.ts"]
2P["index.ts"]
2Q["schema-builder.ts"]
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
1C["opacity.ts"]
1V["symbol-layout.ts"]
21["languages.ts"]
2U["schema-audit.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
3L["types.ts"]
end
subgraph 1A["features"]
1B["satellite-overlay.ts"]
1R["index.ts"]
1S["elevation-source.ts"]
1T["hillshade.ts"]
1U["icon.ts"]
1W["landcover.ts"]
1X["projection.ts"]
1Y["sky.ts"]
1Z["sun.ts"]
20["terrain.ts"]
end
subgraph 1D["types"]
1E["index.ts"]
1F["tilejson.ts"]
1G["vector_layer.ts"]
3M["maplibre.ts"]
end
subgraph 1I["color"]
1J["index.ts"]
1K["color.ts"]
1L["convert.ts"]
1M["ops.ts"]
1N["space.ts"]
1O["parser.ts"]
1P["serialize.ts"]
1Q["recolor.ts"]
2R["random.ts"]
end
subgraph 23["shortbread"]
24["layer-groups-map.ts"]
28["context.ts"]
subgraph 2A["layers"]
2B["* (13 files)"]
end
2F["schema.ts"]
2M["index.ts"]
2N["groups.ts"]
end
subgraph 25["dsl"]
26["group-maps.ts"]
27["text.ts"]
29["context.ts"]
2C["assemble.ts"]
2D["build.ts"]
2E["index.ts"]
end
subgraph 2G["cartography"]
2H["boundaries.ts"]
2I["buildings.ts"]
2J["labels.ts"]
2K["roads.ts"]
2L["transitstops.ts"]
end
2S["index.ts"]
2T["variants.ts"]
subgraph 2V["migrate"]
2W["calibrate.ts"]
2X["evaluate.ts"]
2Y["math.ts"]
2Z["probes.ts"]
30["derive.ts"]
31["guess.ts"]
32["index.ts"]
end
subgraph 33["omt"]
34["api.ts"]
35["context.ts"]
36["schema.ts"]
37["layer-groups-map.ts"]
subgraph 38["layers"]
39["* (13 files)"]
end
3A["options.ts"]
3B["index.ts"]
end
subgraph 3C["protomaps"]
3D["api.ts"]
3E["context.ts"]
3F["schema.ts"]
3G["layer-groups-map.ts"]
subgraph 3H["layers"]
3I["* (13 files)"]
end
3J["options.ts"]
3K["index.ts"]
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
T-->1E
T-->R
T-->1H
T-->2O
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
1B-->M
1E-->1F
1E-->1G
1H-->1J
1H-->1R
1H-->6
1H-->21
1H-->U
1H-->22
1H-->2M
1H-->24
1H-->2B
1H-->2F
1H-->C
1H-->2
1J-->1K
1J-->1O
1J-->1Q
1K-->1L
1K-->1M
1K-->1O
1K-->1P
1K-->1N
1M-->1L
1M-->1N
1O-->1N
1P-->1M
1P-->1N
1Q-->1K
1R-->1S
1R-->1T
1R-->1U
1R-->1W
1R-->1X
1R-->1B
1R-->1Y
1R-->1Z
1R-->20
1S-->6
1T-->1S
1U-->1V
20-->1S
22-->1J
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
24-->28
24-->2B
26-->27
27-->1V
27-->U
28-->29
29-->1J
29-->U
29-->C
2B-->2C
2B-->2E
2B-->2F
2B-->2H
2B-->2I
2B-->2J
2B-->2K
2B-->2L
2C-->2D
2C-->27
2D-->1J
2D-->1C
2E-->2C
2E-->2D
2E-->29
2E-->27
2H-->2E
2I-->2E
2J-->2E
2K-->2E
2L-->2E
2M-->28
2M-->2N
2M-->2B
2N-->2B
2O-->1R
2O-->6
2O-->U
2O-->22
2O-->2M
2O-->24
2O-->2
2O-->1H
2P-->R
2P-->T
2P-->1H
2P-->2O
2R-->1K
2S-->2P
2S-->1J
2S-->6
2S-->U
2S-->1E
2S-->2T
2T-->2P
2T-->U
2W-->1J
2W-->U
2W-->2X
2W-->2Y
2W-->2Z
30-->R
30-->1H
30-->2O
30-->U
30-->24
30-->2F
30-->C
30-->2W
30-->2X
30-->2Y
30-->2Z
31-->6
31-->8
31-->30
32-->30
32-->31
34-->2
34-->1J
34-->1R
34-->6
34-->21
34-->U
34-->C
34-->35
34-->37
34-->39
34-->3A
34-->36
35-->29
35-->36
37-->26
37-->35
37-->39
37-->3A
39-->2C
39-->2E
39-->36
39-->2H
39-->2I
39-->2J
39-->2K
39-->2L
3A-->I
3A-->U
3A-->8
3A-->22
3B-->34
3B-->36
3D-->2
3D-->1J
3D-->1R
3D-->6
3D-->21
3D-->U
3D-->C
3D-->3E
3D-->3G
3D-->3I
3D-->3J
3D-->3F
3E-->29
3E-->3F
3G-->26
3G-->3E
3G-->3I
3G-->3J
3I-->2C
3I-->2E
3I-->3F
3I-->2H
3I-->2I
3I-->2J
3I-->2K
3I-->2L
3J-->I
3J-->U
3J-->8
3J-->22
3K-->3D
3K-->3F

class 0,1,3,5,B,1A,1D,1I,23,2A,25,2G,2V,33,38,3C,3H subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
