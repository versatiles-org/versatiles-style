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
subgraph A["features"]
B["buildings.ts"]
C["elevation-source.ts"]
D["hillshade.ts"]
E["index.ts"]
F["landcover.ts"]
G["terrain.ts"]
end
subgraph H["guess_style"]
I["guess_style.ts"]
17["index.ts"]
end
subgraph J["lib"]
K["utils.ts"]
N["elevation.ts"]
end
subgraph L["styles"]
M["index.ts"]
O["colorful.ts"]
10["eclipse.ts"]
11["empty.ts"]
12["graybeard.ts"]
13["neutrino.ts"]
14["satellite.ts"]
15["shadow.ts"]
16["variants.ts"]
end
subgraph P["style_builder"]
Q["style_builder.ts"]
W["decorator.ts"]
Y["recolor.ts"]
Z["types.ts"]
end
subgraph R["shortbread"]
S["index.ts"]
T["groups.ts"]
U["layers.ts"]
V["template.ts"]
X["properties.ts"]
end
18["index.ts"]
subgraph 19["resolve"]
1A["index.ts"]
1B["isDarkMode.ts"]
1C["resolveOsmOptions.ts"]
1Q["resolveSatelliteOptions.ts"]
end
subgraph 1D["themes"]
1E["index.ts"]
1F["colorful.ts"]
1G["gray.ts"]
1H["muted.ts"]
1I["natural.ts"]
1J["rules.ts"]
1K["toner.ts"]
1R["types.ts"]
end
subgraph 1L["types"]
1M["index.ts"]
1N["colors.ts"]
1O["tilejson.ts"]
1P["vector_layer.ts"]
1S["layer-groups.ts"]
1T["maplibre.ts"]
1U["options.ts"]
1V["resolved.ts"]
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
D-->C
E-->B
E-->C
E-->D
E-->F
E-->G
G-->C
I-->5
I-->K
I-->M
K-->8
M-->N
M-->O
M-->10
M-->11
M-->12
M-->13
M-->14
M-->15
M-->16
N-->K
O-->Q
Q-->8
Q-->K
Q-->S
Q-->W
Q-->Y
Q-->Z
S-->T
S-->U
S-->V
T-->U
V-->K
W-->8
W-->K
W-->X
Y-->8
10-->O
11-->O
12-->O
13-->O
14-->N
14-->K
14-->12
15-->O
16-->M
16-->14
17-->I
18-->8
18-->17
18-->M
1A-->1B
1A-->1C
1A-->1Q
1C-->K
1C-->1E
1C-->1M
1C-->1B
1E-->1F
1E-->1G
1E-->1H
1E-->1I
1E-->1J
1E-->1K
1J-->8
1M-->1N
1M-->1O
1M-->1P
1Q-->K
1Q-->1C

class 0,1,A,H,J,L,P,R,19,1D,1L subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
