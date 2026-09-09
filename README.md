[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Style

**VersaTiles Style** generates styles and sprites for MapLibre.

---

## Styles Overview

The `osm()` function renders OpenStreetMap vector tiles using one of five built-in color palettes,
each available in light and dark mode. `satellite()` renders raster/satellite tiles with an optional
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
  const style = VersaTilesStyle.osm({
    theme: { palette: 'colorful', darkMode: true },
    text: { language: 'de' },
    recolor: { gamma: 0.5 },
  });

  const map = new maplibregl.Map({
    container: 'map',
    style,
  });
</script>
```

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
import { osm } from '@versatiles/style';
import { writeFileSync } from 'node:fs';

const style = osm({
  theme: 'colorful',
  text: { language: 'en' },
});
writeFileSync('style.json', JSON.stringify(style));
```

---

## Style Generation Methods

All three functions are synchronous and return a MapLibre `StyleSpecification`:

- `osm(options)` - OpenStreetMap vector style. [Documentation](https://versatiles.org/versatiles-style/functions/osm.html)
  - `theme`: a palette name (`'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`) or `{ palette, darkMode }`.
  - `text`, `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/interfaces/OsmOptions.html).
- `satellite(options)` - raster/satellite style with an optional OSM overlay. [Documentation](https://versatiles.org/versatiles-style/functions/satellite.html) — see [SatelliteOptions](https://versatiles.org/versatiles-style/interfaces/SatelliteOptions.html).
- `guessStyle(tileJSON)` - inspect a TileJSON and return the most appropriate style. [Documentation](https://versatiles.org/versatiles-style/functions/guessStyle.html)

```javascript
import { guessStyle } from '@versatiles/style';
const style = guessStyle(tileJSON);
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

Define icon sets in the configuration file: [`scripts/config-sprites.ts`](./scripts/config-sprites.ts)

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
2["guessStyle.ts"]
1L["osm.ts"]
21["satellite.ts"]
22["index.ts"]
end
subgraph 3["lib"]
4["index.ts"]
5["fetchTileJSON.ts"]
6["loadTileSource.ts"]
7["utils.ts"]
8["inlineSources.ts"]
9["tileSource.ts"]
A["styleMeta.ts"]
end
subgraph B["options"]
C["index.ts"]
D["osm-overlay.ts"]
E["parts.ts"]
F["colors.ts"]
X["features-hillshade.ts"]
Y["features-terrain.ts"]
Z["features.ts"]
10["layer-groups.ts"]
11["layout.ts"]
12["projection.ts"]
13["recolor.ts"]
14["satellite-raster.ts"]
15["sky.ts"]
16["sprite.ts"]
17["sun.ts"]
18["text.ts"]
19["theme.ts"]
1A["urls.ts"]
1B["osm.ts"]
1C["satellite.ts"]
end
subgraph G["themes"]
H["index.ts"]
I["colorful.ts"]
T["gray.ts"]
U["muted.ts"]
V["natural.ts"]
W["toner.ts"]
25["types.ts"]
end
subgraph J["color"]
K["index.ts"]
L["parse.ts"]
M["abstract.ts"]
N["hsl.ts"]
O["hsv.ts"]
P["random.ts"]
Q["utils.ts"]
R["rgb.ts"]
S["recolor.ts"]
end
subgraph 1D["features"]
1E["satellite-overlay.ts"]
1M["index.ts"]
1N["elevation-source.ts"]
1O["hillshade.ts"]
1P["landcover.ts"]
1S["projection.ts"]
1T["sky.ts"]
1U["sun.ts"]
1V["terrain.ts"]
end
subgraph 1F["shortbread"]
1G["build.ts"]
subgraph 1Q["layers"]
1R["* (13 files)"]
end
1W["index.ts"]
1X["context.ts"]
1Y["groups.ts"]
1Z["schema.ts"]
20["layer-groups-map.ts"]
end
subgraph 1H["types"]
1I["index.ts"]
1J["tilejson.ts"]
1K["vector_layer.ts"]
26["maplibre.ts"]
end
23["index.ts"]
24["variants.ts"]
end
2-->4
2-->C
2-->1I
2-->1L
2-->21
4-->5
4-->8
4-->6
4-->A
4-->9
4-->7
5-->6
6-->7
8-->6
8-->9
9-->7
C-->D
C-->1B
C-->E
C-->1C
D-->E
E-->F
E-->X
E-->Y
E-->Z
E-->10
E-->11
E-->12
E-->13
E-->14
E-->15
E-->16
E-->17
E-->18
E-->19
E-->1A
F-->H
H-->I
H-->T
H-->U
H-->V
H-->W
I-->K
K-->L
K-->S
L-->M
L-->N
L-->O
L-->R
N-->M
N-->O
N-->R
N-->Q
O-->M
O-->N
O-->P
O-->R
O-->Q
P-->O
P-->Q
R-->M
R-->N
R-->O
R-->Q
S-->L
T-->K
U-->K
V-->K
W-->K
Z-->X
Z-->Y
16-->4
1A-->4
1A-->16
1B-->E
1C-->1E
1C-->D
1C-->E
1E-->1G
1G-->K
1I-->1J
1I-->1K
1L-->K
1L-->1M
1L-->4
1L-->C
1L-->1W
1L-->20
1L-->H
1M-->1N
1M-->1O
1M-->1P
1M-->1S
1M-->1E
1M-->1T
1M-->1U
1M-->1V
1N-->4
1O-->1N
1P-->1R
1R-->1G
1R-->1Z
1V-->1N
1W-->1X
1W-->1Y
1W-->1R
1X-->K
1X-->C
1Y-->1R
20-->C
20-->1X
20-->1R
21-->1M
21-->4
21-->C
21-->1W
21-->1L
22-->2
22-->1L
22-->21
23-->22
23-->K
23-->4
23-->C
23-->1I
23-->24
24-->22

class 0,1,3,B,G,J,1D,1F,1Q,1H subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
