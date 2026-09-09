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
1X["satellite.ts"]
1Y["index.ts"]
end
subgraph 3["lib"]
4["loadTileSource.ts"]
5["utils.ts"]
12["styleMeta.ts"]
13["tileSource.ts"]
20["fetchTileJSON.ts"]
21["inlineSources.ts"]
end
subgraph 6["options"]
7["urls.ts"]
8["sprite.ts"]
14["index.ts"]
15["osm-overlay.ts"]
16["parts.ts"]
17["colors.ts"]
1F["features-hillshade.ts"]
1G["features-terrain.ts"]
1H["features.ts"]
1I["layer-groups.ts"]
1J["layout.ts"]
1K["projection.ts"]
1L["recolor.ts"]
1M["satellite-raster.ts"]
1N["sky.ts"]
1O["sun.ts"]
1P["text.ts"]
1Q["theme.ts"]
1R["osm.ts"]
1S["satellite.ts"]
end
subgraph 9["types"]
A["index.ts"]
B["tilejson.ts"]
C["vector_layer.ts"]
24["maplibre.ts"]
end
subgraph E["color"]
F["index.ts"]
G["parse.ts"]
H["abstract.ts"]
I["hsl.ts"]
J["hsv.ts"]
K["random.ts"]
L["utils.ts"]
M["rgb.ts"]
N["recolor.ts"]
end
subgraph O["features"]
P["index.ts"]
Q["elevation-source.ts"]
R["hillshade.ts"]
S["landcover.ts"]
X["projection.ts"]
Y["satellite-overlay.ts"]
Z["sky.ts"]
10["sun.ts"]
11["terrain.ts"]
end
subgraph T["shortbread"]
subgraph U["layers"]
V["* (13 files)"]
end
W["build.ts"]
1T["index.ts"]
1U["context.ts"]
1V["groups.ts"]
1W["layer-groups-map.ts"]
end
subgraph 18["themes"]
19["index.ts"]
1A["colorful.ts"]
1B["gray.ts"]
1C["muted.ts"]
1D["natural.ts"]
1E["toner.ts"]
23["types.ts"]
end
1Z["index.ts"]
22["variants.ts"]
end
2-->4
2-->5
2-->7
2-->A
2-->D
2-->1X
4-->5
7-->5
7-->8
8-->5
A-->B
A-->C
D-->F
D-->P
D-->12
D-->13
D-->14
D-->1T
D-->1W
D-->19
F-->G
F-->N
G-->H
G-->I
G-->J
G-->M
I-->H
I-->J
I-->M
I-->L
J-->H
J-->I
J-->K
J-->M
J-->L
K-->J
K-->L
M-->H
M-->I
M-->J
M-->L
N-->G
P-->Q
P-->R
P-->S
P-->X
P-->Y
P-->Z
P-->10
P-->11
Q-->5
R-->Q
S-->V
V-->W
W-->F
Y-->W
11-->Q
13-->5
14-->15
14-->1R
14-->16
14-->1S
15-->16
16-->17
16-->1F
16-->1G
16-->1H
16-->1I
16-->1J
16-->1K
16-->1L
16-->1M
16-->1N
16-->8
16-->1O
16-->1P
16-->1Q
16-->7
17-->19
19-->1A
19-->1B
19-->1C
19-->1D
19-->1E
1A-->F
1B-->F
1C-->F
1D-->F
1E-->F
1H-->1F
1H-->1G
1R-->16
1S-->Y
1S-->15
1S-->16
1T-->1U
1T-->1V
1T-->V
1U-->F
1U-->14
1V-->V
1W-->14
1W-->1U
1W-->V
1X-->P
1X-->12
1X-->13
1X-->14
1X-->1T
1X-->D
1Y-->2
1Y-->D
1Y-->1X
1Z-->1Y
1Z-->F
1Z-->20
1Z-->21
1Z-->14
1Z-->A
1Z-->22
20-->4
21-->4
21-->13
22-->1Y

class 0,1,3,6,9,E,O,T,U,18 subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
