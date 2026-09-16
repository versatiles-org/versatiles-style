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
2W["schema-audit.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
4B["types.ts"]
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
4C["maplibre.ts"]
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
2S["convert.ts"]
2T["space.ts"]
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
2U["index.ts"]
2V["variants.ts"]
subgraph 2X["migrate"]
2Y["calibrate.ts"]
2Z["evaluate.ts"]
30["math.ts"]
31["probes.ts"]
32["derive.ts"]
33["guess.ts"]
34["index.ts"]
end
subgraph 35["omt"]
36["api.ts"]
37["context.ts"]
38["schema.ts"]
39["layer-groups-map.ts"]
subgraph 3A["layers"]
3B["index.ts"]
3C["airport.ts"]
3D["background.ts"]
3E["boundaries.ts"]
3F["buildings.ts"]
3G["labels.ts"]
3H["landcover.ts"]
3I["markings.ts"]
3J["pois.ts"]
3K["roads.ts"]
3L["sites.ts"]
3M["transitstops.ts"]
3N["water.ts"]
end
3O["options.ts"]
3P["index.ts"]
end
subgraph 3Q["protomaps"]
3R["api.ts"]
3S["context.ts"]
3T["schema.ts"]
3U["layer-groups-map.ts"]
subgraph 3V["layers"]
3W["index.ts"]
3X["airport.ts"]
3Y["background.ts"]
3Z["boundaries.ts"]
40["buildings.ts"]
41["labels.ts"]
42["landcover.ts"]
43["markings.ts"]
44["pois.ts"]
45["roads.ts"]
46["sites.ts"]
47["transitstops.ts"]
48["water.ts"]
end
49["options.ts"]
4A["index.ts"]
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
2U-->2Q
2U-->1J
2U-->6
2U-->U
2U-->1E
2U-->2V
2V-->2Q
2V-->U
2Y-->1J
2Y-->U
2Y-->2Z
2Y-->30
2Y-->31
32-->R
32-->1H
32-->2P
32-->U
32-->25
32-->2G
32-->C
32-->2Y
32-->2Z
32-->30
32-->31
33-->6
33-->8
33-->32
34-->32
34-->33
36-->2
36-->1J
36-->1S
36-->6
36-->22
36-->U
36-->C
36-->37
36-->39
36-->3B
36-->3O
36-->38
37-->2A
37-->38
39-->27
39-->37
39-->3B
39-->3O
3B-->2D
3B-->2F
3B-->38
3B-->3C
3B-->3D
3B-->3E
3B-->3F
3B-->3G
3B-->3H
3B-->3I
3B-->3J
3B-->3K
3B-->3L
3B-->3M
3B-->3N
3C-->2F
3D-->2F
3E-->2I
3F-->2J
3G-->2K
3G-->2F
3H-->2F
3I-->2F
3J-->2F
3K-->2L
3L-->2F
3M-->2M
3N-->2F
3O-->I
3O-->U
3O-->8
3O-->23
3P-->36
3P-->38
3R-->2
3R-->1J
3R-->1S
3R-->6
3R-->22
3R-->U
3R-->C
3R-->3S
3R-->3U
3R-->3W
3R-->49
3R-->3T
3S-->2A
3S-->3T
3U-->27
3U-->3S
3U-->3W
3U-->49
3W-->2D
3W-->2F
3W-->3T
3W-->3X
3W-->3Y
3W-->3Z
3W-->40
3W-->41
3W-->42
3W-->43
3W-->44
3W-->45
3W-->46
3W-->47
3W-->48
3X-->2F
3Y-->2F
3Z-->2I
40-->2J
41-->2K
41-->2F
42-->2F
43-->2F
44-->2F
45-->2L
46-->2F
47-->2M
48-->2F
49-->I
49-->U
49-->8
49-->23
4A-->3R
4A-->3T

class 0,1,3,5,B,1A,1D,1I,24,2B,26,2H,2X,35,3A,3Q,3V subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
