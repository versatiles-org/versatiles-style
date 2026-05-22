import type {
	TileJSONSpecification,
	TileJSONSpecificationRaster,
	TileJSONSpecificationVector,
	VectorLayer,
} from '../types/index.js';
import { resolveUrl } from '../lib/utils.js';
import type {
	BackgroundLayerSpecification,
	CircleLayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification,
	RasterSourceSpecification,
	SourceSpecification,
	SpriteSpecification,
	StyleSpecification,
	VectorSourceSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { colorful } from '../styles/index.js';
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
 * This function is intentionally fault-tolerant: a TileJSON that is partially invalid never causes it
 * to throw. Every field is validated independently and silently dropped if it does not conform, so the
 * remaining valid fields are still used to build a valid style. Even completely invalid input (e.g.
 * `null` or a TileJSON without usable tiles) yields a valid — if empty — style.
 *
 * @param {TileJSONSpecification} tileJSON - The TileJSON specification to generate the style from.
 * @param {GuessStyleOptions} [options] - Optional parameters to customize the style generation.
 * @param {string} [options.baseUrl] - Base URL to resolve tile URLs.
 * @param {string} [options.glyphs] - URL template for glyphs.
 * @param {string} [options.sprite] - URL template for sprites.
 * @returns {StyleSpecification} The generated style specification.
 */
export function guessStyle(tileJSON: TileJSONSpecification, options?: GuessStyleOptions): StyleSpecification {
	const spec = sanitizeTileJSON(tileJSON);

	if (options && options.baseUrl) {
		const { baseUrl } = options;
		spec.tiles = spec.tiles.map((url) => resolveUrl(baseUrl, url));
	}

	let style: StyleSpecification;
	if ('vector_layers' in spec && Array.isArray(spec.vector_layers)) {
		if (isShortbread(spec)) {
			style = getShortbreadStyle(spec, {
				baseUrl: options?.baseUrl,
				glyphs: options?.glyphs,
				sprite: options?.sprite,
			});
		} else {
			style = getInspectorStyle(spec);
		}
	} else {
		style = getRasterStyle(spec);
	}

	return style;
}

/**
 * Builds a best-effort, valid TileJSON specification from arbitrary input.
 *
 * Each field is validated on its own and dropped if invalid, so a single malformed property never
 * discards the rest of the TileJSON. The result always has a `tiles` array (possibly empty) and only
 * carries `vector_layers` when at least one valid layer is present. The input is never mutated.
 */
function sanitizeTileJSON(raw: unknown): TileJSONSpecification {
	const input: Record<string, unknown> =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

	const spec: TileJSONSpecificationRaster = { tiles: [] };

	if (Array.isArray(input.tiles)) {
		spec.tiles = input.tiles.filter((tile): tile is string => typeof tile === 'string');
	}

	if (typeof input.attribution === 'string') spec.attribution = input.attribution;
	if (input.scheme === 'xyz' || input.scheme === 'tms') spec.scheme = input.scheme;
	if (typeof input.minzoom === 'number' && Number.isFinite(input.minzoom) && input.minzoom >= 0)
		spec.minzoom = input.minzoom;
	if (typeof input.maxzoom === 'number' && Number.isFinite(input.maxzoom) && input.maxzoom >= 0)
		spec.maxzoom = input.maxzoom;

	const vectorLayers = sanitizeVectorLayers(input.vector_layers);
	if (vectorLayers) (spec as TileJSONSpecificationVector).vector_layers = vectorLayers;

	return spec;
}

/**
 * Returns the valid vector layers from arbitrary input, or `undefined` if none are valid.
 * Invalid layers (and invalid fields within a layer) are dropped individually.
 */
function sanitizeVectorLayers(raw: unknown): VectorLayer[] | undefined {
	if (!Array.isArray(raw)) return undefined;

	const layers: VectorLayer[] = [];
	for (const entry of raw) {
		if (typeof entry !== 'object' || entry === null) continue;
		const layer = entry as Record<string, unknown>;
		if (typeof layer.id !== 'string') continue;

		const fields: Record<string, 'Boolean' | 'Number' | 'String'> = {};
		if (typeof layer.fields === 'object' && layer.fields !== null) {
			for (const [key, value] of Object.entries(layer.fields)) {
				if (value === 'Boolean' || value === 'Number' || value === 'String') fields[key] = value;
			}
		}

		const clean: VectorLayer = { id: layer.id, fields };
		if (typeof layer.description === 'string') clean.description = layer.description;
		if (typeof layer.minzoom === 'number' && Number.isFinite(layer.minzoom) && layer.minzoom >= 0)
			clean.minzoom = layer.minzoom;
		if (typeof layer.maxzoom === 'number' && Number.isFinite(layer.maxzoom) && layer.maxzoom >= 0)
			clean.maxzoom = layer.maxzoom;
		layers.push(clean);
	}

	return layers.length > 0 ? layers : undefined;
}

function isShortbread(spec: TileJSONSpecificationVector): boolean {
	if (typeof spec !== 'object') return false;
	if (!('vector_layers' in spec)) return false;
	if (!Array.isArray(spec.vector_layers)) return false;

	const layerIds = new Set(spec.vector_layers.map((l) => String(l.id)));
	const shortbreadIds = [
		'place_labels',
		'boundaries',
		'boundary_labels',
		'addresses',
		'water_lines',
		'water_lines_labels',
		'dam_lines',
		'dam_polygons',
		'pier_lines',
		'pier_polygons',
		'bridges',
		'street_polygons',
		'streets_polygons_labels',
		'ferries',
		'streets',
		'street_labels',
		'street_labels_points',
		'aerialways',
		'public_transport',
		'buildings',
		'water_polygons',
		'ocean',
		'water_polygons_labels',
		'land',
		'sites',
		'pois',
	];
	return shortbreadIds.every((id) => layerIds.has(id));
}

function getShortbreadStyle(
	spec: TileJSONSpecificationVector,
	builderOption: { baseUrl?: string; glyphs?: string; sprite?: SpriteSpecification }
): StyleSpecification {
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

	layers.background.push({ id: 'background', type: 'background', paint: { 'background-color': '#fff' } });

	spec.vector_layers.forEach((vector_layer: VectorLayer) => {
		let luminosity = 'bright',
			saturation,
			hue;

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
		layers: [...layers.background, ...layers.fill, ...layers.line, ...layers.circle],
	};
}

function getRasterStyle(spec: TileJSONSpecificationRaster): StyleSpecification {
	const sourceName = 'rasterSource';
	return {
		version: 8,
		sources: {
			[sourceName]: sourceFromSpec(spec, 'raster'),
		},
		layers: [
			{
				id: 'raster',
				type: 'raster',
				source: sourceName,
			},
		],
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
