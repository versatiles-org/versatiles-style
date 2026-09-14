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
1I["osm.ts"]
2P["satellite.ts"]
2Q["index.ts"]
2R["schema-builder.ts"]
end
subgraph 4["lib"]
5["schema-signatures.ts"]
7["index.ts"]
8["fetchFontFaces.ts"]
M["utils.ts"]
N["fetchTileJSON.ts"]
O["loadTileSource.ts"]
P["inlineSources.ts"]
Q["tileSource.ts"]
R["styleMeta.ts"]
1D["opacity.ts"]
22["languages.ts"]
2U["schema-audit.ts"]
end
subgraph 9["options"]
A["keys.ts"]
B["v5-hints.ts"]
C["colors.ts"]
K["urls.ts"]
L["sprite.ts"]
S["index.ts"]
T["osm-overlay.ts"]
U["parts.ts"]
V["features-hillshade.ts"]
W["features-terrain.ts"]
X["features.ts"]
Y["font-names.ts"]
Z["fonts.ts"]
10["layer-groups.ts"]
11["layout.ts"]
12["projection.ts"]
13["recolor.ts"]
14["satellite-raster.ts"]
15["sky.ts"]
16["sun.ts"]
17["text.ts"]
18["theme.ts"]
19["osm.ts"]
1A["satellite.ts"]
23["minimize.ts"]
end
subgraph D["themes"]
E["index.ts"]
F["colorful.ts"]
G["gray.ts"]
H["muted.ts"]
I["natural.ts"]
J["toner.ts"]
49["types.ts"]
end
subgraph 1B["features"]
1C["satellite-overlay.ts"]
1T["index.ts"]
1U["elevation-source.ts"]
1V["hillshade.ts"]
1W["landcover.ts"]
1X["layout.ts"]
1Y["projection.ts"]
1Z["sky.ts"]
20["sun.ts"]
21["terrain.ts"]
end
subgraph 1E["types"]
1F["index.ts"]
1G["tilejson.ts"]
1H["vector_layer.ts"]
4A["maplibre.ts"]
end
subgraph 1J["color"]
1K["index.ts"]
1L["parse.ts"]
1M["abstract.ts"]
1N["hsl.ts"]
1O["hsv.ts"]
1P["random.ts"]
1Q["utils.ts"]
1R["rgb.ts"]
1S["recolor.ts"]
end
subgraph 24["shortbread"]
25["index.ts"]
26["context.ts"]
29["groups.ts"]
subgraph 2A["layers"]
2B["* (13 files)"]
end
2G["schema.ts"]
2N["layer-groups-map.ts"]
end
subgraph 27["dsl"]
28["context.ts"]
2C["assemble.ts"]
2D["build.ts"]
2E["fonts.ts"]
2F["index.ts"]
2O["group-maps.ts"]
end
subgraph 2H["cartography"]
2I["boundaries.ts"]
2J["buildings.ts"]
2K["labels.ts"]
2L["roads.ts"]
2M["transitstops.ts"]
end
2S["index.ts"]
2T["variants.ts"]
subgraph 2V["migrate"]
2W["calibrate.ts"]
2X["evaluate.ts"]
2Y["math.ts"]
2Z["probes.ts"]
30["derive.ts"]
31["guess.ts"]
32["index.ts"]
end
subgraph 33["omt"]
34["api.ts"]
35["context.ts"]
36["schema.ts"]
37["layer-groups-map.ts"]
subgraph 38["layers"]
39["index.ts"]
3A["airport.ts"]
3B["background.ts"]
3C["boundaries.ts"]
3D["buildings.ts"]
3E["labels.ts"]
3F["landcover.ts"]
3G["markings.ts"]
3H["pois.ts"]
3I["roads.ts"]
3J["sites.ts"]
3K["transitstops.ts"]
3L["water.ts"]
end
3M["options.ts"]
3N["index.ts"]
end
subgraph 3O["protomaps"]
3P["api.ts"]
3Q["context.ts"]
3R["schema.ts"]
3S["layer-groups-map.ts"]
subgraph 3T["layers"]
3U["index.ts"]
3V["airport.ts"]
3W["background.ts"]
3X["boundaries.ts"]
3Y["buildings.ts"]
3Z["labels.ts"]
40["landcover.ts"]
41["markings.ts"]
42["pois.ts"]
43["roads.ts"]
44["sites.ts"]
45["transitstops.ts"]
46["water.ts"]
end
47["options.ts"]
48["index.ts"]
end
end
3-->5
6-->7
6-->5
6-->S
6-->A
6-->1F
6-->3
6-->1I
6-->2P
7-->8
7-->N
7-->P
7-->O
7-->R
7-->Q
7-->M
8-->A
8-->K
8-->M
A-->B
B-->C
C-->E
C-->A
E-->F
E-->G
E-->H
E-->I
E-->J
K-->7
K-->A
K-->L
L-->7
N-->A
N-->O
O-->M
P-->A
P-->O
P-->Q
Q-->M
S-->T
S-->19
S-->U
S-->1A
T-->A
T-->U
U-->C
U-->V
U-->W
U-->X
U-->Y
U-->Z
U-->10
U-->11
U-->12
U-->13
U-->14
U-->15
U-->L
U-->16
U-->17
U-->18
U-->K
V-->A
W-->A
X-->V
X-->W
X-->A
Z-->A
10-->A
11-->A
13-->A
14-->A
15-->A
16-->A
17-->Z
17-->A
18-->E
19-->A
19-->U
1A-->1C
1A-->A
1A-->T
1A-->U
1C-->1D
1C-->Z
1C-->17
1F-->1G
1F-->1H
1I-->1K
1I-->1T
1I-->7
1I-->22
1I-->S
1I-->23
1I-->25
1I-->2N
1I-->2B
1I-->2G
1I-->E
1I-->2
1K-->1L
1K-->1S
1L-->1M
1L-->1N
1L-->1O
1L-->1R
1N-->1M
1N-->1O
1N-->1R
1N-->1Q
1O-->1M
1O-->1N
1O-->1P
1O-->1R
1O-->1Q
1P-->1O
1P-->1Q
1R-->1M
1R-->1N
1R-->1O
1R-->1Q
1S-->1L
1T-->1U
1T-->1V
1T-->1W
1T-->1X
1T-->1Y
1T-->1C
1T-->1Z
1T-->20
1T-->21
1U-->7
1V-->1U
21-->1U
23-->Z
23-->19
23-->1A
23-->18
25-->26
25-->29
25-->2B
26-->28
28-->1K
28-->S
28-->E
29-->2B
2B-->2C
2B-->2F
2B-->2G
2B-->2I
2B-->2J
2B-->2K
2B-->2L
2B-->2M
2C-->2D
2C-->2E
2D-->1K
2D-->1D
2E-->Z
2F-->2C
2F-->2D
2F-->28
2F-->2E
2I-->2F
2J-->2F
2K-->2F
2L-->2F
2M-->2F
2N-->2O
2N-->S
2N-->26
2N-->2B
2O-->2E
2P-->1T
2P-->7
2P-->S
2P-->23
2P-->25
2P-->2
2P-->1I
2Q-->3
2Q-->6
2Q-->1I
2Q-->2P
2S-->2Q
2S-->1K
2S-->7
2S-->S
2S-->1F
2S-->2T
2T-->2Q
2T-->S
2W-->1K
2W-->S
2W-->2X
2W-->2Y
2W-->2Z
30-->3
30-->1I
30-->2P
30-->2E
30-->S
30-->2N
30-->2G
30-->E
30-->2W
30-->2X
30-->2Y
30-->2Z
31-->7
31-->A
31-->30
32-->30
32-->31
34-->2
34-->1K
34-->1T
34-->7
34-->22
34-->S
34-->E
34-->35
34-->37
34-->39
34-->3M
34-->36
35-->28
35-->36
37-->2O
37-->35
37-->39
37-->3M
39-->2C
39-->2F
39-->36
39-->3A
39-->3B
39-->3C
39-->3D
39-->3E
39-->3F
39-->3G
39-->3H
39-->3I
39-->3J
39-->3K
39-->3L
3A-->2F
3B-->2F
3C-->2I
3D-->2J
3E-->2K
3E-->2F
3F-->2F
3G-->2F
3H-->2F
3I-->2L
3J-->2F
3K-->2M
3L-->2F
3M-->M
3M-->S
3M-->A
3M-->23
3N-->34
3N-->36
3P-->2
3P-->1K
3P-->1T
3P-->7
3P-->22
3P-->S
3P-->E
3P-->3Q
3P-->3S
3P-->3U
3P-->47
3P-->3R
3Q-->28
3Q-->3R
3S-->2O
3S-->3Q
3S-->3U
3S-->47
3U-->2C
3U-->2F
3U-->3R
3U-->3V
3U-->3W
3U-->3X
3U-->3Y
3U-->3Z
3U-->40
3U-->41
3U-->42
3U-->43
3U-->44
3U-->45
3U-->46
3V-->2F
3W-->2F
3X-->2I
3Y-->2J
3Z-->2K
3Z-->2F
40-->2F
41-->2F
42-->2F
43-->2L
44-->2F
45-->2M
46-->2F
47-->M
47-->S
47-->A
47-->23
48-->3P
48-->3R

class 0,1,4,9,D,1B,1E,1J,24,2A,27,2H,2V,33,38,3O,3T subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```

## Licenses

- **Source Code:** [Unlicense](./LICENSE.md)
- **Iconsets and Rendered Spritemaps:** [CC0 1.0 Universal](./icons/LICENSE.md)
