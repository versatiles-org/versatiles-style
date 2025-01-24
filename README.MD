[![NPM Version](https://img.shields.io/npm/v/%40versatiles%2Fstyle)](https://www.npmjs.com/package/@versatiles/style)
[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)
[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/versatiles-org/versatiles-style/total)](https://github.com/versatiles-org/versatiles-style/releases/latest)

# VersaTiles Style

> [!WARNING]  
> We are currently migrating to the [VersaTiles Frontend Specification](https://github.com/versatiles-org/versatiles-documentation/blob/main/compendium/specification_frontend.md). While this is good for the long term, it does mean that there will be breaking changes in the short term. You can find the [old v4.4.1 release here](https://github.com/versatiles-org/versatiles-style/releases/tag/v4.4.1).

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

Where `options` is an optional object

### Method: `guessStyle(options)`

```javascript
const style = guessStyle(options);
```


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
