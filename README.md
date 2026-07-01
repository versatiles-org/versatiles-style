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
1M["satellite.ts"]
1N["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
end
subgraph 6["types"]
7["index.ts"]
8["tilejson.ts"]
9["vector_layer.ts"]
1S["maplibre.ts"]
end
subgraph B["color"]
C["recolor.ts"]
D["abstract.ts"]
1A["index.ts"]
1B["hsl.ts"]
1C["hsv.ts"]
1D["random.ts"]
1E["utils.ts"]
1F["rgb.ts"]
end
subgraph E["features"]
F["index.ts"]
G["elevation-source.ts"]
H["hillshade.ts"]
I["landcover.ts"]
J["sun.ts"]
K["terrain.ts"]
end
subgraph L["options"]
M["index.ts"]
N["colors.ts"]
V["features.ts"]
W["hillshade.ts"]
X["layout.ts"]
Y["osm.ts"]
Z["recolor.ts"]
10["sky.ts"]
11["sun.ts"]
12["text.ts"]
13["theme.ts"]
14["urls.ts"]
15["sprite.ts"]
16["satellite.ts"]
1Q["layer-groups.ts"]
end
subgraph O["themes"]
P["index.ts"]
Q["colorful.ts"]
R["gray.ts"]
S["muted.ts"]
T["natural.ts"]
U["toner.ts"]
1R["types.ts"]
end
subgraph 17["shortbread"]
18["index.ts"]
19["context.ts"]
1G["groups.ts"]
1L["build.ts"]
end
1O["index.ts"]
1P["variants.ts"]
end
subgraph 1H["**"]
subgraph 1I["shortbread"]
subgraph 1J["layers"]
1K["* (13 files)"]
end
end
end
2-->4
2-->5
2-->7
2-->A
2-->1M
4-->5
7-->8
7-->9
A-->C
A-->F
A-->4
A-->M
A-->18
A-->P
C-->D
F-->G
F-->H
F-->I
F-->J
F-->K
H-->G
K-->G
M-->N
M-->V
M-->W
M-->X
M-->Y
M-->Z
M-->16
M-->10
M-->15
M-->11
M-->12
M-->13
M-->14
N-->P
P-->Q
P-->R
P-->S
P-->T
P-->U
V-->W
Y-->N
Y-->V
Y-->X
Y-->Z
Y-->10
Y-->11
Y-->12
Y-->13
Y-->14
14-->5
14-->15
15-->5
16-->V
16-->Y
16-->10
16-->11
16-->14
18-->19
18-->1G
18-->1K
19-->1A
19-->M
1A-->D
1A-->1B
1A-->1C
1A-->C
1A-->1F
1B-->D
1B-->1C
1B-->1F
1B-->1E
1C-->D
1C-->1B
1C-->1D
1C-->1F
1C-->1E
1D-->1C
1D-->1E
1F-->D
1F-->1B
1F-->1C
1F-->1E
1G-->M
1G-->19
1G-->1K
1K-->1L
1L-->1A
1M-->F
1M-->4
1M-->M
1M-->18
1M-->A
1N-->2
1N-->A
1N-->1M
1O-->2
1O-->A
1O-->1M
1O-->1A
1O-->M
1O-->7
1O-->1P
1P-->A
1P-->1M

class 0,1,3,6,B,E,L,O,17,1H,1I,1J subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
