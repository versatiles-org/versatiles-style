import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/';

// Directional road markings (oneway arrows placed along street lines), ported for OpenMapTiles.
//
// Shortbread carries two booleans, `oneway` and `oneway_reverse`. OpenMapTiles carries one integer:
// `oneway: 1` for the digitisation direction and `oneway: -1` against it — both observed by
// `npm run schema-values -- omt transportation`. So the reverse arrows the gate's first pass wrote off
// ("there is no `oneway_reverse`") are expressible after all; they are the `-1` case.
//
// The class list loses nothing but granularity: Shortbread's `unclassified`, `residential` and
// `living_street` are all `minor` here. `LineString` is required because `transportation` also carries
// polygons, and a symbol layer would otherwise place arrows around pedestrian-square outlines.

const ONEWAY_CLASSES: FilterSpecification = [
	'in',
	['get', 'class'],
	['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'minor']],
];
const LINES: FilterSpecification = ['==', ['geometry-type'], 'LineString'];

/** Everything the two arrow layers share; only spacing, rotation and the `oneway` value differ. */
function arrow(ctx: LayerContext, direction: 1 | -1): b.DataBuildOpts {
	return {
		sourceLayer: 'transportation',
		filter: ['all', LINES, ['==', ['get', 'oneway'], direction], ONEWAY_CLASSES] as FilterSpecification,
		layout: {
			'symbol-placement': 'line',
			// The reverse arrows keep Shortbread's tighter spacing; see that module.
			'symbol-spacing': direction === 1 ? 175 : 75,
			'icon-rotate': direction === 1 ? 90 : -90,
			'icon-rotation-alignment': 'map',
			'icon-padding': 5,
			'symbol-avoid-edges': true,
		},
		minzoom: 16,
		image: 'base:marking-oneway',
		// SDF arrow tinted to fg (black in light / white in dark) so it adapts to dark mode.
		color: ctx.fg,
		opacity: { 16: 0, 17: 0.4, 20: 0.4 },
		group: 'markings',
	};
}

export function* markings(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('marking-oneway', arrow(ctx, 1));
	yield b.symbol('marking-oneway-reverse', arrow(ctx, -1));
}
