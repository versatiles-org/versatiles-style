import type { StyleSpecification } from '../types/maplibre.js';
import type { TileJSONSpecification } from '../types/tilejson.js';
import { normalizeAttribution, resolveUrl } from './utils.js';

export type TerrainOption = boolean | { exaggeration?: number };

export type HillshadeOption =
	| boolean
	| {
			shadowColor?: string;
			highlightColor?: string;
			accentColor?: string;
			illuminationDirection?: number;
			illuminationAltitude?: number;
			exaggeration?: number;
			illuminationAnchor?: 'map' | 'viewport';
	  };

export interface ElevationOptions {
	/** Base URL used to resolve the elevation TileJSON URL. */
	baseUrl?: string;
	/** URL to elevation TileJSON. Defaults to `/tiles/elevation/tiles.json`. */
	elevationTilejson?: string;
	/** Enable 3D terrain. `true` for defaults, or object for custom exaggeration. */
	terrain?: TerrainOption;
	/** Enable hillshade layer. `true` for defaults, or object for custom paint properties. */
	hillshade?: HillshadeOption;
	/**
	 * Layer index at which to insert the hillshade layer.
	 * Defaults to just after the last fill/raster/background layer, so hillshade renders on top of
	 * land/water fills but below streets, buildings, and labels.
	 */
	hillshadeLayerIndex?: number;
}

function defaultHillshadeIndex(layers: StyleSpecification['layers']): number {
	let index = 0;
	for (let i = 0; i < layers.length; i++) {
		const t = layers[i].type;
		if (t === 'background' || t === 'fill' || t === 'raster') index = i + 1;
		else break;
	}
	return index;
}

/**
 * Adds a `raster-dem` elevation source plus optional 3D terrain and a hillshade layer to the given style.
 * Mutates and returns the style. If neither `terrain` nor `hillshade` is set, the style is returned unchanged.
 */
export async function applyElevation(
	style: StyleSpecification,
	options: ElevationOptions
): Promise<StyleSpecification> {
	if (!options.terrain && !options.hillshade) return style;

	const baseUrl = options.baseUrl ?? 'https://tiles.versatiles.org';
	const elevationTilejsonUrl = resolveUrl(baseUrl, options.elevationTilejson ?? '/tiles/elevation/tiles.json');
	const elevationTilejson = (await fetch(elevationTilejsonUrl).then((res) => res.json())) as TileJSONSpecification;
	if (elevationTilejson.tiles) {
		elevationTilejson.tiles = elevationTilejson.tiles.map((url) => resolveUrl(baseUrl, url));
	}

	style.sources.elevation = {
		attribution: elevationTilejson.attribution ? normalizeAttribution(elevationTilejson.attribution) : undefined,
		bounds: elevationTilejson.bounds,
		minzoom: elevationTilejson.minzoom,
		maxzoom: elevationTilejson.maxzoom,
		tiles: elevationTilejson.tiles,
		encoding: elevationTilejson.encoding,
		tileSize: elevationTilejson.tile_size ?? 512,
		type: 'raster-dem',
	};
	switch (elevationTilejson.tile_schema) {
		case 'dem/mapbox':
			style.sources.elevation.encoding = 'mapbox';
			break;
		case 'dem/terrarium':
			style.sources.elevation.encoding = 'terrarium';
			break;
	}

	if (options.terrain) {
		const terrainConfig = typeof options.terrain === 'object' ? options.terrain : {};
		style.terrain = { source: 'elevation', exaggeration: terrainConfig.exaggeration ?? 1 };
	}

	if (options.hillshade) {
		const hsConfig = typeof options.hillshade === 'object' ? options.hillshade : {};
		const paint: Record<string, unknown> = {};
		const illuminationDirection = hsConfig.illuminationDirection ?? 315;
		const illuminationAltitude = hsConfig.illuminationAltitude ?? 45;
		const illuminationAnchor = hsConfig.illuminationAnchor ?? 'map';
		paint['hillshade-exaggeration'] = hsConfig.exaggeration ?? 0.1;
		paint['hillshade-shadow-color'] = hsConfig.shadowColor ?? '#000000';
		paint['hillshade-highlight-color'] = hsConfig.highlightColor ?? '#ffffff';
		paint['hillshade-accent-color'] = hsConfig.accentColor ?? '#000000';
		paint['hillshade-illumination-direction'] = illuminationDirection;
		paint['hillshade-illumination-altitude'] = illuminationAltitude;
		paint['hillshade-illumination-anchor'] = illuminationAnchor;
		paint['hillshade-method'] = 'standard';

		// Sync the root light to match hillshade direction so fill-extrusion buildings and terrain shade consistently.
		// polar = 90 - altitude (MapLibre polar is from zenith; hillshade altitude is from horizon).
		style.light = { anchor: illuminationAnchor, position: [1.15, illuminationDirection, 90 - illuminationAltitude] };

		const insertAt = options.hillshadeLayerIndex ?? defaultHillshadeIndex(style.layers);
		style.layers.splice(insertAt, 0, {
			id: 'hillshade',
			type: 'hillshade',
			source: 'elevation',
			paint,
		} as StyleSpecification['layers'][number]);
	}

	return style;
}
