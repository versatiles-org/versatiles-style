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
1P["satellite.ts"]
1Q["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
end
subgraph 6["types"]
7["index.ts"]
8["tilejson.ts"]
9["vector_layer.ts"]
1V["maplibre.ts"]
end
subgraph B["color"]
C["recolor.ts"]
D["abstract.ts"]
1D["index.ts"]
1E["hsl.ts"]
1F["hsv.ts"]
1G["random.ts"]
1H["utils.ts"]
1I["rgb.ts"]
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
V["features-hillshade.ts"]
W["features-terrain.ts"]
X["features.ts"]
Y["layout.ts"]
Z["osm-content.ts"]
10["recolor.ts"]
11["text.ts"]
12["theme.ts"]
13["osm.ts"]
14["sky.ts"]
15["sun.ts"]
16["urls.ts"]
17["sprite.ts"]
18["satellite.ts"]
19["satellite-raster.ts"]
1T["layer-groups.ts"]
end
subgraph O["themes"]
P["index.ts"]
Q["colorful.ts"]
R["gray.ts"]
S["muted.ts"]
T["natural.ts"]
U["toner.ts"]
1U["types.ts"]
end
subgraph 1A["shortbread"]
1B["index.ts"]
1C["context.ts"]
1J["groups.ts"]
1O["build.ts"]
end
1R["index.ts"]
1S["variants.ts"]
end
subgraph 1K["**"]
subgraph 1L["shortbread"]
subgraph 1M["layers"]
1N["* (13 files)"]
end
end
end
2-->4
2-->5
2-->7
2-->A
2-->1P
4-->5
7-->8
7-->9
A-->C
A-->F
A-->4
A-->M
A-->1B
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
M-->13
M-->10
M-->18
M-->14
M-->17
M-->15
M-->11
M-->12
M-->16
N-->P
P-->Q
P-->R
P-->S
P-->T
P-->U
X-->V
X-->W
Z-->N
Z-->Y
Z-->10
Z-->11
Z-->12
13-->N
13-->X
13-->Y
13-->10
13-->14
13-->15
13-->11
13-->12
13-->16
16-->5
16-->17
17-->5
18-->X
18-->Z
18-->19
18-->14
18-->15
18-->16
1B-->1C
1B-->1J
1B-->1N
1C-->1D
1C-->M
1D-->D
1D-->1E
1D-->1F
1D-->C
1D-->1I
1E-->D
1E-->1F
1E-->1I
1E-->1H
1F-->D
1F-->1E
1F-->1G
1F-->1I
1F-->1H
1G-->1F
1G-->1H
1I-->D
1I-->1E
1I-->1F
1I-->1H
1J-->M
1J-->1C
1J-->1N
1N-->1O
1O-->1D
1P-->F
1P-->4
1P-->M
1P-->1B
1P-->A
1Q-->2
1Q-->A
1Q-->1P
1R-->2
1R-->A
1R-->1P
1R-->1D
1R-->M
1R-->7
1R-->1S
1S-->A
1S-->1P

class 0,1,3,6,B,E,L,O,1A,1K,1L,1M subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
