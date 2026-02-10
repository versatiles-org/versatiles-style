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

	style.name = 'versatiles-satellite';

	return style;
}
