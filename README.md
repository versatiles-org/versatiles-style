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
1O["satellite.ts"]
1P["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
end
subgraph 6["types"]
7["index.ts"]
8["tilejson.ts"]
9["vector_layer.ts"]
1T["maplibre.ts"]
end
subgraph B["color"]
C["recolor.ts"]
D["abstract.ts"]
R["index.ts"]
S["hsl.ts"]
T["hsv.ts"]
U["random.ts"]
V["utils.ts"]
W["rgb.ts"]
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
11["features-hillshade.ts"]
12["features-terrain.ts"]
13["features.ts"]
14["layer-groups.ts"]
15["layout.ts"]
16["osm-overlay.ts"]
17["recolor.ts"]
18["text.ts"]
19["theme.ts"]
1A["osm.ts"]
1B["sky.ts"]
1C["sun.ts"]
1D["urls.ts"]
1E["sprite.ts"]
1F["satellite-raster.ts"]
1G["satellite.ts"]
end
subgraph O["themes"]
P["index.ts"]
Q["colorful.ts"]
X["gray.ts"]
Y["muted.ts"]
Z["natural.ts"]
10["toner.ts"]
1S["types.ts"]
end
subgraph 1H["shortbread"]
1I["index.ts"]
1J["context.ts"]
1K["groups.ts"]
subgraph 1L["layers"]
1M["* (13 files)"]
end
1N["build.ts"]
end
1Q["index.ts"]
1R["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->1O
4-->5
7-->8
7-->9
A-->C
A-->F
A-->4
A-->M
A-->1I
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
M-->11
M-->12
M-->13
M-->14
M-->15
M-->16
M-->1A
M-->17
M-->1F
M-->1G
M-->1B
M-->1E
M-->1C
M-->18
M-->19
M-->1D
N-->P
P-->Q
P-->X
P-->Y
P-->Z
P-->10
Q-->R
R-->D
R-->S
R-->T
R-->C
R-->W
S-->D
S-->T
S-->W
S-->V
T-->D
T-->S
T-->U
T-->W
T-->V
U-->T
U-->V
W-->D
W-->S
W-->T
W-->V
X-->R
Y-->R
Z-->R
10-->R
13-->11
13-->12
16-->N
16-->14
16-->15
16-->17
16-->18
16-->19
1A-->N
1A-->13
1A-->14
1A-->15
1A-->17
1A-->1B
1A-->1C
1A-->18
1A-->19
1A-->1D
1D-->5
1D-->1E
1E-->5
1G-->13
1G-->16
1G-->1F
1G-->1B
1G-->1C
1G-->1D
1I-->1J
1I-->1K
1I-->1M
1J-->R
1J-->M
1K-->1M
1M-->1N
1N-->R
1O-->F
1O-->4
1O-->M
1O-->1I
1O-->A
1P-->2
1P-->A
1P-->1O
1Q-->2
1Q-->A
1Q-->1O
1Q-->R
1Q-->M
1Q-->7
1Q-->1R
1R-->A
1R-->1O

class 0,1,3,6,B,E,L,O,1H,1L subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
