[![Code Coverage](https://codecov.io/gh/versatiles-org/versatiles-style/branch/main/graph/badge.svg?token=IDHAI13M0K)](https://codecov.io/gh/versatiles-org/versatiles-style)
[![GitHub Workflow Status)](https://img.shields.io/github/actions/workflow/status/versatiles-org/versatiles-style/ci.yml)](https://github.com/versatiles-org/versatiles-style/actions/workflows/ci.yml)

# VersaTiles Style

Programatically generates StyleJSON for MapLibre.

![Example: Colorful Style](docs/colorful.png)

## Styles

* Colorful - colorful, full featured map
* Neutrino - light basemap
* Graybeard - gray basemap

## Download

You can download the latest StyleJSONs from the [latest release](https://github.com/versatiles-org/versatiles-style/releases/latest/).
We provide each style with and without labels, and also in multiple languages.

Be aware that styles already include `tiles.versatiles.org` as source for tiles, fonts (glyphs) and icons (sprites). So you might want to update the URLs in the JSON.

## as Node.js module

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

## in a web browser

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

## Generate styles

`npm run build`

## Add/edit styles

* style definitions in `src/style/*.js`
* shortbread layer definition in `src/lib/shortbread_layers.js`
* style template in `src/lib/shortbread_template.json`

## Licenses

* Code: [Unlicense](LICENSE.md)
* Styles: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)

# todo

* [x] convert 'in' to '==' if only one element
* [x] outlines for roads, buildings, boundaries
* [x] :en labels
* [x] links under other roads, sort by size
* [x] waterway width
* [x] rail colorscheme
* [x] bridge semitransparent
* [x] cycleways and bicycle-roads
* [x] trams
* [x] rail zooms 17+
* [x] minor rails
* [x] more sites and landcovers
* [x] airports
* [x] pois
* [x] sprites and patterns, revisit sprites
* [x] public transport signage
* [x] road signage
* [ ] labels for rivers, islands, places
* [ ] aggregate layers with same filters and style for smaller result
