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
1R["satellite.ts"]
1S["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
Z["tileSource.ts"]
1U["fetchTileJSON.ts"]
1V["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
10["index.ts"]
11["colors.ts"]
19["features-hillshade.ts"]
1A["features-terrain.ts"]
1B["features.ts"]
1C["layer-groups.ts"]
1D["layout.ts"]
1E["osm-overlay.ts"]
1F["recolor.ts"]
1G["text.ts"]
1H["theme.ts"]
1I["osm.ts"]
1J["sky.ts"]
1K["sun.ts"]
1L["satellite-raster.ts"]
1M["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
1Y["maplibre.ts"]
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
W["sky.ts"]
X["sun.ts"]
Y["terrain.ts"]
end
subgraph M["shortbread"]
subgraph N["layers"]
O["* (13 files)"]
end
P["build.ts"]
1N["index.ts"]
1O["context.ts"]
1P["groups.ts"]
1Q["layer-groups-map.ts"]
end
subgraph 12["themes"]
13["index.ts"]
14["colorful.ts"]
15["gray.ts"]
16["muted.ts"]
17["natural.ts"]
18["toner.ts"]
1X["types.ts"]
end
1T["index.ts"]
1W["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1R
4-->5
7-->5
7-->8
8-->5
A-->B
A-->C
D-->F
D-->I
D-->Z
D-->10
D-->1N
D-->1Q
D-->13
F-->G
I-->J
I-->K
I-->L
I-->W
I-->X
I-->Y
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
Y-->J
10-->11
10-->19
10-->1A
10-->1B
10-->1C
10-->1D
10-->1E
10-->1I
10-->1F
10-->1L
10-->1M
10-->1J
10-->8
10-->1K
10-->1G
10-->1H
10-->7
11-->13
13-->14
13-->15
13-->16
13-->17
13-->18
14-->Q
15-->Q
16-->Q
17-->Q
18-->Q
1B-->19
1B-->1A
1E-->11
1E-->1C
1E-->1D
1E-->1F
1E-->1G
1E-->1H
1I-->11
1I-->1B
1I-->1C
1I-->1D
1I-->1F
1I-->1J
1I-->1K
1I-->1G
1I-->1H
1I-->7
1M-->1B
1M-->1E
1M-->1L
1M-->1J
1M-->1K
1M-->7
1N-->1O
1N-->1P
1N-->O
1O-->Q
1O-->10
1P-->O
1Q-->10
1Q-->1O
1Q-->O
1R-->I
1R-->Z
1R-->10
1R-->1N
1R-->D
1S-->2
1S-->D
1S-->1R
1T-->1S
1T-->Q
1T-->1U
1T-->1V
1T-->10
1T-->1H
1T-->A
1T-->1W
1U-->4
1V-->4
1V-->Z
1W-->1S

class 0,1,3,6,9,E,H,M,N,12 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
