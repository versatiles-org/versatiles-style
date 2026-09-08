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
1S["satellite.ts"]
1T["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
Z["styleMeta.ts"]
10["tileSource.ts"]
1V["fetchTileJSON.ts"]
1W["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
11["index.ts"]
12["colors.ts"]
1A["features-hillshade.ts"]
1B["features-terrain.ts"]
1C["features.ts"]
1D["layer-groups.ts"]
1E["layout.ts"]
1F["osm-overlay.ts"]
1G["recolor.ts"]
1H["text.ts"]
1I["theme.ts"]
1J["osm.ts"]
1K["sky.ts"]
1L["sun.ts"]
1M["satellite-raster.ts"]
1N["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
1Z["maplibre.ts"]
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
1O["index.ts"]
1P["context.ts"]
1Q["groups.ts"]
1R["layer-groups-map.ts"]
end
subgraph 13["themes"]
14["index.ts"]
15["colorful.ts"]
16["gray.ts"]
17["muted.ts"]
18["natural.ts"]
19["toner.ts"]
1Y["types.ts"]
end
1U["index.ts"]
1X["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1S
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
D-->11
D-->1O
D-->1R
D-->14
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
11-->12
11-->1A
11-->1B
11-->1C
11-->1D
11-->1E
11-->1F
11-->1J
11-->1G
11-->1M
11-->1N
11-->1K
11-->8
11-->1L
11-->1H
11-->1I
11-->7
12-->14
14-->15
14-->16
14-->17
14-->18
14-->19
15-->Q
16-->Q
17-->Q
18-->Q
19-->Q
1C-->1A
1C-->1B
1F-->12
1F-->1D
1F-->1E
1F-->1G
1F-->1H
1F-->1I
1J-->12
1J-->1C
1J-->1D
1J-->1E
1J-->1G
1J-->1K
1J-->1L
1J-->1H
1J-->1I
1J-->7
1N-->1C
1N-->1F
1N-->1M
1N-->1K
1N-->1L
1N-->7
1O-->1P
1O-->1Q
1O-->O
1P-->Q
1P-->11
1Q-->O
1R-->11
1R-->1P
1R-->O
1S-->I
1S-->Z
1S-->10
1S-->11
1S-->1O
1S-->D
1T-->2
1T-->D
1T-->1S
1U-->1T
1U-->Q
1U-->1V
1U-->1W
1U-->11
1U-->1I
1U-->A
1U-->1X
1V-->4
1W-->4
1W-->10
1X-->1T

class 0,1,3,6,9,E,H,M,N,13 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
