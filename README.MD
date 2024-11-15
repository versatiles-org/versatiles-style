[![NPM Version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)

# VersaTiles Style

Generates styles and sprites for MapLibre.

![Example: Colorful Style](docs/colorful.png)

# Styles

* Colorful - colorful, full featured map
* Graybeard - gray, full featured map
* Eclipse - dark, full featured map
* Neutrino - light basemap

# Use styles for versatiles.org

You in the the [latest release](https://github.com/versatiles-org/versatiles-style/releases/latest/) you can find:
- [`styles.tar.gz`](https://github.com/versatiles-org/versatiles-style/releases/latest/download/styles.tar.gz) containing all styles, each in multiple languages.  
Be aware that these styles use `tiles.versatiles.org` as source for tiles, fonts (glyphs) and icons (sprites). 
- [`sprites.tar.gz`](https://github.com/versatiles-org/versatiles-style/releases/latest/download/sprites.tar.gz) containing sprites, used e.g. for map icons
- [`versatiles-style.tar.gz`](https://github.com/versatiles-org/versatiles-style/releases/latest/download/versatiles-style.tar.gz) containing a JavaScript file to generate your own style in the browser.

# Generating styles on-the-fly

## Generating styles in the frontend (web browser)

Download latest release:

```bash
curl -Ls "https://github.com/versatiles-org/versatiles-style/releases/latest/download/versatiles-style.tar.gz" | gzip -d | tar -xf -
```

Use it in:

```html
<div id="map"></div>
<script src="maplibre-gl.js"></script>
<script src="versatiles-style.js"></script>
<script>
   const style = VersaTilesStyle.graybeard({
      language: 'de',
      colors: { label: '#222' },
      recolor: { gamma: 0.5 }
   });

   const map = new maplibregl.Map({
      container: 'map',
      style
   });
</script>
```

## Generating styles in the backend (Node.js)

Install `@versatiles/style` via NPM:

```bash
npm install @versatiles/style
```

Use it in Node.js:

```javascript
import { colorful } from '@versatiles/style';
let style = colorful({
  language: 'en',
});
writeFileSync('style.json', JSON.stringify(style));
```

### Methods for generating styles

This library provides:
- `style = colorful(options);`
- `style = eclipse(options);`
- `style = graybeard(options);`
- `style = neutrino(options);`

Where `options` is an optional object:

```javascript
const options: StyleBuilderOptions<Colorful> = {
	// The base URL for loading external resources like tiles, sprites, and fonts.
	// Default: document.location.origin (in the browser), or 'https://tiles.versatiles.org'
	baseUrl?: string;

	// The URL template for loading font glyphs, formatted with '{fontstack}' and '{range}' placeholders.
	// Default: '/assets/glyphs/{fontstack}/{range}.pbf'
	glyphs?: string;

	// The URL for loading sprite images and metadata.
	// Default: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }]
	sprite?: string | { id: string; url: string }[];

	// An array of URL templates for loading map tiles, using '{z}', '{x}', and '{y}' placeholders.
	// Default: ['/tiles/osm/{z}/{x}/{y}']
	tiles?: string[];

	// If set to true, hides all map labels.
	// Default: false
	hideLabels?: boolean;

	// Set the language ('en', 'de') of all map labels.
	// A null value means that the language of the country in which the label is drawn will be used.
	// Default: null
	language?: Language;

	// An object specifying overrides for default color values, keyed by the color names.
	colors?: Partial<StyleBuilderColorStrings<T>>;

	// An object specifying overrides for default font names, keyed by the font names.
	fonts?: Partial<StyleBuilderFontStrings<T>>;

	// Options for color adjustments and transformations applied to the entire style.
	recolor?: RecolorOptions;
}

export interface RecolorOptions {
	// If true, inverts all colors.
	invertBrightness?: boolean;

	// Rotate the hue of all colors (in degrees).
	rotate?: number;

	// Adjusts the saturation level of all colors. Positive values increase saturation, negative values decrease it.
	saturate?: number;

	// Adjusts the gamma of all colors. Affects the brightness in a non-linear manner.
	gamma?: number;

	// Adjusts the contrast of all colors. Higher values produce more contrast.
	contrast?: number;

	// Adjusts the brightness of all colors. Positive values make it brighter, negative values make it darker.
	brightness?: number;

	// Specifies the intensity of the tinting effect. Ranges from 0 (no effect) to 1 (full effect).
	tint?: number;

	// Specifies the color used for tinting, in a string format (e.g., '#FF0000').
	tintColor?: string;
}
```

### Method: `guessStyle(options)`

```javascript
const style = guessStyle(options);
```


GuessStyleOptions

<sup><a href="https://github.com/versatiles-org/versatiles-style/blob/be6dcfe/src/lib/style_guesser.ts#L13">\[src]</a></sup>

**Parameters:**

* <code>opt: TileJSONOption</code>

**Returns:** <code>MaplibreStyle</code>

# Build

Please note that for building new sprites you need `optipng`.

## SVG Sources

* SVG sources should consist only of paths and not contain any `transform()`s.
* Colors and styles are ignored.
* All lengths must be in pixels without unit.

## Configuration

Iconsets can be defined in [`scripts/config-sprites.ts`](./scripts/config-sprites.ts)

# Licenses

* Sourcecode: [Unlicense](./LICENSE.md)
* Iconsets and rendered Spritemaps: [CC0 1.0 Universal](./icons/LICENSE.md)
