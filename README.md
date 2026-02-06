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
| **shadow**    | <img width="384" src="https://versatiles.org/versatiles-style/shadow.png" alt="shadow style" />       |

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
5["random.ts"]
6["utils.ts"]
7["rgb.ts"]
8["index.ts"]
end
subgraph 9["guess_style"]
A["guess_style.ts"]
10["index.ts"]
end
subgraph B["lib"]
C["utils.ts"]
end
subgraph D["styles"]
E["index.ts"]
F["colorful.ts"]
Q["eclipse.ts"]
R["empty.ts"]
S["graybeard.ts"]
T["neutrino.ts"]
U["satellite.ts"]
V["shadow.ts"]
end
subgraph G["style_builder"]
H["style_builder.ts"]
M["decorator.ts"]
O["recolor.ts"]
P["types.ts"]
end
subgraph I["shortbread"]
J["index.ts"]
K["layers.ts"]
L["template.ts"]
N["properties.ts"]
end
subgraph W["types"]
X["index.ts"]
Y["tilejson.ts"]
Z["vector_layer.ts"]
12["maplibre.ts"]
end
11["index.ts"]
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
8-->7
A-->5
A-->C
A-->E
A-->X
A-->Y
C-->8
E-->F
E-->Q
E-->R
E-->S
E-->T
E-->U
E-->V
F-->H
H-->8
H-->C
H-->J
H-->M
H-->O
H-->P
J-->K
J-->L
M-->8
M-->C
M-->N
O-->8
Q-->F
R-->F
S-->F
T-->F
U-->S
V-->F
X-->Y
X-->Z
10-->A
11-->8
11-->10
11-->E

class 0,1,9,B,D,G,I,W subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
