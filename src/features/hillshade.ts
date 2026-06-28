import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { ResolvedSun } from '../types/index.js';
import { buildElevationSource } from './elevation-source.js';

// Inserts a hillshade layer after the last fill/raster/background layer so it renders
// on top of land fills but below streets, buildings, and labels.
function hillshadeInsertIndex(layers: StyleSpecification['layers']): number {
	let index = 0;
	for (let i = 0; i < layers.length; i++) {
		const t = layers[i].type;
		if (t === 'background' || t === 'fill' || t === 'raster') index = i + 1;
		else break;
	}
	return index;
}

// Adds a raster-dem elevation source and a hillshade layer to the style.
// Also syncs style.light to match the sun direction so fill-extrusion buildings
// shade consistently with the hillshade.
// Returns a structuredClone of the style with hillshade added.
export function addHillshade(
	style: StyleSpecification,
	options: {
		exaggeration: number;
		shadowColor: string;
		highlightColor: string;
		accentColor: string;
		anchor: 'map' | 'viewport';
	},
	sun: ResolvedSun,
	elevation: string | TileJSONSpecification
): StyleSpecification {
	const result = structuredClone(style);
	result.sources ??= {};
	result.sources['elevation'] = buildElevationSource(elevation) as StyleSpecification['sources'][string];

	// MapLibre polar angle = 90° − altitude (polar is from zenith; altitude is from horizon).
	result.light = {
		anchor: options.anchor,
		position: [1.15, sun.direction, 90 - sun.altitude],
		...(sun.color && { color: sun.color }),
		...(sun.intensity !== undefined && { intensity: sun.intensity }),
	};

	const layer = {
		id: 'hillshade',
		type: 'hillshade' as const,
		source: 'elevation',
		paint: {
			'hillshade-exaggeration': options.exaggeration,
			'hillshade-shadow-color': options.shadowColor,
			'hillshade-highlight-color': options.highlightColor,
			'hillshade-accent-color': options.accentColor,
			'hillshade-illumination-direction': sun.direction,
			'hillshade-illumination-altitude': sun.altitude,
			'hillshade-illumination-anchor': options.anchor,
			'hillshade-method': 'standard',
		},
	};

	const insertAt = hillshadeInsertIndex(result.layers);
	result.layers.splice(insertAt, 0, layer as StyleSpecification['layers'][number]);
	return result;
}
