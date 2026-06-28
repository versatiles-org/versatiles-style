import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Directional / bicycle road markings (icon symbols placed along street lines).
// `marking-bicycle` has no styling rule — emitted with structural layout only.

const ONEWAY_KINDS: FilterSpecification = [
	'in',
	['get', 'kind'],
	['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']],
];

export function* markings(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('marking-oneway', {
		sourceLayer: 'streets',
		filter: ['all', ['==', ['get', 'oneway'], true], ONEWAY_KINDS] as FilterSpecification,
		layout: {
			'symbol-placement': 'line',
			'symbol-spacing': 175,
			'icon-rotate': 90,
			'icon-rotation-alignment': 'map',
			'icon-padding': 5,
			'symbol-avoid-edges': true,
		},
		minzoom: 16,
		image: 'basics:marking-arrow',
		opacity: { 16: 0, 17: 0.4, 20: 0.4 },
		font: ctx.fonts.normal,
		group: 'markings',
	});

	yield b.symbol('marking-oneway-reverse', {
		sourceLayer: 'streets',
		filter: ['all', ['==', ['get', 'oneway_reverse'], true], ONEWAY_KINDS] as FilterSpecification,
		layout: {
			'symbol-placement': 'line',
			'symbol-spacing': 75,
			'icon-rotate': -90,
			'icon-rotation-alignment': 'map',
			'icon-padding': 5,
			'symbol-avoid-edges': true,
		},
		minzoom: 16,
		image: 'basics:marking-arrow',
		opacity: { 16: 0, 17: 0.4, 20: 0.4 },
		font: ctx.fonts.normal,
		group: 'markings',
	});

	yield b.symbol('marking-bicycle', {
		sourceLayer: 'streets',
		filter: ['all', ['==', ['get', 'bicycle'], 'designated'], ['==', ['get', 'kind'], 'cycleway']],
		layout: { 'symbol-placement': 'line', 'symbol-spacing': 50 },
		group: 'markings',
	});
}
