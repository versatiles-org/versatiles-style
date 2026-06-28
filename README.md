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
subgraph 1["color"]
2["abstract.ts"]
3["hsl.ts"]
4["hsv.ts"]
5["random.ts"]
6["utils.ts"]
7["rgb.ts"]
8["index.ts"]
9["recolor.ts"]
end
subgraph A["guess_style"]
B["guess_style.ts"]
10["index.ts"]
end
subgraph C["lib"]
D["utils.ts"]
G["elevation.ts"]
end
subgraph E["styles"]
F["index.ts"]
H["colorful.ts"]
T["eclipse.ts"]
U["empty.ts"]
V["graybeard.ts"]
W["neutrino.ts"]
X["satellite.ts"]
Y["shadow.ts"]
Z["variants.ts"]
end
subgraph I["style_builder"]
J["style_builder.ts"]
P["decorator.ts"]
R["recolor.ts"]
S["types.ts"]
end
subgraph K["shortbread"]
L["index.ts"]
M["groups.ts"]
N["layers.ts"]
O["template.ts"]
Q["properties.ts"]
end
11["index.ts"]
subgraph 12["themes"]
13["colorful.ts"]
14["gray.ts"]
15["index.ts"]
16["muted.ts"]
17["natural.ts"]
18["rules.ts"]
19["toner.ts"]
1A["types.ts"]
end
subgraph 1B["types"]
1C["colors.ts"]
1D["index.ts"]
1E["tilejson.ts"]
1F["vector_layer.ts"]
1G["layer-groups.ts"]
1H["maplibre.ts"]
1I["options.ts"]
1J["resolved.ts"]
end
end
3-->2
3-->4
3-->7
3-->6
4-->2
4-->3
4-->5
4-->7
4-->6
5-->4
5-->6
7-->2
7-->3
7-->4
7-->6
8-->2
8-->3
8-->4
8-->9
8-->7
9-->2
B-->5
B-->D
B-->F
D-->8
F-->G
F-->H
F-->T
F-->U
F-->V
F-->W
F-->X
F-->Y
F-->Z
G-->D
H-->J
J-->8
J-->D
J-->L
J-->P
J-->R
J-->S
L-->M
L-->N
L-->O
M-->N
O-->D
P-->8
P-->D
P-->Q
R-->8
T-->H
U-->H
V-->H
W-->H
X-->G
X-->D
X-->V
Y-->H
Z-->F
Z-->X
10-->B
11-->8
11-->10
11-->F
15-->13
15-->14
15-->16
15-->17
15-->18
15-->19
18-->8
1D-->1C
1D-->1E
1D-->1F

class 0,1,A,C,E,I,K,12,1B subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
