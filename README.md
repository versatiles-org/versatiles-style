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
1D["osm.ts"]
2I["satellite.ts"]
2J["index.ts"]
2K["schema-builder.ts"]
end
subgraph 4["lib"]
5["index.ts"]
6["fetchTileJSON.ts"]
I["loadTileSource.ts"]
J["utils.ts"]
K["inlineSources.ts"]
L["tileSource.ts"]
M["styleMeta.ts"]
18["opacity.ts"]
1X["languages.ts"]
2N["schema-audit.ts"]
end
subgraph 7["options"]
8["keys.ts"]
9["v5-hints.ts"]
A["colors.ts"]
N["index.ts"]
O["osm-overlay.ts"]
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
14["osm.ts"]
15["satellite.ts"]
1Y["minimize.ts"]
end
subgraph B["themes"]
C["index.ts"]
D["colorful.ts"]
E["gray.ts"]
F["muted.ts"]
G["natural.ts"]
H["toner.ts"]
3U["types.ts"]
end
subgraph 16["features"]
17["satellite-overlay.ts"]
1O["index.ts"]
1P["elevation-source.ts"]
1Q["hillshade.ts"]
1R["landcover.ts"]
1S["layout.ts"]
1T["projection.ts"]
1U["sky.ts"]
1V["sun.ts"]
1W["terrain.ts"]
end
subgraph 19["types"]
1A["index.ts"]
1B["tilejson.ts"]
1C["vector_layer.ts"]
3V["maplibre.ts"]
end
subgraph 1E["color"]
1F["index.ts"]
1G["parse.ts"]
1H["abstract.ts"]
1I["hsl.ts"]
1J["hsv.ts"]
1K["random.ts"]
1L["utils.ts"]
1M["rgb.ts"]
1N["recolor.ts"]
end
subgraph 1Z["shortbread"]
20["index.ts"]
21["context.ts"]
24["groups.ts"]
subgraph 25["layers"]
26["* (13 files)"]
end
2A["schema.ts"]
2H["layer-groups-map.ts"]
end
subgraph 22["dsl"]
23["context.ts"]
27["assemble.ts"]
28["build.ts"]
29["index.ts"]
end
subgraph 2B["cartography"]
2C["boundaries.ts"]
2D["buildings.ts"]
2E["labels.ts"]
2F["roads.ts"]
2G["transitstops.ts"]
end
2L["index.ts"]
2M["variants.ts"]
subgraph 2O["omt"]
2P["api.ts"]
2Q["context.ts"]
2R["schema.ts"]
2S["layer-groups-map.ts"]
subgraph 2T["layers"]
2U["index.ts"]
2V["airport.ts"]
2W["background.ts"]
2X["boundaries.ts"]
2Y["buildings.ts"]
2Z["labels.ts"]
30["landcover.ts"]
31["markings.ts"]
32["pois.ts"]
33["roads.ts"]
34["sites.ts"]
35["transitstops.ts"]
36["water.ts"]
end
37["options.ts"]
38["index.ts"]
end
subgraph 39["protomaps"]
3A["api.ts"]
3B["context.ts"]
3C["schema.ts"]
3D["layer-groups-map.ts"]
subgraph 3E["layers"]
3F["index.ts"]
3G["airport.ts"]
3H["background.ts"]
3I["boundaries.ts"]
3J["buildings.ts"]
3K["labels.ts"]
3L["landcover.ts"]
3M["markings.ts"]
3N["pois.ts"]
3O["roads.ts"]
3P["sites.ts"]
3Q["transitstops.ts"]
3R["water.ts"]
end
3S["options.ts"]
3T["index.ts"]
end
end
3-->5
3-->N
3-->8
3-->1A
3-->1D
3-->2I
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
N-->P
N-->15
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
15-->17
15-->8
15-->O
15-->P
17-->18
1A-->1B
1A-->1C
1D-->1F
1D-->1O
1D-->5
1D-->1X
1D-->N
1D-->1Y
1D-->20
1D-->2H
1D-->26
1D-->2A
1D-->C
1D-->2
1F-->1G
1F-->1N
1G-->1H
1G-->1I
1G-->1J
1G-->1M
1I-->1H
1I-->1J
1I-->1M
1I-->1L
1J-->1H
1J-->1I
1J-->1K
1J-->1M
1J-->1L
1K-->1J
1K-->1L
1M-->1H
1M-->1I
1M-->1J
1M-->1L
1N-->1G
1O-->1P
1O-->1Q
1O-->1R
1O-->1S
1O-->1T
1O-->17
1O-->1U
1O-->1V
1O-->1W
1P-->5
1Q-->1P
1W-->1P
1Y-->14
1Y-->15
1Y-->12
20-->21
20-->24
20-->26
21-->23
23-->1F
23-->N
23-->C
24-->26
26-->27
26-->29
26-->2A
26-->2C
26-->2D
26-->2E
26-->2F
26-->2G
27-->28
28-->1F
28-->18
29-->27
29-->28
29-->23
2C-->29
2D-->29
2E-->29
2F-->29
2G-->29
2H-->N
2H-->21
2H-->26
2I-->1O
2I-->5
2I-->N
2I-->1Y
2I-->20
2I-->2
2I-->1D
2J-->3
2J-->1D
2J-->2I
2L-->2J
2L-->1F
2L-->5
2L-->N
2L-->1A
2L-->2M
2M-->2J
2M-->N
2P-->2
2P-->1F
2P-->1O
2P-->5
2P-->1X
2P-->N
2P-->C
2P-->2Q
2P-->2S
2P-->2U
2P-->37
2P-->2R
2Q-->23
2Q-->2R
2S-->2Q
2S-->2U
2S-->37
2U-->27
2U-->29
2U-->2R
2U-->2V
2U-->2W
2U-->2X
2U-->2Y
2U-->2Z
2U-->30
2U-->31
2U-->32
2U-->33
2U-->34
2U-->35
2U-->36
2V-->29
2W-->29
2X-->2C
2Y-->2D
2Z-->2E
2Z-->29
30-->29
31-->29
32-->29
33-->2F
34-->29
35-->2G
36-->29
37-->J
37-->N
37-->8
37-->1Y
38-->2P
38-->2R
3A-->2
3A-->1F
3A-->1O
3A-->5
3A-->1X
3A-->N
3A-->C
3A-->3B
3A-->3D
3A-->3F
3A-->3S
3A-->3C
3B-->23
3B-->3C
3D-->3B
3D-->3F
3D-->3S
3F-->27
3F-->29
3F-->3C
3F-->3G
3F-->3H
3F-->3I
3F-->3J
3F-->3K
3F-->3L
3F-->3M
3F-->3N
3F-->3O
3F-->3P
3F-->3Q
3F-->3R
3G-->29
3H-->29
3I-->2C
3J-->2D
3K-->2E
3K-->29
3L-->29
3M-->29
3N-->29
3O-->2F
3P-->29
3Q-->2G
3R-->29
3S-->J
3S-->N
3S-->8
3S-->1Y
3T-->3A
3T-->3C

class 0,1,4,7,B,16,19,1E,1Z,25,22,2B,2O,2T,39,3E subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
