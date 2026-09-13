[![NPM version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![GitHub downloads](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)
[![Code coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Style

**VersaTiles Style** generates styles and sprites for MapLibre.

> **Upgrading from v5?** v6 is a breaking release: the palette builders (`colorful`, `shadow`, …) are
> replaced by `osm({ theme })`, options are grouped (`textScale` → `layout.scale.labels`), all 34 of
> the renamed colour keys moved under a group prefix, and both sprite sheets were renamed.
> Unknown option keys now throw, and the error names the v6 replacement.
>
> - **[Migration from v5](API_DESIGN.md#migration-from-v5)** — the full option, colour-key and type tables.
> - **[Migrating sprite ids from v5](SPRITES.md#migrating-sprite-ids-from-v5)** — `basics` → `base` and `markers` → `extras`/`icons`.
> - **[CHANGELOG](CHANGELOG.md)** — every breaking change in 6.0.0.

---

## Styles Overview

The `osm()` function renders OpenStreetMap vector tiles using one of five built-in color palettes,
each available as a light theme and a dark one (`colorful-dark`, …). `satellite()` renders raster/satellite tiles with an optional
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
- **[Sprite overview](https://versatiles.org/versatiles-style/sprites.html):** every icon in all three sheets, with its sprite ID, title and aliases.
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
      theme: 'colorful-dark',
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
  - `theme`: a palette name (`'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`), or its dark theme with a `-dark` suffix (`'colorful-dark'`, …).
  - `text`, `colors`, `recolor`, `layers`, `features`, `urls`: see [OsmOptions](https://versatiles.org/versatiles-style/interfaces/OsmOptions.html).
- `satellite(options)` - raster/satellite style with an optional OSM overlay. [Documentation](https://versatiles.org/versatiles-style/functions/satellite.html) — see [SatelliteOptions](https://versatiles.org/versatiles-style/interfaces/SatelliteOptions.html).
- `guessStyle(source)` - inspect a tileset, given as a TileJSON URL or object, and return the most appropriate style. [Documentation](https://versatiles.org/versatiles-style/functions/guessStyle.html)

```javascript
import { guessStyle } from '@versatiles/style';
const style = await guessStyle(tileJSON); // or the URL of a TileJSON document
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
1E["osm.ts"]
2J["satellite.ts"]
2K["index.ts"]
2L["schema-builder.ts"]
end
subgraph 4["lib"]
5["index.ts"]
6["fetchTileJSON.ts"]
I["loadTileSource.ts"]
J["utils.ts"]
K["inlineSources.ts"]
L["tileSource.ts"]
M["styleMeta.ts"]
19["opacity.ts"]
1Y["languages.ts"]
2O["schema-audit.ts"]
end
subgraph 7["options"]
8["keys.ts"]
9["v5-hints.ts"]
A["colors.ts"]
N["index.ts"]
O["omt.ts"]
P["parts.ts"]
Q["features-hillshade.ts"]
R["features-terrain.ts"]
S["features.ts"]
T["layer-groups.ts"]
U["layout.ts"]
V["projection.ts"]
W["recolor.ts"]
X["satellite-raster.ts"]
Y["sky.ts"]
Z["sprite.ts"]
10["sun.ts"]
11["text.ts"]
12["theme.ts"]
13["urls.ts"]
14["osm-overlay.ts"]
15["osm.ts"]
16["satellite.ts"]
1Z["minimize.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
39["types.ts"]
end
subgraph 17["features"]
18["satellite-overlay.ts"]
1P["index.ts"]
1Q["elevation-source.ts"]
1R["hillshade.ts"]
1S["landcover.ts"]
1T["layout.ts"]
1U["projection.ts"]
1V["sky.ts"]
1W["sun.ts"]
1X["terrain.ts"]
end
subgraph 1A["types"]
1B["index.ts"]
1C["tilejson.ts"]
1D["vector_layer.ts"]
3A["maplibre.ts"]
end
subgraph 1F["color"]
1G["index.ts"]
1H["parse.ts"]
1I["abstract.ts"]
1J["hsl.ts"]
1K["hsv.ts"]
1L["random.ts"]
1M["utils.ts"]
1N["rgb.ts"]
1O["recolor.ts"]
end
subgraph 20["shortbread"]
21["index.ts"]
22["context.ts"]
25["groups.ts"]
subgraph 26["layers"]
27["* (13 files)"]
end
2B["schema.ts"]
2I["layer-groups-map.ts"]
end
subgraph 23["dsl"]
24["context.ts"]
28["assemble.ts"]
29["build.ts"]
2A["index.ts"]
end
subgraph 2C["cartography"]
2D["boundaries.ts"]
2E["buildings.ts"]
2F["labels.ts"]
2G["roads.ts"]
2H["transitstops.ts"]
end
2M["index.ts"]
2N["variants.ts"]
subgraph 2P["omt"]
2Q["api.ts"]
2R["context.ts"]
2S["schema.ts"]
2T["layer-groups-map.ts"]
subgraph 2U["layers"]
2V["index.ts"]
2W["airport.ts"]
2X["background.ts"]
2Y["boundaries.ts"]
2Z["buildings.ts"]
30["labels.ts"]
31["landcover.ts"]
32["markings.ts"]
33["pois.ts"]
34["roads.ts"]
35["sites.ts"]
36["transitstops.ts"]
37["water.ts"]
end
38["index.ts"]
end
end
3-->5
3-->N
3-->8
3-->1B
3-->1E
3-->2J
5-->6
5-->K
5-->I
5-->M
5-->L
5-->J
6-->8
6-->I
8-->9
9-->A
A-->C
A-->8
C-->D
C-->E
C-->F
C-->G
C-->H
I-->J
K-->8
K-->I
K-->L
L-->J
N-->O
N-->14
N-->15
N-->P
N-->16
O-->8
O-->P
P-->A
P-->Q
P-->R
P-->S
P-->T
P-->U
P-->V
P-->W
P-->X
P-->Y
P-->Z
P-->10
P-->11
P-->12
P-->13
Q-->8
R-->8
S-->Q
S-->R
S-->8
T-->8
U-->8
W-->8
X-->8
Y-->8
Z-->5
10-->8
11-->8
12-->C
13-->5
13-->8
13-->Z
14-->8
14-->P
15-->8
15-->P
16-->18
16-->8
16-->14
16-->P
18-->19
1B-->1C
1B-->1D
1E-->1G
1E-->1P
1E-->5
1E-->1Y
1E-->N
1E-->1Z
1E-->21
1E-->2I
1E-->27
1E-->2B
1E-->C
1E-->2
1G-->1H
1G-->1O
1H-->1I
1H-->1J
1H-->1K
1H-->1N
1J-->1I
1J-->1K
1J-->1N
1J-->1M
1K-->1I
1K-->1J
1K-->1L
1K-->1N
1K-->1M
1L-->1K
1L-->1M
1N-->1I
1N-->1J
1N-->1K
1N-->1M
1O-->1H
1P-->1Q
1P-->1R
1P-->1S
1P-->1T
1P-->1U
1P-->18
1P-->1V
1P-->1W
1P-->1X
1Q-->5
1R-->1Q
1X-->1Q
1Z-->O
1Z-->15
1Z-->16
1Z-->12
21-->22
21-->25
21-->27
22-->24
24-->1G
24-->N
24-->C
25-->27
27-->28
27-->2A
27-->2B
27-->2D
27-->2E
27-->2F
27-->2G
27-->2H
28-->29
29-->1G
29-->19
2A-->28
2A-->29
2A-->24
2D-->2A
2E-->2A
2F-->2A
2G-->2A
2H-->2A
2I-->N
2I-->22
2I-->27
2J-->1P
2J-->5
2J-->N
2J-->1Z
2J-->21
2J-->2
2J-->1E
2K-->3
2K-->1E
2K-->2J
2M-->2K
2M-->1G
2M-->5
2M-->N
2M-->1B
2M-->2N
2N-->2K
2N-->N
2Q-->2
2Q-->1G
2Q-->1P
2Q-->5
2Q-->1Y
2Q-->N
2Q-->1Z
2Q-->C
2Q-->2R
2Q-->2T
2Q-->2V
2Q-->2S
2R-->24
2R-->2S
2T-->N
2T-->2R
2T-->2V
2V-->28
2V-->2A
2V-->2S
2V-->2W
2V-->2X
2V-->2Y
2V-->2Z
2V-->30
2V-->31
2V-->32
2V-->33
2V-->34
2V-->35
2V-->36
2V-->37
2W-->2A
2X-->2A
2Y-->2D
2Z-->2E
30-->2F
30-->2A
31-->2A
32-->2A
33-->2A
34-->2G
35-->2A
36-->2H
37-->2A
38-->2Q
38-->2S

class 0,1,4,7,B,17,1A,1F,20,26,23,2C,2P,2U subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
