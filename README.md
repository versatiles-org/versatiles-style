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
D["osm.ts"]
1V["satellite.ts"]
1W["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
11["styleMeta.ts"]
12["tileSource.ts"]
1Y["fetchTileJSON.ts"]
1Z["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
13["index.ts"]
14["colors.ts"]
1C["features-hillshade.ts"]
1D["features-terrain.ts"]
1E["features.ts"]
1F["layer-groups.ts"]
1G["layout.ts"]
1H["osm-overlay.ts"]
1I["recolor.ts"]
1J["text.ts"]
1K["theme.ts"]
1L["osm.ts"]
1M["projection.ts"]
1N["sky.ts"]
1O["sun.ts"]
1P["satellite-raster.ts"]
1Q["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
22["maplibre.ts"]
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
W["projection.ts"]
X["satellite-overlay.ts"]
Y["sky.ts"]
Z["sun.ts"]
10["terrain.ts"]
end
subgraph M["shortbread"]
subgraph N["layers"]
O["* (13 files)"]
end
P["build.ts"]
1R["index.ts"]
1S["context.ts"]
1T["groups.ts"]
1U["layer-groups-map.ts"]
end
subgraph 15["themes"]
16["index.ts"]
17["colorful.ts"]
18["gray.ts"]
19["muted.ts"]
1A["natural.ts"]
1B["toner.ts"]
21["types.ts"]
end
1X["index.ts"]
20["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1V
4-->5
7-->5
7-->8
8-->5
A-->B
A-->C
D-->F
D-->I
D-->11
D-->12
D-->13
D-->1R
D-->1U
D-->16
F-->G
I-->J
I-->K
I-->L
I-->W
I-->X
I-->Y
I-->Z
I-->10
J-->5
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
X-->P
10-->J
12-->5
13-->14
13-->1C
13-->1D
13-->1E
13-->1F
13-->1G
13-->1H
13-->1L
13-->1M
13-->1I
13-->1P
13-->1Q
13-->1N
13-->8
13-->1O
13-->1J
13-->1K
13-->7
14-->16
16-->17
16-->18
16-->19
16-->1A
16-->1B
17-->Q
18-->Q
19-->Q
1A-->Q
1B-->Q
1E-->1C
1E-->1D
1H-->14
1H-->1F
1H-->1G
1H-->1I
1H-->1J
1H-->1K
1L-->14
1L-->1E
1L-->1F
1L-->1G
1L-->1M
1L-->1I
1L-->1N
1L-->1O
1L-->1J
1L-->1K
1L-->7
1Q-->X
1Q-->1E
1Q-->1H
1Q-->1M
1Q-->1P
1Q-->1N
1Q-->1O
1Q-->7
1R-->1S
1R-->1T
1R-->O
1S-->Q
1S-->13
1T-->O
1U-->13
1U-->1S
1U-->O
1V-->I
1V-->11
1V-->12
1V-->13
1V-->1R
1V-->D
1W-->2
1W-->D
1W-->1V
1X-->1W
1X-->Q
1X-->1Y
1X-->1Z
1X-->1K
1X-->A
1X-->20
1Y-->4
1Z-->4
1Z-->12
20-->1W

class 0,1,3,6,9,E,H,M,N,15 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
