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
1H["osm.ts"]
2O["satellite.ts"]
2P["index.ts"]
2Q["schema-builder.ts"]
end
subgraph 4["lib"]
5["schema-signatures.ts"]
7["index.ts"]
8["fetchTileJSON.ts"]
K["loadTileSource.ts"]
L["utils.ts"]
M["inlineSources.ts"]
N["tileSource.ts"]
O["styleMeta.ts"]
1C["opacity.ts"]
21["languages.ts"]
2T["schema-audit.ts"]
end
subgraph 9["options"]
A["keys.ts"]
B["v5-hints.ts"]
C["colors.ts"]
P["index.ts"]
Q["osm-overlay.ts"]
R["parts.ts"]
S["features-hillshade.ts"]
T["features-terrain.ts"]
U["features.ts"]
V["font-names.ts"]
W["fonts.ts"]
X["layer-groups.ts"]
Y["layout.ts"]
Z["projection.ts"]
10["recolor.ts"]
11["satellite-raster.ts"]
12["sky.ts"]
13["sprite.ts"]
14["sun.ts"]
15["text.ts"]
16["theme.ts"]
17["urls.ts"]
18["osm.ts"]
19["satellite.ts"]
22["minimize.ts"]
end
subgraph D["themes"]
E["index.ts"]
F["colorful.ts"]
G["gray.ts"]
H["muted.ts"]
I["natural.ts"]
J["toner.ts"]
48["types.ts"]
end
subgraph 1A["features"]
1B["satellite-overlay.ts"]
1S["index.ts"]
1T["elevation-source.ts"]
1U["hillshade.ts"]
1V["landcover.ts"]
1W["layout.ts"]
1X["projection.ts"]
1Y["sky.ts"]
1Z["sun.ts"]
20["terrain.ts"]
end
subgraph 1D["types"]
1E["index.ts"]
1F["tilejson.ts"]
1G["vector_layer.ts"]
49["maplibre.ts"]
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
end
subgraph 23["shortbread"]
24["index.ts"]
25["context.ts"]
28["groups.ts"]
subgraph 29["layers"]
2A["* (13 files)"]
end
2F["schema.ts"]
2M["layer-groups-map.ts"]
end
subgraph 26["dsl"]
27["context.ts"]
2B["assemble.ts"]
2C["build.ts"]
2D["fonts.ts"]
2E["index.ts"]
2N["group-maps.ts"]
end
subgraph 2G["cartography"]
2H["boundaries.ts"]
2I["buildings.ts"]
2J["labels.ts"]
2K["roads.ts"]
2L["transitstops.ts"]
end
2R["index.ts"]
2S["variants.ts"]
subgraph 2U["migrate"]
2V["calibrate.ts"]
2W["evaluate.ts"]
2X["math.ts"]
2Y["probes.ts"]
2Z["derive.ts"]
30["guess.ts"]
31["index.ts"]
end
subgraph 32["omt"]
33["api.ts"]
34["context.ts"]
35["schema.ts"]
36["layer-groups-map.ts"]
subgraph 37["layers"]
38["index.ts"]
39["airport.ts"]
3A["background.ts"]
3B["boundaries.ts"]
3C["buildings.ts"]
3D["labels.ts"]
3E["landcover.ts"]
3F["markings.ts"]
3G["pois.ts"]
3H["roads.ts"]
3I["sites.ts"]
3J["transitstops.ts"]
3K["water.ts"]
end
3L["options.ts"]
3M["index.ts"]
end
subgraph 3N["protomaps"]
3O["api.ts"]
3P["context.ts"]
3Q["schema.ts"]
3R["layer-groups-map.ts"]
subgraph 3S["layers"]
3T["index.ts"]
3U["airport.ts"]
3V["background.ts"]
3W["boundaries.ts"]
3X["buildings.ts"]
3Y["labels.ts"]
3Z["landcover.ts"]
40["markings.ts"]
41["pois.ts"]
42["roads.ts"]
43["sites.ts"]
44["transitstops.ts"]
45["water.ts"]
end
46["options.ts"]
47["index.ts"]
end
end
3-->5
6-->7
6-->5
6-->P
6-->A
6-->1E
6-->3
6-->1H
6-->2O
7-->8
7-->M
7-->K
7-->O
7-->N
7-->L
8-->A
8-->K
A-->B
B-->C
C-->E
C-->A
E-->F
E-->G
E-->H
E-->I
E-->J
K-->L
M-->A
M-->K
M-->N
N-->L
P-->Q
P-->18
P-->R
P-->19
Q-->A
Q-->R
R-->C
R-->S
R-->T
R-->U
R-->V
R-->W
R-->X
R-->Y
R-->Z
R-->10
R-->11
R-->12
R-->13
R-->14
R-->15
R-->16
R-->17
S-->A
T-->A
U-->S
U-->T
U-->A
W-->A
X-->A
Y-->A
10-->A
11-->A
12-->A
13-->7
14-->A
15-->W
15-->A
16-->E
17-->7
17-->A
17-->13
18-->A
18-->R
19-->1B
19-->A
19-->Q
19-->R
1B-->1C
1B-->W
1B-->15
1E-->1F
1E-->1G
1H-->1J
1H-->1S
1H-->7
1H-->21
1H-->P
1H-->22
1H-->24
1H-->2M
1H-->2A
1H-->2F
1H-->E
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
1S-->1W
1S-->1X
1S-->1B
1S-->1Y
1S-->1Z
1S-->20
1T-->7
1U-->1T
20-->1T
22-->W
22-->18
22-->19
22-->16
24-->25
24-->28
24-->2A
25-->27
27-->1J
27-->P
27-->E
28-->2A
2A-->2B
2A-->2E
2A-->2F
2A-->2H
2A-->2I
2A-->2J
2A-->2K
2A-->2L
2B-->2C
2B-->2D
2C-->1J
2C-->1C
2D-->W
2E-->2B
2E-->2C
2E-->27
2E-->2D
2H-->2E
2I-->2E
2J-->2E
2K-->2E
2L-->2E
2M-->2N
2M-->P
2M-->25
2M-->2A
2N-->2D
2O-->1S
2O-->7
2O-->P
2O-->22
2O-->24
2O-->2
2O-->1H
2P-->3
2P-->6
2P-->1H
2P-->2O
2R-->2P
2R-->1J
2R-->7
2R-->P
2R-->1E
2R-->2S
2S-->2P
2S-->P
2V-->1J
2V-->P
2V-->2W
2V-->2X
2V-->2Y
2Z-->3
2Z-->1H
2Z-->2O
2Z-->2D
2Z-->P
2Z-->2M
2Z-->2F
2Z-->E
2Z-->2V
2Z-->2W
2Z-->2X
2Z-->2Y
30-->7
30-->A
30-->2Z
31-->2Z
31-->30
33-->2
33-->1J
33-->1S
33-->7
33-->21
33-->P
33-->E
33-->34
33-->36
33-->38
33-->3L
33-->35
34-->27
34-->35
36-->2N
36-->34
36-->38
36-->3L
38-->2B
38-->2E
38-->35
38-->39
38-->3A
38-->3B
38-->3C
38-->3D
38-->3E
38-->3F
38-->3G
38-->3H
38-->3I
38-->3J
38-->3K
39-->2E
3A-->2E
3B-->2H
3C-->2I
3D-->2J
3D-->2E
3E-->2E
3F-->2E
3G-->2E
3H-->2K
3I-->2E
3J-->2L
3K-->2E
3L-->L
3L-->P
3L-->A
3L-->22
3M-->33
3M-->35
3O-->2
3O-->1J
3O-->1S
3O-->7
3O-->21
3O-->P
3O-->E
3O-->3P
3O-->3R
3O-->3T
3O-->46
3O-->3Q
3P-->27
3P-->3Q
3R-->2N
3R-->3P
3R-->3T
3R-->46
3T-->2B
3T-->2E
3T-->3Q
3T-->3U
3T-->3V
3T-->3W
3T-->3X
3T-->3Y
3T-->3Z
3T-->40
3T-->41
3T-->42
3T-->43
3T-->44
3T-->45
3U-->2E
3V-->2E
3W-->2H
3X-->2I
3Y-->2J
3Y-->2E
3Z-->2E
40-->2E
41-->2E
42-->2K
43-->2E
44-->2L
45-->2E
46-->L
46-->P
46-->A
46-->22
47-->3O
47-->3Q

class 0,1,4,9,D,1A,1D,1I,23,29,26,2G,2U,32,37,3N,3S subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
