import Graybeard from './graybeard.js';
import type { StyleSpecification } from '../types/maplibre.js';
import type { Language } from '../style_builder/types.js';
import { resolveUrl } from '../lib/utils.js';
import { TileJSONSpecification } from '../types/tilejson.js';

export interface SatelliteStyleOptions {
	baseUrl?: string;
	rasterTilejson?: string;
	overlayTiles?: string[];
	overlay?: boolean;
	language?: Language;
	rasterOpacity?: number;
	rasterHueRotate?: number;
	rasterBrightnessMin?: number;
	rasterBrightnessMax?: number;
	rasterSaturation?: number;
	rasterContrast?: number;
	/** URL to elevation TileJSON. Defaults to `/tiles/elevation/tiles.json` if terrain or hillshade is enabled. */
	elevationTilejson?: string;
	/** Enable 3D terrain. `true` for defaults, or object for custom exaggeration. */
	terrain?: boolean | { exaggeration?: number };
	/** Enable hillshade layer. `true` for defaults, or object for custom paint properties. */
	hillshade?:
		| boolean
		| {
				shadowColor?: string;
				highlightColor?: string;
				accentColor?: string;
				illuminationDirection?: number;
				illuminationAnchor?: 'map' | 'viewport';
		  };
}

export async function buildSatelliteStyle(options?: SatelliteStyleOptions): Promise<StyleSpecification> {
	options ??= {};
	const baseUrl = options.baseUrl ?? 'https://tiles.versatiles.org';
	const overlay = options.overlay ?? true;

	let style: StyleSpecification;

	if (overlay) {
		// Generate graybeard style for overlay
		style = new Graybeard().build({
			baseUrl,
			tiles: options.overlayTiles,
			language: options.language,
		});

		// Filter out background, fill layers, and unwanted layer groups
		style.layers = style.layers.filter(
			(l) => l.id !== 'background' && l.type !== 'fill' && !/^(land|water|site|airport|tunnel)-/.test(l.id)
		);

		// Modify remaining layers
		for (const layer of style.layers) {
			if (layer.type === 'symbol') {
				// Bold font, white text, black halo
				if (layer.layout?.['text-font']) {
					layer.layout['text-font'] = ['noto_sans_bold'];
				}
				if (layer.paint) {
					layer.paint['text-color'] = '#fff';
					layer.paint['text-halo-color'] = '#000';
					if ('text-halo-blur' in layer.paint) layer.paint['text-halo-blur'] = 0;
					if ('text-halo-width' in layer.paint) layer.paint['text-halo-width'] = 1;
				}
			}

			if (layer.type === 'line' && layer.paint) {
				// Multiply existing opacity by 0.2
				const v = layer.paint['line-opacity'];
				if (v == null) {
					layer.paint['line-opacity'] = 0.2;
				} else if (typeof v === 'number') {
					layer.paint['line-opacity'] = v * 0.2;
				} else if (typeof v === 'object' && 'stops' in v) {
					(v as { stops: [number, number][] }).stops = (v as { stops: [number, number][] }).stops.map(
						(s: [number, number]): [number, number] => [s[0], s[1] * 0.2]
					);
				}
			}
		}
	} else {
		// Minimal style with no overlay
		style = { version: 8, sources: {}, layers: [] } as unknown as StyleSpecification;
	}

	// Build raster paint properties
	const rasterPaint: Record<string, number> = {};
	if (options.rasterOpacity != null) rasterPaint['raster-opacity'] = options.rasterOpacity;
	if (options.rasterHueRotate != null) rasterPaint['raster-hue-rotate'] = options.rasterHueRotate;
	if (options.rasterBrightnessMin != null) rasterPaint['raster-brightness-min'] = options.rasterBrightnessMin;
	if (options.rasterBrightnessMax != null) rasterPaint['raster-brightness-max'] = options.rasterBrightnessMax;
	if (options.rasterSaturation != null) rasterPaint['raster-saturation'] = options.rasterSaturation;
	if (options.rasterContrast != null) rasterPaint['raster-contrast'] = options.rasterContrast;

	// Add raster source
	const rasterTilejsonUrl = resolveUrl(baseUrl, options.rasterTilejson ?? '/tiles/satellite/tiles.json');
	const rasterTilejson = (await fetch(rasterTilejsonUrl).then((res) => res.json())) as TileJSONSpecification;
	if (rasterTilejson.tiles) {
		rasterTilejson.tiles = rasterTilejson.tiles.map((url) => resolveUrl(baseUrl, url));
	}
	style.sources.satellite = { ...rasterTilejson, type: 'raster' };

	// Add raster layer at bottom
	style.layers.unshift({
		id: 'satellite',
		type: 'raster',
		source: 'satellite',
		minzoom: 0,
		...(Object.keys(rasterPaint).length > 0 ? { paint: rasterPaint } : {}),
	} as StyleSpecification['layers'][number]);

	// Elevation source (for terrain and/or hillshade)
	const needsElevation = !!(options.terrain || options.hillshade);
	if (needsElevation) {
		const elevationTilejsonUrl = resolveUrl(baseUrl, options.elevationTilejson ?? '/tiles/elevation/tiles.json');
		const elevationTilejson = (await fetch(elevationTilejsonUrl).then((res) => res.json())) as TileJSONSpecification;
		if (elevationTilejson.tiles) {
			elevationTilejson.tiles = elevationTilejson.tiles.map((url) => resolveUrl(baseUrl, url));
		}
		style.sources.elevation = {
			attribution: elevationTilejson.attribution,
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
		console.log('Elevation source:', style.sources.elevation);
	}

	// 3D terrain
	if (options.terrain) {
		const terrainConfig = typeof options.terrain === 'object' ? options.terrain : {};
		style.terrain = { source: 'elevation', exaggeration: terrainConfig.exaggeration ?? 1 };
	}

	// Hillshade layer
	if (options.hillshade) {
		const hsConfig = typeof options.hillshade === 'object' ? options.hillshade : {};
		const paint: Record<string, unknown> = {};
		paint['hillshade-exaggeration'] = ['interpolate', ['linear'], ['zoom'], 5, 0, 10, 0.2];
		if (hsConfig.shadowColor != null) paint['hillshade-shadow-color'] = hsConfig.shadowColor;
		if (hsConfig.highlightColor != null) paint['hillshade-highlight-color'] = hsConfig.highlightColor;
		if (hsConfig.accentColor != null) paint['hillshade-accent-color'] = hsConfig.accentColor;
		if (hsConfig.illuminationDirection != null)
			paint['hillshade-illumination-direction'] = hsConfig.illuminationDirection;
		if (hsConfig.illuminationAnchor != null) paint['hillshade-illumination-anchor'] = hsConfig.illuminationAnchor;

		style.layers.splice(1, 0, {
			id: 'hillshade',
			type: 'hillshade',
			source: 'elevation',
			...(Object.keys(paint).length > 0 ? { paint } : {}),
		} as StyleSpecification['layers'][number]);
	}

	style.name = 'versatiles-satellite';

	return style;
}
