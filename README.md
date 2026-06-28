[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Style

**VersaTiles Style** generates styles and sprites for MapLibre.

---

## Styles Overview

| Style Name    | Preview                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| **colorful**  | <img width="384" src="https://versatiles.org/versatiles-style/colorful.png" alt="colorful style" />   |
| **graybeard** | <img width="384" src="https://versatiles.org/versatiles-style/graybeard.png" alt="graybeard style" /> |
| **eclipse**   | <img width="384" src="https://versatiles.org/versatiles-style/eclipse.png" alt="eclipse style" />     |
| **neutrino**  | <img width="384" src="https://versatiles.org/versatiles-style/neutrino.png" alt="neutrino style" />   |
| **shadow**    | <img width="384" src="https://versatiles.org/versatiles-style/shadow.png" alt="shadow style" />       |
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
  const style = VersaTilesStyle.graybeard({
    language: 'de',
    colors: { label: '#222' },
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
import { colorful } from '@versatiles/style';
import { writeFileSync } from 'node:fs';

const style = colorful({
  language: 'en',
});
writeFileSync('style.json', JSON.stringify(style));
```

---

## Style Generation Methods

The library offers the following style generation methods:

- `colorful(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/colorful.html)
- `eclipse(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/eclipse.html)
- `graybeard(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/graybeard.html)
- `neutrino(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/neutrino.html)
- `shadow(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/shadow.html)
- `satellite(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/satellite.html)

**`options`**: An optional object to customize the styles. [Learn more](https://versatiles.org/versatiles-style/interfaces/StyleBuilderOptions.html)
`satellite` uses a different options type: [SatelliteStyleOptions](https://versatiles.org/versatiles-style/interfaces/SatelliteStyleOptions.html)

### Guess Style Method

```javascript
const style = guessStyle(options);
```

[Documentation](https://versatiles.org/versatiles-style/functions/guessStyle.html)

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

A local server will be available at <http://localhost:8080>. Use it to select a style, edit definitions in `src/styles/...`, and reload the page to view the changes.

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
2["index.ts"]
3["osm.ts"]
end
subgraph 4["color"]
5["recolor.ts"]
6["abstract.ts"]
K["index.ts"]
L["hsl.ts"]
M["hsv.ts"]
N["random.ts"]
O["utils.ts"]
P["rgb.ts"]
end
subgraph 7["features"]
8["index.ts"]
9["buildings.ts"]
A["elevation-source.ts"]
B["hillshade.ts"]
C["landcover.ts"]
D["terrain.ts"]
end
subgraph E["resolve"]
F["index.ts"]
G["isDarkMode.ts"]
H["resolveOsmOptions.ts"]
13["resolveSatelliteOptions.ts"]
end
subgraph I["lib"]
J["utils.ts"]
1H["elevation.ts"]
end
subgraph Q["themes"]
R["index.ts"]
S["colorful.ts"]
T["gray.ts"]
U["muted.ts"]
V["natural.ts"]
W["rules.ts"]
X["toner.ts"]
1U["types.ts"]
end
subgraph Y["types"]
Z["index.ts"]
10["colors.ts"]
11["tilejson.ts"]
12["vector_layer.ts"]
1V["layer-groups.ts"]
1W["maplibre.ts"]
1X["options.ts"]
1Y["resolved.ts"]
end
subgraph 14["shortbread"]
15["index.ts"]
16["groups.ts"]
17["layers.ts"]
18["template.ts"]
1B["properties.ts"]
end
subgraph 19["style_builder"]
1A["decorator.ts"]
1C["recolor.ts"]
1J["style_builder.ts"]
1K["types.ts"]
end
subgraph 1D["guess_style"]
1E["guess_style.ts"]
1S["index.ts"]
end
subgraph 1F["styles"]
1G["index.ts"]
1I["colorful.ts"]
1L["eclipse.ts"]
1M["empty.ts"]
1N["graybeard.ts"]
1O["neutrino.ts"]
1P["satellite.ts"]
1Q["shadow.ts"]
1R["variants.ts"]
end
1T["index.ts"]
end
2-->3
3-->5
3-->8
3-->F
3-->15
3-->1A
3-->1C
3-->R
3-->Z
5-->6
8-->9
8-->A
8-->B
8-->C
8-->D
B-->A
D-->A
F-->G
F-->H
F-->13
H-->J
H-->R
H-->Z
H-->G
J-->K
K-->6
K-->L
K-->M
K-->5
K-->P
L-->6
L-->M
L-->P
L-->O
M-->6
M-->L
M-->N
M-->P
M-->O
N-->M
N-->O
P-->6
P-->L
P-->M
P-->O
R-->S
R-->T
R-->U
R-->V
R-->W
R-->X
W-->K
Z-->10
Z-->11
Z-->12
13-->J
13-->H
15-->16
15-->17
15-->18
16-->17
18-->J
1A-->K
1A-->J
1A-->1B
1C-->K
1E-->N
1E-->J
1E-->1G
1G-->1H
1G-->1I
1G-->1L
1G-->1M
1G-->1N
1G-->1O
1G-->1P
1G-->1Q
1G-->1R
1H-->J
1I-->1J
1J-->K
1J-->J
1J-->15
1J-->1A
1J-->1C
1J-->1K
1L-->1I
1M-->1I
1N-->1I
1O-->1I
1P-->1H
1P-->J
1P-->1N
1Q-->1I
1R-->1G
1R-->1P
1S-->1E
1T-->K
1T-->1S
1T-->1G

class 0,1,4,7,E,I,Q,Y,14,19,1D,1F subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
