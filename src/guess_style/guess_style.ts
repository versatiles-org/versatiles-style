import type { TileJSONSpecification, TileJSONSpecificationRaster, TileJSONSpecificationVector, VectorLayer } from '../types/index.js';
import { isTileJSONSpecification } from '../types/index.js';
import { deepClone, resolveUrl } from '../lib/utils.js';
import type { BackgroundLayerSpecification, CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification, RasterSourceSpecification, SourceSpecification, SpriteSpecification, StyleSpecification, VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colorful } from '../styles/index.js';
import { isRasterTileJSONSpecification } from '../types/tilejson.js';
import randomColor from '../color/random.js';

/**
 * Options for guessing the style of a map.
 */
export interface GuessStyleOptions {
	/**
	 * Base URL to resolve URLs for tile sources, glyphs, and sprites.
	 */
	baseUrl?: string;
	/**
	 * URL template for glyphs.
	 */
	glyphs?: string;
	/**
	 * URL template for sprites. See also {@link SpriteSpecification}.
	 */
	sprite?: SpriteSpecification;
}

/**
 * Generates a style specification based on the provided TileJSON specification and optional parameters.
 *
 * @param {TileJSONSpecification} tileJSON - The TileJSON specification to generate the style from.
 * @param {GuessStyleOptions} [options] - Optional parameters to customize the style generation.
 * @param {string} [options.baseUrl] - Base URL to resolve tile URLs.
 * @param {string} [options.glyphs] - URL template for glyphs.
 * @param {string} [options.sprite] - URL template for sprites.
 * @returns {StyleSpecification} The generated style specification.
 * @throws {Error} If the provided TileJSON specification is invalid.
 */
export function guessStyle(tileJSON: TileJSONSpecification, options?: GuessStyleOptions): StyleSpecification {
	tileJSON = deepClone(tileJSON);

	if (options && options.baseUrl) {
		const { baseUrl } = options;
		tileJSON.tiles = tileJSON.tiles.map(url => resolveUrl(baseUrl, url));
	}

	if (!isTileJSONSpecification(tileJSON)) throw Error('Invalid TileJSON specification');

	let style: StyleSpecification;
	if (isRasterTileJSONSpecification(tileJSON)) {
		style = getRasterStyle(tileJSON);
	} else {
		if (isShortbread(tileJSON)) {
			style = getShortbreadStyle(tileJSON, {
				baseUrl: options?.baseUrl,
				glyphs: options?.glyphs,
				sprite: options?.sprite,
			});
		} else {
			style = getInspectorStyle(tileJSON);
		}
	}

	return style;
}

function isShortbread(spec: TileJSONSpecificationVector): boolean {
	if (typeof spec !== 'object') return false;
	if (!('vector_layers' in spec)) return false;
	if (!Array.isArray(spec.vector_layers)) return false;


	const layerIds = new Set(spec.vector_layers.map(l => String(l.id)));
	const shortbreadIds = ['place_labels', 'boundaries', 'boundary_labels', 'addresses', 'water_lines', 'water_lines_labels', 'dam_lines', 'dam_polygons', 'pier_lines', 'pier_polygons', 'bridges', 'street_polygons', 'streets_polygons_labels', 'ferries', 'streets', 'street_labels', 'street_labels_points', 'aerialways', 'public_transport', 'buildings', 'water_polygons', 'ocean', 'water_polygons_labels', 'land', 'sites', 'pois'];
	return shortbreadIds.every(id => layerIds.has(id));
}

function getShortbreadStyle(spec: TileJSONSpecificationVector, builderOption: { baseUrl?: string; glyphs?: string; sprite?: SpriteSpecification }): StyleSpecification {
	return colorful({
		tiles: spec.tiles,
		baseUrl: builderOption.baseUrl,
		glyphs: builderOption.glyphs,
		sprite: builderOption.sprite,
	});
}

/**
 * Generates a Mapbox GL style specification based on the provided TileJSON vector specification.
 *
 * @param {TileJSONSpecificationVector} spec - The TileJSON vector specification containing vector layers.
 * @returns {StyleSpecification} The generated Mapbox GL style specification.
 *
 * This function creates a style specification with background, circle, line, and fill layers.
 * It assigns colors to the layers based on the vector layer IDs using predefined rules for hue, luminosity, and saturation.
 *
 * The resulting style specification includes:
 * - A white background layer.
 * - Circle layers for point features.
 * - Line layers for line features.
 * - Fill layers for polygon features.
 *
 * The source for the layers is created using the `sourceFromSpec` function with the provided vector specification.
 */
function getInspectorStyle(spec: TileJSONSpecificationVector): StyleSpecification {
	const sourceName = 'vectorSource';

	const layers: {
		background: BackgroundLayerSpecification[];
		circle: CircleLayerSpecification[];
		line: LineLayerSpecification[];
		fill: FillLayerSpecification[];
	} = { background: [], circle: [], line: [], fill: [] };

	layers.background.push({ 'id': 'background', 'type': 'background', 'paint': { 'background-color': '#fff' } });

	spec.vector_layers.forEach((vector_layer: VectorLayer) => {
		let luminosity = 'bright', saturation, hue;

		if (/water|ocean|lake|sea|river/.test(vector_layer.id)) hue = 'blue';
		if (/state|country|place/.test(vector_layer.id)) hue = 'pink';
		if (/road|highway|transport|streets/.test(vector_layer.id)) hue = 'orange';
		if (/contour|building/.test(vector_layer.id)) hue = 'monochrome';
		if (vector_layer.id.includes('building')) luminosity = 'dark';
		if (/contour|landuse/.test(vector_layer.id)) hue = 'yellow';
		if (/wood|forest|park|landcover|land/.test(vector_layer.id)) hue = 'green';

		if (vector_layer.id.includes('point')) {
			saturation = 'strong';
			luminosity = 'light';
		}

		const color = randomColor({
			hue,
			luminosity,
			saturation,
			seed: vector_layer.id,
			opacity: 0.6,
		}).asString();

		layers.circle.push({
			id: `${sourceName}-${vector_layer.id}-circle`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'circle',
			filter: ['==', '$type', 'Point'],
			paint: { 'circle-color': color, 'circle-radius': 2 },
		});

		layers.line.push({
			id: `${sourceName}-${vector_layer.id}-line`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'line',
			filter: ['==', '$type', 'LineString'],
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: { 'line-color': color },
		});

		layers.fill.push({
			id: `${sourceName}-${vector_layer.id}-fill`,
			'source-layer': vector_layer.id,
			source: sourceName,
			type: 'fill',
			filter: ['==', '$type', 'Polygon'],
			paint: { 'fill-color': color, 'fill-opacity': 0.3, 'fill-antialias': true, 'fill-outline-color': color },
		});
	});

	return {
		version: 8,
		sources: {
			[sourceName]: sourceFromSpec(spec, 'vector'),
		},
		layers: [
			...layers.background,
			...layers.fill,
			...layers.line,
			...layers.circle,
		],
	};
}

function getRasterStyle(spec: TileJSONSpecificationRaster): StyleSpecification {
	const sourceName = 'rasterSource';
	return {
		version: 8,
		sources: {
			[sourceName]: sourceFromSpec(spec, 'raster'),
		},
		layers: [{
			id: 'raster',
			type: 'raster',
			source: sourceName,
		}],
	};
}

function sourceFromSpec(spec: TileJSONSpecification, type: 'raster' | 'vector'): SourceSpecification {
	const source: RasterSourceSpecification | VectorSourceSpecification = { tiles: spec.tiles, type };

	if (spec.minzoom != null) source.minzoom = spec.minzoom;
	if (spec.maxzoom != null) source.maxzoom = spec.maxzoom;
	if (spec.attribution != null) source.attribution = spec.attribution;
	if (spec.scheme != null) source.scheme = spec.scheme;

	return source;
}
