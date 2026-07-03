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
1U["maplibre.ts"]
end
subgraph B["color"]
C["recolor.ts"]
D["abstract.ts"]
S["index.ts"]
T["hsl.ts"]
U["hsv.ts"]
V["random.ts"]
W["utils.ts"]
X["rgb.ts"]
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
subgraph M["options"]
N["index.ts"]
O["colors.ts"]
12["features-hillshade.ts"]
13["features-terrain.ts"]
14["features.ts"]
15["layer-groups.ts"]
16["layout.ts"]
17["osm-overlay.ts"]
18["recolor.ts"]
19["text.ts"]
1A["theme.ts"]
1B["osm.ts"]
1C["sky.ts"]
1D["sun.ts"]
1E["urls.ts"]
1F["sprite.ts"]
1G["satellite-raster.ts"]
1H["satellite.ts"]
end
subgraph P["themes"]
Q["index.ts"]
R["colorful.ts"]
Y["gray.ts"]
Z["muted.ts"]
10["natural.ts"]
11["toner.ts"]
1T["types.ts"]
end
subgraph 1I["shortbread"]
1J["index.ts"]
1K["context.ts"]
1L["groups.ts"]
subgraph 1M["layers"]
1N["* (13 files)"]
end
1O["build.ts"]
end
1R["index.ts"]
1S["variants.ts"]
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
A-->N
A-->1J
A-->Q
C-->D
F-->G
F-->H
F-->I
F-->J
F-->K
F-->L
H-->G
L-->G
N-->O
N-->12
N-->13
N-->14
N-->15
N-->16
N-->17
N-->1B
N-->18
N-->1G
N-->1H
N-->1C
N-->1F
N-->1D
N-->19
N-->1A
N-->1E
O-->Q
Q-->R
Q-->Y
Q-->Z
Q-->10
Q-->11
R-->S
S-->D
S-->T
S-->U
S-->C
S-->X
T-->D
T-->U
T-->X
T-->W
U-->D
U-->T
U-->V
U-->X
U-->W
V-->U
V-->W
X-->D
X-->T
X-->U
X-->W
Y-->S
Z-->S
10-->S
11-->S
14-->12
14-->13
17-->O
17-->15
17-->16
17-->18
17-->19
17-->1A
1B-->O
1B-->14
1B-->15
1B-->16
1B-->18
1B-->1C
1B-->1D
1B-->19
1B-->1A
1B-->1E
1E-->5
1E-->1F
1F-->5
1H-->14
1H-->17
1H-->1G
1H-->1C
1H-->1D
1H-->1E
1J-->1K
1J-->1L
1J-->1N
1K-->S
1K-->N
1L-->1N
1N-->1O
1O-->S
1P-->F
1P-->4
1P-->N
1P-->1J
1P-->A
1Q-->2
1Q-->A
1Q-->1P
1R-->1Q
1R-->S
1R-->N
1R-->7
1R-->1S
1S-->1Q

class 0,1,3,6,B,E,M,P,1I,1M subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
