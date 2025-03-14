[![NPM Version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)

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
    language: "de",
    colors: { label: "#222" },
    recolor: { gamma: 0.5 },
  });

  const map = new maplibregl.Map({
    container: "map",
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
import { colorful } from "@versatiles/style";
import { writeFileSync } from "node:fs";

const style = colorful({
  language: "en",
});
writeFileSync("style.json", JSON.stringify(style));
```

---

## Style Generation Methods

The library offers the following style generation methods:

- `colorful(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/colorful.html)
- `eclipse(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/eclipse.html)
- `graybeard(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/graybeard.html)
- `neutrino(options)` - [Documentation](https://versatiles.org/versatiles-style/functions/neutrino.html)

**`options`**: An optional object to customize the styles. [Learn more](https://versatiles.org/versatiles-style/interfaces/StyleBuilderOptions.html)

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
5["rgb.ts"]
6["utils.ts"]
7["index.ts"]
8["random.ts"]
end
subgraph 9["guess_style"]
A["guess_style.ts"]
X["index.ts"]
end
subgraph B["lib"]
C["utils.ts"]
end
subgraph D["styles"]
E["index.ts"]
F["colorful.ts"]
P["eclipse.ts"]
Q["empty.ts"]
R["graybeard.ts"]
S["neutrino.ts"]
end
subgraph G["style_builder"]
H["style_builder.ts"]
M["decorator.ts"]
O["recolor.ts"]
Z["types.ts"]
end
subgraph I["shortbread"]
J["index.ts"]
K["layers.ts"]
L["template.ts"]
N["properties.ts"]
end
subgraph T["types"]
U["index.ts"]
V["tilejson.ts"]
W["vector_layer.ts"]
10["maplibre.ts"]
end
Y["index.ts"]
end
3-->2
3-->4
3-->5
3-->6
4-->2
4-->3
4-->5
4-->6
5-->2
5-->3
5-->4
5-->6
7-->2
7-->3
7-->4
7-->8
7-->5
8-->4
8-->6
A-->7
A-->C
A-->E
A-->U
A-->V
C-->7
E-->F
E-->P
E-->Q
E-->R
E-->S
F-->H
H-->7
H-->C
H-->J
H-->M
H-->O
J-->K
J-->L
M-->7
M-->C
M-->N
O-->7
P-->F
Q-->F
R-->F
S-->F
U-->V
U-->W
X-->A
Y-->7
Y-->X
Y-->E

class 0,1,9,B,D,G,I,T subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
