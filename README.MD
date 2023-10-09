# VersaTiles Styles

Programatically generates Shortbread StyleJSON for MapLibre.

![Example: Colorful Style](docs/colorful.png)

## Styles

* Colorful - colorful, full featured map
* Neutrino - light basemap
* Graybeard - gray basemap

You can download the latest StyleJSONs from the [latest release](https://github.com/versatiles-org/versatiles-styles/releases/latest/).
We provide each style with and without labels, and also in multiple languages.

## Generate Styles

`npm run build`

## Add/edit Styles

* style definitions in `src/styles/*.js`
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
