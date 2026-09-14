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

- `guessSchema(tileJSON)` - recognise a vector tileset's schema (`'shortbread' | 'openmaptiles' | 'protomaps'`) from its TileJSON object, synchronously and without I/O. It reads only `vector_layers`, and scores every schema so a caller can see why. [Documentation](https://versatiles.org/versatiles-style/functions/guessSchema.html)

```javascript
import { guessSchema } from '@versatiles/style';
const guess = guessSchema(tileJSON); // { type: 'vector', schema: 'openmaptiles', candidates: [...] }
```

- `guessOptions(style)` - from `@versatiles/style/migrate`: read a MapLibre style built for OpenMapTiles, Protomaps or Shortbread tiles, and return the `osm()` or `satellite()` options whose style looks most like it — for moving a map onto VersaTiles. `deriveOptions(style, tileJSONs?)` is its synchronous, I/O-free core.

```javascript
import { osm } from '@versatiles/style';
import { guessOptions } from '@versatiles/style/migrate';
const guess = await guessOptions('https://example.org/my-style/style.json');
if (guess.kind === 'osm') map.setStyle(osm(guess.options)); // guess.report says what was not carried over
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
3["guessSchema.ts"]
6["guessStyle.ts"]
1G["osm.ts"]
2N["satellite.ts"]
2O["index.ts"]
2P["schema-builder.ts"]
end
subgraph 4["lib"]
5["schema-signatures.ts"]
7["index.ts"]
8["fetchTileJSON.ts"]
K["loadTileSource.ts"]
L["utils.ts"]
M["inlineSources.ts"]
N["tileSource.ts"]
O["styleMeta.ts"]
1B["opacity.ts"]
20["languages.ts"]
2S["schema-audit.ts"]
end
subgraph 9["options"]
A["keys.ts"]
B["v5-hints.ts"]
C["colors.ts"]
P["index.ts"]
Q["osm-overlay.ts"]
R["parts.ts"]
S["features-hillshade.ts"]
T["features-terrain.ts"]
U["features.ts"]
V["fonts.ts"]
W["layer-groups.ts"]
X["layout.ts"]
Y["projection.ts"]
Z["recolor.ts"]
10["satellite-raster.ts"]
11["sky.ts"]
12["sprite.ts"]
13["sun.ts"]
14["text.ts"]
15["theme.ts"]
16["urls.ts"]
17["osm.ts"]
18["satellite.ts"]
21["minimize.ts"]
end
subgraph D["themes"]
E["index.ts"]
F["colorful.ts"]
G["gray.ts"]
H["muted.ts"]
I["natural.ts"]
J["toner.ts"]
47["types.ts"]
end
subgraph 19["features"]
1A["satellite-overlay.ts"]
1R["index.ts"]
1S["elevation-source.ts"]
1T["hillshade.ts"]
1U["landcover.ts"]
1V["layout.ts"]
1W["projection.ts"]
1X["sky.ts"]
1Y["sun.ts"]
1Z["terrain.ts"]
end
subgraph 1C["types"]
1D["index.ts"]
1E["tilejson.ts"]
1F["vector_layer.ts"]
48["maplibre.ts"]
end
subgraph 1H["color"]
1I["index.ts"]
1J["parse.ts"]
1K["abstract.ts"]
1L["hsl.ts"]
1M["hsv.ts"]
1N["random.ts"]
1O["utils.ts"]
1P["rgb.ts"]
1Q["recolor.ts"]
end
subgraph 22["shortbread"]
23["index.ts"]
24["context.ts"]
27["groups.ts"]
subgraph 28["layers"]
29["* (13 files)"]
end
2E["schema.ts"]
2L["layer-groups-map.ts"]
end
subgraph 25["dsl"]
26["context.ts"]
2A["assemble.ts"]
2B["build.ts"]
2C["fonts.ts"]
2D["index.ts"]
2M["group-maps.ts"]
end
subgraph 2F["cartography"]
2G["boundaries.ts"]
2H["buildings.ts"]
2I["labels.ts"]
2J["roads.ts"]
2K["transitstops.ts"]
end
2Q["index.ts"]
2R["variants.ts"]
subgraph 2T["migrate"]
2U["calibrate.ts"]
2V["evaluate.ts"]
2W["math.ts"]
2X["probes.ts"]
2Y["derive.ts"]
2Z["guess.ts"]
30["index.ts"]
end
subgraph 31["omt"]
32["api.ts"]
33["context.ts"]
34["schema.ts"]
35["layer-groups-map.ts"]
subgraph 36["layers"]
37["index.ts"]
38["airport.ts"]
39["background.ts"]
3A["boundaries.ts"]
3B["buildings.ts"]
3C["labels.ts"]
3D["landcover.ts"]
3E["markings.ts"]
3F["pois.ts"]
3G["roads.ts"]
3H["sites.ts"]
3I["transitstops.ts"]
3J["water.ts"]
end
3K["options.ts"]
3L["index.ts"]
end
subgraph 3M["protomaps"]
3N["api.ts"]
3O["context.ts"]
3P["schema.ts"]
3Q["layer-groups-map.ts"]
subgraph 3R["layers"]
3S["index.ts"]
3T["airport.ts"]
3U["background.ts"]
3V["boundaries.ts"]
3W["buildings.ts"]
3X["labels.ts"]
3Y["landcover.ts"]
3Z["markings.ts"]
40["pois.ts"]
41["roads.ts"]
42["sites.ts"]
43["transitstops.ts"]
44["water.ts"]
end
45["options.ts"]
46["index.ts"]
end
end
3-->5
6-->7
6-->5
6-->P
6-->A
6-->1D
6-->3
6-->1G
6-->2N
7-->8
7-->M
7-->K
7-->O
7-->N
7-->L
8-->A
8-->K
A-->B
B-->C
C-->E
C-->A
E-->F
E-->G
E-->H
E-->I
E-->J
K-->L
M-->A
M-->K
M-->N
N-->L
P-->Q
P-->17
P-->R
P-->18
Q-->A
Q-->R
R-->C
R-->S
R-->T
R-->U
R-->V
R-->W
R-->X
R-->Y
R-->Z
R-->10
R-->11
R-->12
R-->13
R-->14
R-->15
R-->16
S-->A
T-->A
U-->S
U-->T
U-->A
V-->A
W-->A
X-->A
Z-->A
10-->A
11-->A
12-->7
13-->A
14-->V
14-->A
15-->E
16-->7
16-->A
16-->12
17-->A
17-->R
18-->1A
18-->A
18-->Q
18-->R
1A-->1B
1A-->V
1A-->14
1D-->1E
1D-->1F
1G-->1I
1G-->1R
1G-->7
1G-->20
1G-->P
1G-->21
1G-->23
1G-->2L
1G-->29
1G-->2E
1G-->E
1G-->2
1I-->1J
1I-->1Q
1J-->1K
1J-->1L
1J-->1M
1J-->1P
1L-->1K
1L-->1M
1L-->1P
1L-->1O
1M-->1K
1M-->1L
1M-->1N
1M-->1P
1M-->1O
1N-->1M
1N-->1O
1P-->1K
1P-->1L
1P-->1M
1P-->1O
1Q-->1J
1R-->1S
1R-->1T
1R-->1U
1R-->1V
1R-->1W
1R-->1A
1R-->1X
1R-->1Y
1R-->1Z
1S-->7
1T-->1S
1Z-->1S
21-->17
21-->18
21-->15
23-->24
23-->27
23-->29
24-->26
26-->1I
26-->P
26-->E
27-->29
29-->2A
29-->2D
29-->2E
29-->2G
29-->2H
29-->2I
29-->2J
29-->2K
2A-->2B
2A-->2C
2B-->1I
2B-->1B
2C-->V
2D-->2A
2D-->2B
2D-->26
2D-->2C
2G-->2D
2H-->2D
2I-->2D
2J-->2D
2K-->2D
2L-->2M
2L-->P
2L-->24
2L-->29
2M-->2C
2N-->1R
2N-->7
2N-->P
2N-->21
2N-->23
2N-->2
2N-->1G
2O-->3
2O-->6
2O-->1G
2O-->2N
2Q-->2O
2Q-->1I
2Q-->7
2Q-->P
2Q-->1D
2Q-->2R
2R-->2O
2R-->P
2U-->1I
2U-->P
2U-->2V
2U-->2W
2U-->2X
2Y-->3
2Y-->1G
2Y-->2N
2Y-->2C
2Y-->P
2Y-->2L
2Y-->2E
2Y-->E
2Y-->2U
2Y-->2V
2Y-->2W
2Y-->2X
2Z-->7
2Z-->A
2Z-->2Y
30-->2Y
30-->2Z
32-->2
32-->1I
32-->1R
32-->7
32-->20
32-->P
32-->E
32-->33
32-->35
32-->37
32-->3K
32-->34
33-->26
33-->34
35-->2M
35-->33
35-->37
35-->3K
37-->2A
37-->2D
37-->34
37-->38
37-->39
37-->3A
37-->3B
37-->3C
37-->3D
37-->3E
37-->3F
37-->3G
37-->3H
37-->3I
37-->3J
38-->2D
39-->2D
3A-->2G
3B-->2H
3C-->2I
3C-->2D
3D-->2D
3E-->2D
3F-->2D
3G-->2J
3H-->2D
3I-->2K
3J-->2D
3K-->L
3K-->P
3K-->A
3K-->21
3L-->32
3L-->34
3N-->2
3N-->1I
3N-->1R
3N-->7
3N-->20
3N-->P
3N-->E
3N-->3O
3N-->3Q
3N-->3S
3N-->45
3N-->3P
3O-->26
3O-->3P
3Q-->2M
3Q-->3O
3Q-->3S
3Q-->45
3S-->2A
3S-->2D
3S-->3P
3S-->3T
3S-->3U
3S-->3V
3S-->3W
3S-->3X
3S-->3Y
3S-->3Z
3S-->40
3S-->41
3S-->42
3S-->43
3S-->44
3T-->2D
3U-->2D
3V-->2G
3W-->2H
3X-->2I
3X-->2D
3Y-->2D
3Z-->2D
40-->2D
41-->2J
42-->2D
43-->2K
44-->2D
45-->L
45-->P
45-->A
45-->21
46-->3N
46-->3P

class 0,1,4,9,D,19,1C,1H,22,28,25,2F,2T,31,36,3M,3R subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
