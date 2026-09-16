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
23["minimize.ts"]
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
1W["symbol-layout.ts"]
22["languages.ts"]
30["schema-audit.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
4F["types.ts"]
end
subgraph 1A["features"]
1B["satellite-overlay.ts"]
1S["index.ts"]
1T["elevation-source.ts"]
1U["hillshade.ts"]
1V["icon.ts"]
1X["landcover.ts"]
1Y["projection.ts"]
1Z["sky.ts"]
20["sun.ts"]
21["terrain.ts"]
end
subgraph 1D["types"]
1E["index.ts"]
1F["tilejson.ts"]
1G["vector_layer.ts"]
4G["maplibre.ts"]
end
subgraph 1I["color"]
1J["index.ts"]
1K["parse.ts"]
1L["abstract.ts"]
1M["hsl.ts"]
1N["hsv.ts"]
1O["random.ts"]
1P["utils.ts"]
1Q["rgb.ts"]
1R["recolor.ts"]
2S["color.ts"]
2T["convert.ts"]
2U["ops.ts"]
2V["space.ts"]
2W["parser.ts"]
2X["serialize.ts"]
end
subgraph 24["shortbread"]
25["layer-groups-map.ts"]
29["context.ts"]
subgraph 2B["layers"]
2C["* (13 files)"]
end
2G["schema.ts"]
2N["index.ts"]
2O["groups.ts"]
end
subgraph 26["dsl"]
27["group-maps.ts"]
28["text.ts"]
2A["context.ts"]
2D["assemble.ts"]
2E["build.ts"]
2F["index.ts"]
end
subgraph 2H["cartography"]
2I["boundaries.ts"]
2J["buildings.ts"]
2K["labels.ts"]
2L["roads.ts"]
2M["transitstops.ts"]
end
2Y["index.ts"]
2Z["variants.ts"]
subgraph 31["migrate"]
32["calibrate.ts"]
33["evaluate.ts"]
34["math.ts"]
35["probes.ts"]
36["derive.ts"]
37["guess.ts"]
38["index.ts"]
end
subgraph 39["omt"]
3A["api.ts"]
3B["context.ts"]
3C["schema.ts"]
3D["layer-groups-map.ts"]
subgraph 3E["layers"]
3F["index.ts"]
3G["airport.ts"]
3H["background.ts"]
3I["boundaries.ts"]
3J["buildings.ts"]
3K["labels.ts"]
3L["landcover.ts"]
3M["markings.ts"]
3N["pois.ts"]
3O["roads.ts"]
3P["sites.ts"]
3Q["transitstops.ts"]
3R["water.ts"]
end
3S["options.ts"]
3T["index.ts"]
end
subgraph 3U["protomaps"]
3V["api.ts"]
3W["context.ts"]
3X["schema.ts"]
3Y["layer-groups-map.ts"]
subgraph 3Z["layers"]
40["index.ts"]
41["airport.ts"]
42["background.ts"]
43["boundaries.ts"]
44["buildings.ts"]
45["labels.ts"]
46["landcover.ts"]
47["markings.ts"]
48["pois.ts"]
49["roads.ts"]
4A["sites.ts"]
4B["transitstops.ts"]
4C["water.ts"]
end
4D["options.ts"]
4E["index.ts"]
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
1B-->M
1E-->1F
1E-->1G
1H-->1J
1H-->1S
1H-->6
1H-->22
1H-->U
1H-->23
1H-->2N
1H-->25
1H-->2C
1H-->2G
1H-->C
1H-->2
1J-->1K
1J-->1R
1K-->1L
1K-->1M
1K-->1N
1K-->1Q
1M-->1L
1M-->1N
1M-->1Q
1M-->1P
1N-->1L
1N-->1M
1N-->1O
1N-->1Q
1N-->1P
1O-->1N
1O-->1P
1Q-->1L
1Q-->1M
1Q-->1N
1Q-->1P
1R-->1K
1S-->1T
1S-->1U
1S-->1V
1S-->1X
1S-->1Y
1S-->1B
1S-->1Z
1S-->20
1S-->21
1T-->6
1U-->1T
1V-->1W
21-->1T
23-->1J
23-->25
23-->X
23-->Y
23-->11
23-->18
23-->13
23-->19
23-->16
23-->M
23-->17
23-->4
25-->27
25-->1B
25-->U
25-->29
25-->2C
27-->28
28-->1W
28-->U
29-->2A
2A-->1J
2A-->U
2A-->C
2C-->2D
2C-->2F
2C-->2G
2C-->2I
2C-->2J
2C-->2K
2C-->2L
2C-->2M
2D-->2E
2D-->28
2E-->1J
2E-->1C
2F-->2D
2F-->2E
2F-->2A
2F-->28
2I-->2F
2J-->2F
2K-->2F
2L-->2F
2M-->2F
2N-->29
2N-->2O
2N-->2C
2O-->2C
2P-->1S
2P-->6
2P-->U
2P-->23
2P-->2N
2P-->25
2P-->2
2P-->1H
2Q-->R
2Q-->T
2Q-->1H
2Q-->2P
2S-->2T
2S-->2U
2S-->2W
2S-->2X
2S-->2V
2U-->2T
2U-->2V
2W-->2V
2X-->2U
2X-->2V
2Y-->2Q
2Y-->1J
2Y-->6
2Y-->U
2Y-->1E
2Y-->2Z
2Z-->2Q
2Z-->U
32-->1J
32-->U
32-->33
32-->34
32-->35
36-->R
36-->1H
36-->2P
36-->U
36-->25
36-->2G
36-->C
36-->32
36-->33
36-->34
36-->35
37-->6
37-->8
37-->36
38-->36
38-->37
3A-->2
3A-->1J
3A-->1S
3A-->6
3A-->22
3A-->U
3A-->C
3A-->3B
3A-->3D
3A-->3F
3A-->3S
3A-->3C
3B-->2A
3B-->3C
3D-->27
3D-->3B
3D-->3F
3D-->3S
3F-->2D
3F-->2F
3F-->3C
3F-->3G
3F-->3H
3F-->3I
3F-->3J
3F-->3K
3F-->3L
3F-->3M
3F-->3N
3F-->3O
3F-->3P
3F-->3Q
3F-->3R
3G-->2F
3H-->2F
3I-->2I
3J-->2J
3K-->2K
3K-->2F
3L-->2F
3M-->2F
3N-->2F
3O-->2L
3P-->2F
3Q-->2M
3R-->2F
3S-->I
3S-->U
3S-->8
3S-->23
3T-->3A
3T-->3C
3V-->2
3V-->1J
3V-->1S
3V-->6
3V-->22
3V-->U
3V-->C
3V-->3W
3V-->3Y
3V-->40
3V-->4D
3V-->3X
3W-->2A
3W-->3X
3Y-->27
3Y-->3W
3Y-->40
3Y-->4D
40-->2D
40-->2F
40-->3X
40-->41
40-->42
40-->43
40-->44
40-->45
40-->46
40-->47
40-->48
40-->49
40-->4A
40-->4B
40-->4C
41-->2F
42-->2F
43-->2I
44-->2J
45-->2K
45-->2F
46-->2F
47-->2F
48-->2F
49-->2L
4A-->2F
4B-->2M
4C-->2F
4D-->I
4D-->U
4D-->8
4D-->23
4E-->3V
4E-->3X

class 0,1,3,5,B,1A,1D,1I,24,2B,26,2H,31,39,3E,3U,3Z subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
