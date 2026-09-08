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
A["osm.ts"]
1R["satellite.ts"]
1S["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
M["tileSource.ts"]
1U["fetchTileJSON.ts"]
1V["inlineSources.ts"]
end
subgraph 6["types"]
7["index.ts"]
8["tilejson.ts"]
9["vector_layer.ts"]
1Y["maplibre.ts"]
end
subgraph B["color"]
C["recolor.ts"]
D["abstract.ts"]
T["index.ts"]
U["hsl.ts"]
V["hsv.ts"]
W["random.ts"]
X["utils.ts"]
Y["rgb.ts"]
end
subgraph E["features"]
F["index.ts"]
G["elevation-source.ts"]
H["hillshade.ts"]
I["landcover.ts"]
J["sky.ts"]
K["sun.ts"]
L["terrain.ts"]
end
subgraph N["options"]
O["index.ts"]
P["colors.ts"]
13["features-hillshade.ts"]
14["features-terrain.ts"]
15["features.ts"]
16["layer-groups.ts"]
17["layout.ts"]
18["osm-overlay.ts"]
19["recolor.ts"]
1A["text.ts"]
1B["theme.ts"]
1C["osm.ts"]
1D["sky.ts"]
1E["sun.ts"]
1F["urls.ts"]
1G["sprite.ts"]
1H["satellite-raster.ts"]
1I["satellite.ts"]
end
subgraph Q["themes"]
R["index.ts"]
S["colorful.ts"]
Z["gray.ts"]
10["muted.ts"]
11["natural.ts"]
12["toner.ts"]
1X["types.ts"]
end
subgraph 1J["shortbread"]
1K["index.ts"]
1L["context.ts"]
1M["groups.ts"]
subgraph 1N["layers"]
1O["* (13 files)"]
end
1P["build.ts"]
1Q["layer-groups-map.ts"]
end
1T["index.ts"]
1W["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->1R
4-->5
7-->8
7-->9
A-->C
A-->F
A-->M
A-->O
A-->1K
A-->1Q
A-->R
C-->D
F-->G
F-->H
F-->I
F-->J
F-->K
F-->L
H-->G
L-->G
O-->P
O-->13
O-->14
O-->15
O-->16
O-->17
O-->18
O-->1C
O-->19
O-->1H
O-->1I
O-->1D
O-->1G
O-->1E
O-->1A
O-->1B
O-->1F
P-->R
R-->S
R-->Z
R-->10
R-->11
R-->12
S-->T
T-->D
T-->U
T-->V
T-->C
T-->Y
U-->D
U-->V
U-->Y
U-->X
V-->D
V-->U
V-->W
V-->Y
V-->X
W-->V
W-->X
Y-->D
Y-->U
Y-->V
Y-->X
Z-->T
10-->T
11-->T
12-->T
15-->13
15-->14
18-->P
18-->16
18-->17
18-->19
18-->1A
18-->1B
1C-->P
1C-->15
1C-->16
1C-->17
1C-->19
1C-->1D
1C-->1E
1C-->1A
1C-->1B
1C-->1F
1F-->5
1F-->1G
1G-->5
1I-->15
1I-->18
1I-->1H
1I-->1D
1I-->1E
1I-->1F
1K-->1L
1K-->1M
1K-->1O
1L-->T
1L-->O
1M-->1O
1O-->1P
1P-->T
1Q-->O
1Q-->1L
1Q-->1O
1R-->F
1R-->M
1R-->O
1R-->1K
1R-->A
1S-->2
1S-->A
1S-->1R
1T-->1S
1T-->T
1T-->1U
1T-->1V
1T-->O
1T-->1B
1T-->7
1T-->1W
1U-->4
1V-->4
1V-->M
1W-->1S

class 0,1,3,6,B,E,N,Q,1J,1N subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
