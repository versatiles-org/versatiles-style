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
1W["satellite.ts"]
1X["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
11["styleMeta.ts"]
12["tileSource.ts"]
1Z["fetchTileJSON.ts"]
20["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
13["index.ts"]
14["osm-overlay.ts"]
15["parts.ts"]
16["colors.ts"]
1E["features-hillshade.ts"]
1F["features-terrain.ts"]
1G["features.ts"]
1H["layer-groups.ts"]
1I["layout.ts"]
1J["projection.ts"]
1K["recolor.ts"]
1L["satellite-raster.ts"]
1M["sky.ts"]
1N["sun.ts"]
1O["text.ts"]
1P["theme.ts"]
1Q["osm.ts"]
1R["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
23["maplibre.ts"]
end
subgraph E["color"]
F["index.ts"]
G["abstract.ts"]
H["hsl.ts"]
I["hsv.ts"]
J["random.ts"]
K["utils.ts"]
L["rgb.ts"]
M["recolor.ts"]
end
subgraph N["features"]
O["index.ts"]
P["elevation-source.ts"]
Q["hillshade.ts"]
R["landcover.ts"]
W["projection.ts"]
X["satellite-overlay.ts"]
Y["sky.ts"]
Z["sun.ts"]
10["terrain.ts"]
end
subgraph S["shortbread"]
subgraph T["layers"]
U["* (13 files)"]
end
V["build.ts"]
1S["index.ts"]
1T["context.ts"]
1U["groups.ts"]
1V["layer-groups-map.ts"]
end
subgraph 17["themes"]
18["index.ts"]
19["colorful.ts"]
1A["gray.ts"]
1B["muted.ts"]
1C["natural.ts"]
1D["toner.ts"]
22["types.ts"]
end
1Y["index.ts"]
21["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1W
4-->5
7-->5
7-->8
8-->5
A-->B
A-->C
D-->F
D-->O
D-->11
D-->12
D-->13
D-->1S
D-->1V
D-->18
F-->G
F-->H
F-->I
F-->M
F-->L
H-->G
H-->I
H-->L
H-->K
I-->G
I-->H
I-->J
I-->L
I-->K
J-->I
J-->K
L-->G
L-->H
L-->I
L-->K
M-->G
O-->P
O-->Q
O-->R
O-->W
O-->X
O-->Y
O-->Z
O-->10
P-->5
Q-->P
R-->U
U-->V
V-->F
X-->V
10-->P
12-->5
13-->14
13-->1Q
13-->15
13-->1R
14-->15
15-->16
15-->1E
15-->1F
15-->1G
15-->1H
15-->1I
15-->1J
15-->1K
15-->1L
15-->1M
15-->8
15-->1N
15-->1O
15-->1P
15-->7
16-->18
18-->19
18-->1A
18-->1B
18-->1C
18-->1D
19-->F
1A-->F
1B-->F
1C-->F
1D-->F
1G-->1E
1G-->1F
1Q-->15
1R-->X
1R-->14
1R-->15
1S-->1T
1S-->1U
1S-->U
1T-->F
1T-->13
1U-->U
1V-->13
1V-->1T
1V-->U
1W-->O
1W-->11
1W-->12
1W-->13
1W-->1S
1W-->D
1X-->2
1X-->D
1X-->1W
1Y-->1X
1Y-->F
1Y-->1Z
1Y-->20
1Y-->13
1Y-->A
1Y-->21
1Z-->4
20-->4
20-->12
21-->1X

class 0,1,3,6,9,E,N,S,T,17 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
