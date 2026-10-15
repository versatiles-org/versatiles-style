import { Color } from '../color/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { ResolvedLight } from '../options/index.js';
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

// Adds a raster-dem elevation source and a hillshade layer to the style. With a `light`, the hillshade
// takes its direction, altitude and — unless the deprecated `options.anchor` is set — whether it turns
// with the map, so it is lit from the same side as the fill-extrusion buildings, which
// `configure3DLighting` lights from `style.light`.
export function addHillshade(
	style: StyleSpecification,
	options: {
		exaggeration: number;
		shadowColor: string;
		highlightColor: string;
		accentColor: string;
		anchor?: 'map' | 'viewport';
	},
	light: ResolvedLight,
	elevation: string | TileJSONSpecification
) {
	style.sources ??= {};
	style.sources['elevation'] = buildElevationSource(elevation) as StyleSpecification['sources'][string];

	const layer = {
		id: 'hillshade',
		type: 'hillshade' as const,
		source: 'elevation',
		paint: {
			'hillshade-exaggeration': options.exaggeration,
			'hillshade-shadow-color': Color.parse(options.shadowColor).asString(),
			'hillshade-highlight-color': Color.parse(options.highlightColor).asString(),
			'hillshade-illumination-anchor': options.anchor ?? (light && !light.rotateWithMap ? 'viewport' : 'map'),
			// With a light, 'combined' — the one method that takes the light's altitude and leaves flat ground
			// clear. It and 'hillshade-illumination-altitude' are MapLibre 5.5.0+, so `light` + hillshade needs
			// that version. Without a light, 'standard' (the default, not written) keeps the style valid on
			// older versions; only it draws the accent colour.
			...(light
				? {
						'hillshade-method': 'combined',
						'hillshade-illumination-direction': light.direction,
						'hillshade-illumination-altitude': light.altitude,
					}
				: { 'hillshade-accent-color': Color.parse(options.accentColor).asString() }),
		},
	};

	const insertAt = hillshadeInsertIndex(style.layers);
	style.layers.splice(insertAt, 0, layer as StyleSpecification['layers'][number]);
}
