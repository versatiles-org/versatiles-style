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
8["osm.ts"]
1O["satellite.ts"]
1P["index.ts"]
end
subgraph 3["types"]
4["index.ts"]
5["colors.ts"]
6["tilejson.ts"]
7["vector_layer.ts"]
1T["layer-groups.ts"]
1U["maplibre.ts"]
1V["options.ts"]
1W["resolved.ts"]
end
subgraph 9["color"]
A["recolor.ts"]
B["abstract.ts"]
10["index.ts"]
11["hsl.ts"]
12["hsv.ts"]
13["random.ts"]
14["utils.ts"]
15["rgb.ts"]
end
subgraph C["features"]
D["index.ts"]
E["buildings.ts"]
F["elevation-source.ts"]
G["hillshade.ts"]
H["landcover.ts"]
I["terrain.ts"]
end
subgraph J["resolve"]
K["index.ts"]
L["isDarkMode.ts"]
M["resolveOsmOptions.ts"]
W["resolveSatelliteOptions.ts"]
end
subgraph N["lib"]
O["utils.ts"]
end
subgraph P["themes"]
Q["index.ts"]
R["colorful.ts"]
S["gray.ts"]
T["muted.ts"]
U["natural.ts"]
V["toner.ts"]
1S["types.ts"]
end
subgraph X["shortbread"]
Y["index.ts"]
Z["context.ts"]
16["groups.ts"]
subgraph 17["layers"]
18["index.ts"]
1B["airport.ts"]
1C["background.ts"]
1D["boundaries.ts"]
1E["buildings.ts"]
1F["labels.ts"]
1G["landcover.ts"]
1H["markings.ts"]
1I["pois.ts"]
1J["roads.ts"]
1K["sites.ts"]
1L["transitstops.ts"]
1M["water.ts"]
end
19["build.ts"]
1A["properties.ts"]
1N["template.ts"]
end
1Q["index.ts"]
1R["variants.ts"]
end
2-->4
2-->8
2-->1O
4-->5
4-->6
4-->7
8-->A
8-->D
8-->K
8-->Y
8-->Q
8-->4
A-->B
D-->E
D-->F
D-->G
D-->H
D-->I
G-->F
I-->F
K-->L
K-->M
K-->W
M-->O
M-->Q
M-->4
M-->L
Q-->R
Q-->S
Q-->T
Q-->U
Q-->V
W-->O
W-->M
Y-->Z
Y-->16
Y-->18
Y-->1N
Z-->10
Z-->4
10-->B
10-->11
10-->12
10-->A
10-->15
11-->B
11-->12
11-->15
11-->14
12-->B
12-->11
12-->13
12-->15
12-->14
13-->12
13-->14
15-->B
15-->11
15-->12
15-->14
16-->K
16-->Z
16-->18
18-->19
18-->1B
18-->1C
18-->1D
18-->1E
18-->1F
18-->1G
18-->1H
18-->1I
18-->1J
18-->1K
18-->1L
18-->1M
19-->10
19-->1A
1B-->19
1C-->19
1D-->19
1E-->19
1F-->19
1G-->19
1H-->19
1I-->19
1J-->19
1K-->19
1L-->19
1M-->19
1N-->O
1O-->D
1O-->K
1O-->Y
1O-->4
1O-->8
1P-->2
1P-->8
1P-->1O
1Q-->2
1Q-->8
1Q-->1O
1Q-->10
1Q-->5
1Q-->4
1Q-->1R
1R-->8
1R-->1O

class 0,1,3,9,C,J,N,P,X,17 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
