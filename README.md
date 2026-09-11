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
- **[Sprite overview](https://versatiles.org/versatiles-style/sprites.html):** every icon in both sheets, with its sprite ID, title and aliases.
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
  (async () => {
    const style = VersaTilesStyle.osm({
      theme: { palette: 'colorful', darkMode: true },
      text: { language: 'de' },
      recolor: { gamma: 0.5 },
    });

    const map = new maplibregl.Map({
      container: 'map',
      style: await VersaTilesStyle.inlineSources(style),
    });
  })();
</script>
```

> **`inlineSources` is required, not optional.** `osm()` and `satellite()` are synchronous and do no
> I/O: they leave each source as a `{ type, url }` reference to a TileJSON and let MapLibre fetch it.
> That works only if the TileJSON lists absolute tile URLs — and the VersaTiles ones list **relative**
> templates (`/tiles/osm/{z}/{x}/{y}`), which MapLibre does not resolve. Handing such a style straight
> to `new maplibregl.Map()` fails with
> `Request constructor: /tiles/osm/2/2/2 is not a valid URL` and no tiles appear.
>
> `inlineSources` fetches the TileJSON and folds it in, so the tile URLs come out absolute and the
> attribution, bounds and maxzoom it carries are preserved. That last part matters: the attribution
> is a licensing obligation.
>
> If your own tile server publishes absolute tile URLs, you can skip it and stay fully synchronous.

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
import { osm, inlineSources } from '@versatiles/style';
import { writeFileSync } from 'node:fs';

const style = osm({
  theme: 'colorful',
  text: { language: 'en' },
});
// resolves the TileJSON reference into absolute tile URLs — see the note above
writeFileSync('style.json', JSON.stringify(await inlineSources(style)));
```

A `style.json` written without `inlineSources` still carries a `url` reference, so whoever loads it
hits the same relative-tile problem. This is exactly what the published styles do — `build-styles.ts`
calls `inlineSources` before writing each one.

---

## Style Generation Methods

`osm()` and `satellite()` are **synchronous** and do no I/O; `guessStyle()` is **asynchronous**,
because it has to read the TileJSON before it can decide what to build. All three return a MapLibre
`StyleSpecification` — pass it through `inlineSources` before handing it to MapLibre, as above:

- `osm(options)` - OpenStreetMap vector style. [Documentation](https://versatiles.org/versatiles-style/functions/osm.html)
  - `theme`: a palette name (`'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`) or `{ palette, darkMode }`.
  - `text`, `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/interfaces/OsmOptions.html).
- `satellite(options)` - raster/satellite style with an optional OSM overlay. [Documentation](https://versatiles.org/versatiles-style/functions/satellite.html) — see [SatelliteOptions](https://versatiles.org/versatiles-style/interfaces/SatelliteOptions.html).
- `guessStyle(tileJSON)` - inspect a TileJSON and return the most appropriate style. [Documentation](https://versatiles.org/versatiles-style/functions/guessStyle.html)

```javascript
import { guessStyle } from '@versatiles/style';
const style = await guessStyle(tileJSON);
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

Define icon sets in the configuration file: [`scripts/config/sprites.ts`](./scripts/config/sprites.ts)

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
2["code.ts"]
3["guessStyle.ts"]
1O["osm.ts"]
25["satellite.ts"]
26["index.ts"]
end
subgraph 4["lib"]
5["index.ts"]
6["fetchTileJSON.ts"]
S["loadTileSource.ts"]
T["utils.ts"]
U["inlineSources.ts"]
V["tileSource.ts"]
W["styleMeta.ts"]
end
subgraph 7["options"]
8["keys.ts"]
9["v5-hints.ts"]
A["colors.ts"]
X["index.ts"]
Y["osm-overlay.ts"]
Z["parts.ts"]
10["features-hillshade.ts"]
11["features-terrain.ts"]
12["features.ts"]
13["layer-groups.ts"]
14["layout.ts"]
15["projection.ts"]
16["recolor.ts"]
17["satellite-raster.ts"]
18["sky.ts"]
19["sprite.ts"]
1A["sun.ts"]
1B["text.ts"]
1C["theme.ts"]
1D["urls.ts"]
1E["osm.ts"]
1F["satellite.ts"]
1Z["minimize.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
O["gray.ts"]
P["muted.ts"]
Q["natural.ts"]
R["toner.ts"]
29["types.ts"]
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
subgraph 1G["features"]
1H["satellite-overlay.ts"]
1P["index.ts"]
1Q["elevation-source.ts"]
1R["hillshade.ts"]
1S["landcover.ts"]
1V["projection.ts"]
1W["sky.ts"]
1X["sun.ts"]
1Y["terrain.ts"]
end
subgraph 1I["shortbread"]
1J["build.ts"]
subgraph 1T["layers"]
1U["* (13 files)"]
end
20["index.ts"]
21["context.ts"]
22["groups.ts"]
23["schema.ts"]
24["layer-groups-map.ts"]
end
subgraph 1K["types"]
1L["index.ts"]
1M["tilejson.ts"]
1N["vector_layer.ts"]
2A["maplibre.ts"]
end
27["index.ts"]
28["variants.ts"]
end
3-->5
3-->X
3-->8
3-->1L
3-->1O
3-->25
5-->6
5-->U
5-->S
5-->W
5-->V
5-->T
6-->8
6-->S
8-->9
9-->A
A-->C
A-->8
C-->D
C-->O
C-->P
C-->Q
C-->R
D-->F
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
O-->F
P-->F
Q-->F
R-->F
S-->T
U-->8
U-->S
U-->V
V-->T
X-->Y
X-->1E
X-->Z
X-->1F
Y-->8
Y-->Z
Z-->A
Z-->10
Z-->11
Z-->12
Z-->13
Z-->14
Z-->15
Z-->16
Z-->17
Z-->18
Z-->19
Z-->1A
Z-->1B
Z-->1C
Z-->1D
10-->8
11-->8
12-->10
12-->11
12-->8
13-->8
14-->8
16-->8
17-->8
18-->8
19-->5
1A-->8
1B-->8
1C-->C
1C-->8
1D-->5
1D-->8
1D-->19
1E-->8
1E-->Z
1F-->1H
1F-->8
1F-->Y
1F-->Z
1H-->1J
1J-->F
1L-->1M
1L-->1N
1O-->F
1O-->1P
1O-->5
1O-->X
1O-->1Z
1O-->20
1O-->24
1O-->1U
1O-->C
1O-->2
1P-->1Q
1P-->1R
1P-->1S
1P-->1V
1P-->1H
1P-->1W
1P-->1X
1P-->1Y
1Q-->5
1R-->1Q
1S-->1U
1U-->1J
1U-->23
1W-->18
1Y-->1Q
1Z-->1E
1Z-->1F
1Z-->1C
20-->21
20-->22
20-->1U
21-->F
21-->X
22-->1U
24-->X
24-->21
24-->1U
25-->1P
25-->5
25-->X
25-->1Z
25-->20
25-->2
25-->1O
26-->3
26-->1O
26-->25
27-->26
27-->F
27-->5
27-->X
27-->1L
27-->28
28-->26

class 0,1,4,7,B,E,1G,1I,1T,1K subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
