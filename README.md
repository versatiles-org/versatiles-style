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
1F["osm.ts"]
2K["satellite.ts"]
2L["index.ts"]
2M["schema-builder.ts"]
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
1A["opacity.ts"]
1Z["languages.ts"]
2P["schema-audit.ts"]
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
V["layer-groups.ts"]
W["layout.ts"]
X["projection.ts"]
Y["recolor.ts"]
Z["satellite-raster.ts"]
10["sky.ts"]
11["sprite.ts"]
12["sun.ts"]
13["text.ts"]
14["theme.ts"]
15["urls.ts"]
16["osm.ts"]
17["satellite.ts"]
20["minimize.ts"]
end
subgraph D["themes"]
E["index.ts"]
F["colorful.ts"]
G["gray.ts"]
H["muted.ts"]
I["natural.ts"]
J["toner.ts"]
44["types.ts"]
end
subgraph 18["features"]
19["satellite-overlay.ts"]
1Q["index.ts"]
1R["elevation-source.ts"]
1S["hillshade.ts"]
1T["landcover.ts"]
1U["layout.ts"]
1V["projection.ts"]
1W["sky.ts"]
1X["sun.ts"]
1Y["terrain.ts"]
end
subgraph 1B["types"]
1C["index.ts"]
1D["tilejson.ts"]
1E["vector_layer.ts"]
45["maplibre.ts"]
end
subgraph 1G["color"]
1H["index.ts"]
1I["parse.ts"]
1J["abstract.ts"]
1K["hsl.ts"]
1L["hsv.ts"]
1M["random.ts"]
1N["utils.ts"]
1O["rgb.ts"]
1P["recolor.ts"]
end
subgraph 21["shortbread"]
22["index.ts"]
23["context.ts"]
26["groups.ts"]
subgraph 27["layers"]
28["* (13 files)"]
end
2C["schema.ts"]
2J["layer-groups-map.ts"]
end
subgraph 24["dsl"]
25["context.ts"]
29["assemble.ts"]
2A["build.ts"]
2B["index.ts"]
end
subgraph 2D["cartography"]
2E["boundaries.ts"]
2F["buildings.ts"]
2G["labels.ts"]
2H["roads.ts"]
2I["transitstops.ts"]
end
2N["index.ts"]
2O["variants.ts"]
subgraph 2Q["migrate"]
2R["calibrate.ts"]
2S["evaluate.ts"]
2T["math.ts"]
2U["probes.ts"]
2V["derive.ts"]
2W["guess.ts"]
2X["index.ts"]
end
subgraph 2Y["omt"]
2Z["api.ts"]
30["context.ts"]
31["schema.ts"]
32["layer-groups-map.ts"]
subgraph 33["layers"]
34["index.ts"]
35["airport.ts"]
36["background.ts"]
37["boundaries.ts"]
38["buildings.ts"]
39["labels.ts"]
3A["landcover.ts"]
3B["markings.ts"]
3C["pois.ts"]
3D["roads.ts"]
3E["sites.ts"]
3F["transitstops.ts"]
3G["water.ts"]
end
3H["options.ts"]
3I["index.ts"]
end
subgraph 3J["protomaps"]
3K["api.ts"]
3L["context.ts"]
3M["schema.ts"]
3N["layer-groups-map.ts"]
subgraph 3O["layers"]
3P["index.ts"]
3Q["airport.ts"]
3R["background.ts"]
3S["boundaries.ts"]
3T["buildings.ts"]
3U["labels.ts"]
3V["landcover.ts"]
3W["markings.ts"]
3X["pois.ts"]
3Y["roads.ts"]
3Z["sites.ts"]
40["transitstops.ts"]
41["water.ts"]
end
42["options.ts"]
43["index.ts"]
end
end
3-->5
6-->7
6-->5
6-->P
6-->A
6-->1C
6-->3
6-->1F
6-->2K
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
P-->16
P-->R
P-->17
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
S-->A
T-->A
U-->S
U-->T
U-->A
V-->A
W-->A
Y-->A
Z-->A
10-->A
11-->7
12-->A
13-->A
14-->E
15-->7
15-->A
15-->11
16-->A
16-->R
17-->19
17-->A
17-->Q
17-->R
19-->1A
1C-->1D
1C-->1E
1F-->1H
1F-->1Q
1F-->7
1F-->1Z
1F-->P
1F-->20
1F-->22
1F-->2J
1F-->28
1F-->2C
1F-->E
1F-->2
1H-->1I
1H-->1P
1I-->1J
1I-->1K
1I-->1L
1I-->1O
1K-->1J
1K-->1L
1K-->1O
1K-->1N
1L-->1J
1L-->1K
1L-->1M
1L-->1O
1L-->1N
1M-->1L
1M-->1N
1O-->1J
1O-->1K
1O-->1L
1O-->1N
1P-->1I
1Q-->1R
1Q-->1S
1Q-->1T
1Q-->1U
1Q-->1V
1Q-->19
1Q-->1W
1Q-->1X
1Q-->1Y
1R-->7
1S-->1R
1Y-->1R
20-->16
20-->17
20-->14
22-->23
22-->26
22-->28
23-->25
25-->1H
25-->P
25-->E
26-->28
28-->29
28-->2B
28-->2C
28-->2E
28-->2F
28-->2G
28-->2H
28-->2I
29-->2A
2A-->1H
2A-->1A
2B-->29
2B-->2A
2B-->25
2E-->2B
2F-->2B
2G-->2B
2H-->2B
2I-->2B
2J-->P
2J-->23
2J-->28
2K-->1Q
2K-->7
2K-->P
2K-->20
2K-->22
2K-->2
2K-->1F
2L-->3
2L-->6
2L-->1F
2L-->2K
2N-->2L
2N-->1H
2N-->7
2N-->P
2N-->1C
2N-->2O
2O-->2L
2O-->P
2R-->1H
2R-->P
2R-->2S
2R-->2T
2R-->2U
2V-->3
2V-->1F
2V-->2K
2V-->P
2V-->2J
2V-->2C
2V-->E
2V-->2R
2V-->2S
2V-->2T
2V-->2U
2W-->7
2W-->A
2W-->2V
2X-->2V
2X-->2W
2Z-->2
2Z-->1H
2Z-->1Q
2Z-->7
2Z-->1Z
2Z-->P
2Z-->E
2Z-->30
2Z-->32
2Z-->34
2Z-->3H
2Z-->31
30-->25
30-->31
32-->30
32-->34
32-->3H
34-->29
34-->2B
34-->31
34-->35
34-->36
34-->37
34-->38
34-->39
34-->3A
34-->3B
34-->3C
34-->3D
34-->3E
34-->3F
34-->3G
35-->2B
36-->2B
37-->2E
38-->2F
39-->2G
39-->2B
3A-->2B
3B-->2B
3C-->2B
3D-->2H
3E-->2B
3F-->2I
3G-->2B
3H-->L
3H-->P
3H-->A
3H-->20
3I-->2Z
3I-->31
3K-->2
3K-->1H
3K-->1Q
3K-->7
3K-->1Z
3K-->P
3K-->E
3K-->3L
3K-->3N
3K-->3P
3K-->42
3K-->3M
3L-->25
3L-->3M
3N-->3L
3N-->3P
3N-->42
3P-->29
3P-->2B
3P-->3M
3P-->3Q
3P-->3R
3P-->3S
3P-->3T
3P-->3U
3P-->3V
3P-->3W
3P-->3X
3P-->3Y
3P-->3Z
3P-->40
3P-->41
3Q-->2B
3R-->2B
3S-->2E
3T-->2F
3U-->2G
3U-->2B
3V-->2B
3W-->2B
3X-->2B
3Y-->2H
3Z-->2B
40-->2I
41-->2B
42-->L
42-->P
42-->A
42-->20
43-->3K
43-->3M

class 0,1,4,9,D,18,1B,1G,21,27,24,2D,2Q,2Y,33,3J,3O subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
