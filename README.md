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
D["osm.ts"]
1T["satellite.ts"]
1U["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
10["styleMeta.ts"]
11["tileSource.ts"]
1W["fetchTileJSON.ts"]
1X["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
12["index.ts"]
13["colors.ts"]
1B["features-hillshade.ts"]
1C["features-terrain.ts"]
1D["features.ts"]
1E["layer-groups.ts"]
1F["layout.ts"]
1G["osm-overlay.ts"]
1H["recolor.ts"]
1I["text.ts"]
1J["theme.ts"]
1K["osm.ts"]
1L["sky.ts"]
1M["sun.ts"]
1N["satellite-raster.ts"]
1O["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
20["maplibre.ts"]
end
subgraph E["color"]
F["recolor.ts"]
G["abstract.ts"]
Q["index.ts"]
R["hsl.ts"]
S["hsv.ts"]
T["random.ts"]
U["utils.ts"]
V["rgb.ts"]
end
subgraph H["features"]
I["index.ts"]
J["elevation-source.ts"]
K["hillshade.ts"]
L["landcover.ts"]
W["satellite-overlay.ts"]
X["sky.ts"]
Y["sun.ts"]
Z["terrain.ts"]
end
subgraph M["shortbread"]
subgraph N["layers"]
O["* (13 files)"]
end
P["build.ts"]
1P["index.ts"]
1Q["context.ts"]
1R["groups.ts"]
1S["layer-groups-map.ts"]
end
subgraph 14["themes"]
15["index.ts"]
16["colorful.ts"]
17["gray.ts"]
18["muted.ts"]
19["natural.ts"]
1A["toner.ts"]
1Z["types.ts"]
end
1V["index.ts"]
1Y["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1T
4-->5
7-->5
7-->8
8-->5
A-->B
A-->C
D-->F
D-->I
D-->10
D-->11
D-->12
D-->1P
D-->1S
D-->15
F-->G
I-->J
I-->K
I-->L
I-->W
I-->X
I-->Y
I-->Z
K-->J
L-->O
O-->P
P-->Q
Q-->G
Q-->R
Q-->S
Q-->F
Q-->V
R-->G
R-->S
R-->V
R-->U
S-->G
S-->R
S-->T
S-->V
S-->U
T-->S
T-->U
V-->G
V-->R
V-->S
V-->U
W-->P
Z-->J
12-->13
12-->1B
12-->1C
12-->1D
12-->1E
12-->1F
12-->1G
12-->1K
12-->1H
12-->1N
12-->1O
12-->1L
12-->8
12-->1M
12-->1I
12-->1J
12-->7
13-->15
15-->16
15-->17
15-->18
15-->19
15-->1A
16-->Q
17-->Q
18-->Q
19-->Q
1A-->Q
1D-->1B
1D-->1C
1G-->13
1G-->1E
1G-->1F
1G-->1H
1G-->1I
1G-->1J
1K-->13
1K-->1D
1K-->1E
1K-->1F
1K-->1H
1K-->1L
1K-->1M
1K-->1I
1K-->1J
1K-->7
1O-->W
1O-->1D
1O-->1G
1O-->1N
1O-->1L
1O-->1M
1O-->7
1P-->1Q
1P-->1R
1P-->O
1Q-->Q
1Q-->12
1R-->O
1S-->12
1S-->1Q
1S-->O
1T-->I
1T-->10
1T-->11
1T-->12
1T-->1P
1T-->D
1U-->2
1U-->D
1U-->1T
1V-->1U
1V-->Q
1V-->1W
1V-->1X
1V-->12
1V-->1J
1V-->A
1V-->1Y
1W-->4
1X-->4
1X-->11
1Y-->1U

class 0,1,3,6,9,E,H,M,N,14 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
