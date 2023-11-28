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
	const baseUrl = new URL('/', window.location.href).href;
	const map = new maplibregl.Map({
		container: 'map',
		style: versatiles_style.colorful({
			glyphsUrl: baseUrl + 'fonts/{fontstack}/{range}.pbf',
			spriteUrl: baseUrl + 'sprites/sprites',
			tilesUrl: [baseUrl + 'tiles/{z}/{x}/{y}'],
		})
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
import { colorful } from 'versatiles-style';
let style = colorful({language:'de'});
writeFileSync('style.json', JSON.stringify(style));
```

# API

<!--- This chapter is generated automatically --->

## Classes

### Class: `Colorful`<a id="class_colorful"></a>

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/style/colorful.ts#L6">\[src]</a></sup>

#### Constructor: `new Colorful()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L46">\[src]</a></sup>

#### Properties

* <code>name: string</code>
* <code>defaultFonts: {bold:?, regular:?}</code>
* <code>defaultColors: {agriculture:?, boundary:?, building:?, buildingbg:?, burial:?, commercial:?, construction:?, cycle:?, danger:?, disputed:?, education:?, foot:?, glacier:?, grass:?, hospital:?, industrial:?, label:?, labelHalo:?, land:?, leisure:?, motorway:?, motorwaybg:?, park:?, parking:?, poi:?, prison:?, rail:?, residential:?, rock:?, sand:?, shield:?, street:?, streetbg:?, subway:?, symbol:?, trunk:?, trunkbg:?, waste:?, water:?, wetland:?, wood:?}</code>
* <code>baseUrl: string</code>
* <code>glyphsUrl: string</code>
* <code>spriteUrl: string</code>
* <code>tilesUrls: string\[]</code>
* <code>hideLabels: boolean</code>
* <code>languageSuffix: LanguageSuffix</code>
* <code>recolor: RecolorOptions</code>

#### Method: `getColors()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L56">\[src]</a></sup>

**Returns:** <code>StylemakerColors<[default](#class_colorful)></code>

#### Method: `build()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L63">\[src]</a></sup>

**Returns:** <code>[MaplibreStyle](#type_maplibrestyle)</code>

### Class: `Graybeard`<a id="class_graybeard"></a>

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/style/graybeard.ts#L3">\[src]</a></sup>

#### Constructor: `new Graybeard()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/style/graybeard.ts#L6">\[src]</a></sup>

#### Properties

* <code>name: string</code>
* <code>defaultFonts: {bold:?, regular:?}</code>
* <code>defaultColors: {agriculture:?, boundary:?, building:?, buildingbg:?, burial:?, commercial:?, construction:?, cycle:?, danger:?, disputed:?, education:?, foot:?, glacier:?, grass:?, hospital:?, industrial:?, label:?, labelHalo:?, land:?, leisure:?, motorway:?, motorwaybg:?, park:?, parking:?, poi:?, prison:?, rail:?, residential:?, rock:?, sand:?, shield:?, street:?, streetbg:?, subway:?, symbol:?, trunk:?, trunkbg:?, waste:?, water:?, wetland:?, wood:?}</code>
* <code>baseUrl: string</code>
* <code>glyphsUrl: string</code>
* <code>spriteUrl: string</code>
* <code>tilesUrls: string\[]</code>
* <code>hideLabels: boolean</code>
* <code>languageSuffix: LanguageSuffix</code>
* <code>recolor: RecolorOptions</code>

#### Method: `getColors()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L56">\[src]</a></sup>

**Returns:** <code>StylemakerColors<[default](#class_colorful)></code>

#### Method: `build()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L63">\[src]</a></sup>

**Returns:** <code>[MaplibreStyle](#type_maplibrestyle)</code>

### Class: `Neutrino`<a id="class_neutrino"></a>

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/style/neutrino.ts#L6">\[src]</a></sup>

#### Constructor: `new Neutrino()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L46">\[src]</a></sup>

#### Properties

* <code>name: string</code>
* <code>defaultFonts: {bold:?, regular:?}</code>
* <code>defaultColors: {agriculture:?, boundary:?, building:?, foot:?, grass:?, label:?, land:?, rail:?, site:?, street:?, water:?, wood:?}</code>
* <code>baseUrl: string</code>
* <code>glyphsUrl: string</code>
* <code>spriteUrl: string</code>
* <code>tilesUrls: string\[]</code>
* <code>hideLabels: boolean</code>
* <code>languageSuffix: LanguageSuffix</code>
* <code>recolor: RecolorOptions</code>

#### Method: `getColors()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L56">\[src]</a></sup>

**Returns:** <code>StylemakerColors<[default](#class_neutrino)></code>

#### Method: `build()`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_builder.ts#L63">\[src]</a></sup>

**Returns:** <code>[MaplibreStyle](#type_maplibrestyle)</code>

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

### Type: `MaplibreStyle`<a id="type_maplibrestyle"></a>

**Type:** <code>MaplibreStyleRaster | MaplibreStyleVector</code>

### Type: `TileJSONSpecification`<a id="type_tilejsonspecification"></a>

**Type:** <code>[TileJSONSpecificationRaster](#interface_tilejsonspecificationraster) | [TileJSONSpecificationVector](#interface_tilejsonspecificationvector)</code>

## Functions

### Method: `guessStyle(spec)`

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/3c600aa/src/lib/style_guesser.ts#L12">\[src]</a></sup>

**Parameters:**

* <code>spec: [TileJSONSpecification](#type_tilejsonspecification)</code>

**Returns:** <code>[MaplibreStyle](#type_maplibrestyle)</code>
