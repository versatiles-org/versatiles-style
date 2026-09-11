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
1M["osm.ts"]
23["satellite.ts"]
24["index.ts"]
end
subgraph 4["lib"]
5["index.ts"]
6["fetchTileJSON.ts"]
7["loadTileSource.ts"]
8["utils.ts"]
9["inlineSources.ts"]
A["tileSource.ts"]
B["styleMeta.ts"]
end
subgraph C["options"]
D["index.ts"]
E["osm-overlay.ts"]
F["parts.ts"]
G["colors.ts"]
Y["features-hillshade.ts"]
Z["features-terrain.ts"]
10["features.ts"]
11["layer-groups.ts"]
12["layout.ts"]
13["projection.ts"]
14["recolor.ts"]
15["satellite-raster.ts"]
16["sky.ts"]
17["sprite.ts"]
18["sun.ts"]
19["text.ts"]
1A["theme.ts"]
1B["urls.ts"]
1C["osm.ts"]
1D["satellite.ts"]
1X["minimize.ts"]
end
subgraph H["themes"]
I["index.ts"]
J["colorful.ts"]
U["gray.ts"]
V["muted.ts"]
W["natural.ts"]
X["toner.ts"]
27["types.ts"]
end
subgraph K["color"]
L["index.ts"]
M["parse.ts"]
N["abstract.ts"]
O["hsl.ts"]
P["hsv.ts"]
Q["random.ts"]
R["utils.ts"]
S["rgb.ts"]
T["recolor.ts"]
end
subgraph 1E["features"]
1F["satellite-overlay.ts"]
1N["index.ts"]
1O["elevation-source.ts"]
1P["hillshade.ts"]
1Q["landcover.ts"]
1T["projection.ts"]
1U["sky.ts"]
1V["sun.ts"]
1W["terrain.ts"]
end
subgraph 1G["shortbread"]
1H["build.ts"]
subgraph 1R["layers"]
1S["* (13 files)"]
end
1Y["index.ts"]
1Z["context.ts"]
20["groups.ts"]
21["schema.ts"]
22["layer-groups-map.ts"]
end
subgraph 1I["types"]
1J["index.ts"]
1K["tilejson.ts"]
1L["vector_layer.ts"]
28["maplibre.ts"]
end
25["index.ts"]
26["variants.ts"]
end
3-->5
3-->D
3-->1J
3-->1M
3-->23
5-->6
5-->9
5-->7
5-->B
5-->A
5-->8
6-->7
7-->8
9-->7
9-->A
A-->8
D-->E
D-->1C
D-->F
D-->1D
E-->F
F-->G
F-->Y
F-->Z
F-->10
F-->11
F-->12
F-->13
F-->14
F-->15
F-->16
F-->17
F-->18
F-->19
F-->1A
F-->1B
G-->I
I-->J
I-->U
I-->V
I-->W
I-->X
J-->L
L-->M
L-->T
M-->N
M-->O
M-->P
M-->S
O-->N
O-->P
O-->S
O-->R
P-->N
P-->O
P-->Q
P-->S
P-->R
Q-->P
Q-->R
S-->N
S-->O
S-->P
S-->R
T-->M
U-->L
V-->L
W-->L
X-->L
10-->Y
10-->Z
17-->5
1A-->I
1B-->5
1B-->17
1C-->F
1D-->1F
1D-->E
1D-->F
1F-->1H
1H-->L
1J-->1K
1J-->1L
1M-->L
1M-->1N
1M-->5
1M-->D
1M-->1X
1M-->1Y
1M-->22
1M-->1S
1M-->I
1M-->2
1N-->1O
1N-->1P
1N-->1Q
1N-->1T
1N-->1F
1N-->1U
1N-->1V
1N-->1W
1O-->5
1P-->1O
1Q-->1S
1S-->1H
1S-->21
1U-->16
1W-->1O
1X-->1C
1X-->1D
1X-->1A
1Y-->1Z
1Y-->20
1Y-->1S
1Z-->L
1Z-->D
20-->1S
22-->D
22-->1Z
22-->1S
23-->1N
23-->5
23-->D
23-->1X
23-->1Y
23-->2
23-->1M
24-->3
24-->1M
24-->23
25-->24
25-->L
25-->5
25-->D
25-->1J
25-->26
26-->24

class 0,1,4,C,H,K,1E,1G,1R,1I subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
