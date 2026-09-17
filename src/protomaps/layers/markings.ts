import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Directional road markings for Protomaps. `oneway` is a field on `roads`; the reverse direction has no
// separate representation in the sampled data, so only the forward arrows are drawn — one layer where
// Shortbread and OpenMapTiles draw two.
const ONEWAY_KINDS: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['highway', 'major_road', 'minor_road']]];
const LINES: FilterSpecification = ['==', ['geometry-type'], 'LineString'];

export function* markings(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('marking-oneway', {
		sourceLayer: 'roads',
		filter: ['all', LINES, ['==', ['get', 'oneway'], true], ONEWAY_KINDS] as FilterSpecification,
		layout: {
			'symbol-placement': 'line',
			'symbol-spacing': 175,
			'icon-rotate': 90,
			'icon-rotation-alignment': 'map',
			'icon-padding': 5,
			'symbol-avoid-edges': true,
		},
		minzoom: 16,
		image: 'base:marking-oneway',
		color: ctx.fg,
		opacity: { 16: 0, 17: 0.4, 20: 0.4 },
		group: 'markings',
	});
}
