[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)

# VersaTiles Style

Programatically generates StyleJSON for MapLibre.

![Example: Colorful Style](docs/colorful.png)

# Styles

* Colorful - colorful, full featured map
* Neutrino - light basemap
* Graybeard - gray basemap

# Download styles for versatiles.org

You can download the latest StyleJSONs from the [latest release](https://github.com/versatiles-org/versatiles-style/releases/latest/).
We provide each style with and without labels, and also in multiple languages.

Be aware that styles already include `tiles.versatiles.org` as source for tiles, fonts (glyphs) and icons (sprites). So you might want to update the URLs in the JSON.

# Create styles in the frontend (web browser)

Download latest release:

```bash
wget "https://github.com/versatiles-org/versatiles-style/releases/latest/download/versatiles-style.js"
```

Use it in:

```html
<div id="map"></div>
<script src="maplibre-gl.js"></script>
<script src="versatiles-style.js"></script>
<script>
  const style = VersaTilesStyle.styles.graybeard({
    tiles: ['https://???.org/tiles/osm/{z}/{x}/{y}'],
    sprite: 'https://???.org/assets/styles/swr-bright/sprite',
    glyphs: 'https://???.org/assets/fonts/{fontstack}/{range}.pbf',
    languageSuffix: '_de',
    colors: { label: '#222' },
    recolor: { gamma: 0.5 }
  });

	const map = new maplibregl.Map({
		container: 'map',
		style
	});
<script>
```

# Create styles in the backend (Node.js)

Install `versatiles-style` via NPM:

```bash
npm install versatiles-style
```

Use it in Node.js:

```javascript
import { styles } from 'versatiles-style';
let style = styles.colorful({
  languageSuffix: '_en',
});
writeFileSync('style.json', JSON.stringify(style.build()));
```

# API

<!--- This chapter is generated automatically --->

## Interfaces

### Interface: `TileJSONSpecificationRaster`<a id="interface_tilejsonspecificationraster"></a>

```typescript
interface {
  attribution?: string;
  bounds?: [number, number, number, number];
  center?: [number, number];
  description?: string;
  fillzoom?: number;
  format: "avif" | "jpg" | "png" | "webp";
  grids?: string[];
  legend?: string;
  maxzoom?: number;
  minzoom?: number;
  name?: string;
  scheme?: "xyz" | "tms";
  template?: string;
  tilejson?: "3.0.0";
  tiles: string[];
  type: "raster";
}
```

### Interface: `TileJSONSpecificationVector`<a id="interface_tilejsonspecificationvector"></a>

```typescript
interface {
  attribution?: string;
  bounds?: [number, number, number, number];
  center?: [number, number];
  description?: string;
  fillzoom?: number;
  format: "pbf";
  grids?: string[];
  legend?: string;
  maxzoom?: number;
  minzoom?: number;
  name?: string;
  scheme?: "xyz" | "tms";
  template?: string;
  tilejson?: "3.0.0";
  tiles: string[];
  type: "vector";
  vector_layers: VectorLayer[];
}
```

## Type Aliases

### Type: `TileJSONSpecification`<a id="type_tilejsonspecification"></a>

**Type:** <code>[TileJSONSpecificationRaster](#interface_tilejsonspecificationraster) | [TileJSONSpecificationVector](#interface_tilejsonspecificationvector)</code>

## Functions

### Method: `colorful(options)`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/be6dcfe/src/index.ts#L4">\[src]</a></sup>

**Parameters:**

* <code>options: StylemakerOptions<default></code> (optional)

**Returns:** <code>MaplibreStyle</code>

### Method: `graybeard(options)`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/be6dcfe/src/index.ts#L9">\[src]</a></sup>

**Parameters:**

* <code>options: StylemakerOptions<default></code> (optional)

**Returns:** <code>MaplibreStyle</code>

### Method: `guessStyle(opt)`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/be6dcfe/src/lib/style_guesser.ts#L13">\[src]</a></sup>

**Parameters:**

* <code>opt: TileJSONOption</code>

**Returns:** <code>MaplibreStyle</code>

### Method: `neutrino(options)`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/be6dcfe/src/index.ts#L14">\[src]</a></sup>

**Parameters:**

* <code>options: StylemakerOptions<default></code> (optional)

**Returns:** <code>MaplibreStyle</code>
