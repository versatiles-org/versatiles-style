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
1G["osm.ts"]
1X["satellite.ts"]
1Y["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
1R["styleMeta.ts"]
1S["tileSource.ts"]
20["fetchTileJSON.ts"]
21["inlineSources.ts"]
end
subgraph 6["options"]
7["index.ts"]
8["osm-overlay.ts"]
9["parts.ts"]
A["colors.ts"]
S["features-hillshade.ts"]
T["features-terrain.ts"]
U["features.ts"]
V["layer-groups.ts"]
W["layout.ts"]
X["projection.ts"]
Y["recolor.ts"]
Z["satellite-raster.ts"]
10["sky.ts"]
11["sprite.ts"]
12["sun.ts"]
13["text.ts"]
14["theme.ts"]
15["urls.ts"]
16["osm.ts"]
17["satellite.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
O["gray.ts"]
P["muted.ts"]
Q["natural.ts"]
R["toner.ts"]
23["types.ts"]
end
subgraph E["color"]
F["index.ts"]
G["parse.ts"]
H["abstract.ts"]
I["hsl.ts"]
J["hsv.ts"]
K["random.ts"]
L["utils.ts"]
M["rgb.ts"]
N["recolor.ts"]
end
subgraph 18["features"]
19["satellite-overlay.ts"]
1H["index.ts"]
1I["elevation-source.ts"]
1J["hillshade.ts"]
1K["landcover.ts"]
1N["projection.ts"]
1O["sky.ts"]
1P["sun.ts"]
1Q["terrain.ts"]
end
subgraph 1A["shortbread"]
1B["build.ts"]
subgraph 1L["layers"]
1M["* (13 files)"]
end
1T["index.ts"]
1U["context.ts"]
1V["groups.ts"]
1W["layer-groups-map.ts"]
end
subgraph 1C["types"]
1D["index.ts"]
1E["tilejson.ts"]
1F["vector_layer.ts"]
24["maplibre.ts"]
end
1Z["index.ts"]
22["variants.ts"]
end
2-->4
2-->5
2-->7
2-->1D
2-->1G
2-->1X
4-->5
7-->8
7-->16
7-->9
7-->17
8-->9
9-->A
9-->S
9-->T
9-->U
9-->V
9-->W
9-->X
9-->Y
9-->Z
9-->10
9-->11
9-->12
9-->13
9-->14
9-->15
A-->C
C-->D
C-->O
C-->P
C-->Q
C-->R
D-->F
F-->G
F-->N
G-->H
G-->I
G-->J
G-->M
I-->H
I-->J
I-->M
I-->L
J-->H
J-->I
J-->K
J-->M
J-->L
K-->J
K-->L
M-->H
M-->I
M-->J
M-->L
N-->G
O-->F
P-->F
Q-->F
R-->F
U-->S
U-->T
11-->5
15-->5
15-->11
16-->9
17-->19
17-->8
17-->9
19-->1B
1B-->F
1D-->1E
1D-->1F
1G-->F
1G-->1H
1G-->1R
1G-->1S
1G-->7
1G-->1T
1G-->1W
1G-->C
1H-->1I
1H-->1J
1H-->1K
1H-->1N
1H-->19
1H-->1O
1H-->1P
1H-->1Q
1I-->5
1J-->1I
1K-->1M
1M-->1B
1Q-->1I
1S-->5
1T-->1U
1T-->1V
1T-->1M
1U-->F
1U-->7
1V-->1M
1W-->7
1W-->1U
1W-->1M
1X-->1H
1X-->1R
1X-->1S
1X-->7
1X-->1T
1X-->1G
1Y-->2
1Y-->1G
1Y-->1X
1Z-->1Y
1Z-->F
1Z-->20
1Z-->21
1Z-->7
1Z-->1D
1Z-->22
20-->4
21-->4
21-->1S
22-->1Y

class 0,1,3,6,B,E,18,1A,1L,1C subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
