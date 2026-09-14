[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Style

**VersaTiles Style** generates styles and sprites for MapLibre.

> **Upgrading from v5?** v6 is a breaking release: the palette builders (`colorful`, `shadow`, …) are
> replaced by `osm({ theme })`, options are grouped (`textScale` → `layout.scale.labels`), all 34 of
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
  - `text`, `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/interfaces/OsmOptions.html).
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

- `guessOptions(style)` - from `@versatiles/style/migrate`: read a MapLibre style built for OpenMapTiles, Protomaps or Shortbread tiles, and return the `osm()` or `satellite()` options whose style looks most like it — for moving a map onto VersaTiles. `deriveOptions(style, tileJSONs?)` is its synchronous, I/O-free core.

```javascript
import { osm } from '@versatiles/style';
import { guessOptions } from '@versatiles/style/migrate';
const guess = await guessOptions('https://example.org/my-style/style.json');
if (guess.kind === 'osm') map.setStyle(osm(guess.options)); // guess.report says what was not carried over
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
3["guessSchema.ts"]
6["guessStyle.ts"]
1J["osm.ts"]
2Q["satellite.ts"]
2R["index.ts"]
2S["schema-builder.ts"]
end
subgraph 4["lib"]
5["schema-signatures.ts"]
7["index.ts"]
8["fetchFontFaces.ts"]
M["utils.ts"]
N["fetchTileJSON.ts"]
O["loadTileSource.ts"]
P["fontCovers.ts"]
Q["inlineSources.ts"]
R["tileSource.ts"]
S["styleMeta.ts"]
1E["opacity.ts"]
23["languages.ts"]
2V["schema-audit.ts"]
end
subgraph 9["options"]
A["keys.ts"]
B["v5-hints.ts"]
C["colors.ts"]
K["urls.ts"]
L["sprite.ts"]
T["index.ts"]
U["osm-overlay.ts"]
V["parts.ts"]
W["features-hillshade.ts"]
X["features-terrain.ts"]
Y["features.ts"]
Z["font-names.ts"]
10["fonts.ts"]
11["layer-groups.ts"]
12["layout.ts"]
13["projection.ts"]
14["recolor.ts"]
15["satellite-raster.ts"]
16["sky.ts"]
17["sun.ts"]
18["text.ts"]
19["theme.ts"]
1A["osm.ts"]
1B["satellite.ts"]
24["minimize.ts"]
end
subgraph D["themes"]
E["index.ts"]
F["colorful.ts"]
G["gray.ts"]
H["muted.ts"]
I["natural.ts"]
J["toner.ts"]
4A["types.ts"]
end
subgraph 1C["features"]
1D["satellite-overlay.ts"]
1U["index.ts"]
1V["elevation-source.ts"]
1W["hillshade.ts"]
1X["landcover.ts"]
1Y["layout.ts"]
1Z["projection.ts"]
20["sky.ts"]
21["sun.ts"]
22["terrain.ts"]
end
subgraph 1F["types"]
1G["index.ts"]
1H["tilejson.ts"]
1I["vector_layer.ts"]
4B["maplibre.ts"]
end
subgraph 1K["color"]
1L["index.ts"]
1M["parse.ts"]
1N["abstract.ts"]
1O["hsl.ts"]
1P["hsv.ts"]
1Q["random.ts"]
1R["utils.ts"]
1S["rgb.ts"]
1T["recolor.ts"]
end
subgraph 25["shortbread"]
26["index.ts"]
27["context.ts"]
2A["groups.ts"]
subgraph 2B["layers"]
2C["* (13 files)"]
end
2H["schema.ts"]
2O["layer-groups-map.ts"]
end
subgraph 28["dsl"]
29["context.ts"]
2D["assemble.ts"]
2E["build.ts"]
2F["fonts.ts"]
2G["index.ts"]
2P["group-maps.ts"]
end
subgraph 2I["cartography"]
2J["boundaries.ts"]
2K["buildings.ts"]
2L["labels.ts"]
2M["roads.ts"]
2N["transitstops.ts"]
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
3A["index.ts"]
3B["airport.ts"]
3C["background.ts"]
3D["boundaries.ts"]
3E["buildings.ts"]
3F["labels.ts"]
3G["landcover.ts"]
3H["markings.ts"]
3I["pois.ts"]
3J["roads.ts"]
3K["sites.ts"]
3L["transitstops.ts"]
3M["water.ts"]
end
3N["options.ts"]
3O["index.ts"]
end
subgraph 3P["protomaps"]
3Q["api.ts"]
3R["context.ts"]
3S["schema.ts"]
3T["layer-groups-map.ts"]
subgraph 3U["layers"]
3V["index.ts"]
3W["airport.ts"]
3X["background.ts"]
3Y["boundaries.ts"]
3Z["buildings.ts"]
40["labels.ts"]
41["landcover.ts"]
42["markings.ts"]
43["pois.ts"]
44["roads.ts"]
45["sites.ts"]
46["transitstops.ts"]
47["water.ts"]
end
48["options.ts"]
49["index.ts"]
end
end
3-->5
6-->7
6-->5
6-->T
6-->A
6-->1G
6-->3
6-->1J
6-->2Q
7-->8
7-->N
7-->P
7-->Q
7-->O
7-->S
7-->R
7-->M
8-->A
8-->K
8-->M
A-->B
B-->C
C-->E
C-->A
E-->F
E-->G
E-->H
E-->I
E-->J
K-->7
K-->A
K-->L
L-->7
N-->A
N-->O
O-->M
Q-->A
Q-->O
Q-->R
R-->M
T-->U
T-->1A
T-->V
T-->1B
U-->A
U-->V
V-->C
V-->W
V-->X
V-->Y
V-->Z
V-->10
V-->11
V-->12
V-->13
V-->14
V-->15
V-->16
V-->L
V-->17
V-->18
V-->19
V-->K
W-->A
X-->A
Y-->W
Y-->X
Y-->A
10-->A
11-->A
12-->A
14-->A
15-->A
16-->A
17-->A
18-->10
18-->A
19-->E
1A-->A
1A-->V
1B-->1D
1B-->A
1B-->U
1B-->V
1D-->1E
1D-->10
1D-->18
1G-->1H
1G-->1I
1J-->1L
1J-->1U
1J-->7
1J-->23
1J-->T
1J-->24
1J-->26
1J-->2O
1J-->2C
1J-->2H
1J-->E
1J-->2
1L-->1M
1L-->1T
1M-->1N
1M-->1O
1M-->1P
1M-->1S
1O-->1N
1O-->1P
1O-->1S
1O-->1R
1P-->1N
1P-->1O
1P-->1Q
1P-->1S
1P-->1R
1Q-->1P
1Q-->1R
1S-->1N
1S-->1O
1S-->1P
1S-->1R
1T-->1M
1U-->1V
1U-->1W
1U-->1X
1U-->1Y
1U-->1Z
1U-->1D
1U-->20
1U-->21
1U-->22
1V-->7
1W-->1V
22-->1V
24-->10
24-->1A
24-->1B
24-->19
26-->27
26-->2A
26-->2C
27-->29
29-->1L
29-->T
29-->E
2A-->2C
2C-->2D
2C-->2G
2C-->2H
2C-->2J
2C-->2K
2C-->2L
2C-->2M
2C-->2N
2D-->2E
2D-->2F
2E-->1L
2E-->1E
2F-->10
2G-->2D
2G-->2E
2G-->29
2G-->2F
2J-->2G
2K-->2G
2L-->2G
2M-->2G
2N-->2G
2O-->2P
2O-->T
2O-->27
2O-->2C
2P-->2F
2Q-->1U
2Q-->7
2Q-->T
2Q-->24
2Q-->26
2Q-->2
2Q-->1J
2R-->3
2R-->6
2R-->1J
2R-->2Q
2T-->2R
2T-->1L
2T-->7
2T-->T
2T-->1G
2T-->2U
2U-->2R
2U-->T
2X-->1L
2X-->T
2X-->2Y
2X-->2Z
2X-->30
31-->3
31-->1J
31-->2Q
31-->2F
31-->T
31-->2O
31-->2H
31-->E
31-->2X
31-->2Y
31-->2Z
31-->30
32-->7
32-->A
32-->31
33-->31
33-->32
35-->2
35-->1L
35-->1U
35-->7
35-->23
35-->T
35-->E
35-->36
35-->38
35-->3A
35-->3N
35-->37
36-->29
36-->37
38-->2P
38-->36
38-->3A
38-->3N
3A-->2D
3A-->2G
3A-->37
3A-->3B
3A-->3C
3A-->3D
3A-->3E
3A-->3F
3A-->3G
3A-->3H
3A-->3I
3A-->3J
3A-->3K
3A-->3L
3A-->3M
3B-->2G
3C-->2G
3D-->2J
3E-->2K
3F-->2L
3F-->2G
3G-->2G
3H-->2G
3I-->2G
3J-->2M
3K-->2G
3L-->2N
3M-->2G
3N-->M
3N-->T
3N-->A
3N-->24
3O-->35
3O-->37
3Q-->2
3Q-->1L
3Q-->1U
3Q-->7
3Q-->23
3Q-->T
3Q-->E
3Q-->3R
3Q-->3T
3Q-->3V
3Q-->48
3Q-->3S
3R-->29
3R-->3S
3T-->2P
3T-->3R
3T-->3V
3T-->48
3V-->2D
3V-->2G
3V-->3S
3V-->3W
3V-->3X
3V-->3Y
3V-->3Z
3V-->40
3V-->41
3V-->42
3V-->43
3V-->44
3V-->45
3V-->46
3V-->47
3W-->2G
3X-->2G
3Y-->2J
3Z-->2K
40-->2L
40-->2G
41-->2G
42-->2G
43-->2G
44-->2M
45-->2G
46-->2N
47-->2G
48-->M
48-->T
48-->A
48-->24
49-->3Q
49-->3S

class 0,1,4,9,D,1C,1F,1K,25,2B,28,2I,2W,34,39,3P,3U subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
