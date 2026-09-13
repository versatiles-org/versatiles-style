import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../dsl/context.js';
import * as b from '../dsl/index.js';

/**
 * Administrative boundary cartography, shared by every schema.
 *
 * 81 of 95 lines were identical between the two ports (§7 step 8). What differed was the source-layer
 * name and — the part worth stating loudly — **the value a flag carries when true**. Shortbread's
 * `disputed` and `maritime` are booleans; OpenMapTiles' are integers 0/1, so a copied
 * `['==', ['get', 'disputed'], true]` is simply false against a `1` and draws no disputed borders at
 * all, silently. The conformance suite cannot catch it either: the *field* exists, only its type
 * differs. Both live in `BoundaryVocabulary` so a third schema has to state which it uses.
 *
 * Each admin line is drawn as a light "casing" (halo) pass first, then the coloured line on top, so the
 * border stays legible over any background. Country/disputed share one (wider) casing + line width;
 * state is narrower. Widths grow from 0 at their appear zoom. `maritime` is a single blue line over the
 * water, no casing.
 */
export type BoundaryVocabulary = {
	/** The source-layer carrying administrative boundaries. */
	readonly sourceLayer: string;
	/** What `disputed` and `maritime` hold when set — `true` in Shortbread, `1` in OpenMapTiles. */
	readonly flagTrue: boolean | number;
	/**
	 * Field holding the administrative level. Shortbread and OpenMapTiles both call it `admin_level`;
	 * Protomaps puts the number in `kind_detail` and uses `kind` for a class name instead.
	 */
	readonly adminLevelField?: string;
	/**
	 * Whether the schema distinguishes maritime borders at all. Protomaps does not carry the field, and
	 * a filter on a field that does not exist evaluates to `undefined` and matches nothing — silently,
	 * which is the defect this whole suite exists to catch. So the layer is skipped rather than emitted
	 * with a filter that can never be true.
	 */
	readonly hasMaritime?: boolean;
};

const lineCap = 'round';
const lineJoin = 'round';

// Neither schema's boundary layer carries a `coastline` field, so the clause that used to test it was
// always true and has been removed.
function filters(vocab: BoundaryVocabulary) {
	const yes = vocab.flagTrue;
	const level = vocab.adminLevelField ?? 'admin_level';
	// Where there is no `maritime` field there is nothing to exclude either.
	const notMaritime: FilterSpecification[] = vocab.hasMaritime === false ? [] : [['!=', ['get', 'maritime'], yes]];
	return {
		COUNTRY: [
			'all',
			['==', ['get', level], 2],
			['!=', ['get', 'disputed'], yes],
			...notMaritime,
		] as FilterSpecification,
		DISPUTED: [
			'all',
			['==', ['get', level], 2],
			['==', ['get', 'disputed'], yes],
			...notMaritime,
		] as FilterSpecification,
		STATE: ['all', ['==', ['get', level], 4], ['!=', ['get', 'disputed'], yes], ...notMaritime] as FilterSpecification,
		MARITIME: [
			'all',
			['==', ['get', level], 2],
			['==', ['get', 'maritime'], yes],
			['!=', ['get', 'disputed'], yes],
		] as FilterSpecification,
	};
}

export function* boundaries(ctx: LayerContext, vocab: BoundaryVocabulary): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;
	const { COUNTRY, DISPUTED, STATE, MARITIME } = filters(vocab);

	// Casing (halo) and line widths, per the old style. Country/disputed share the wide curves; state
	// is narrower. All grow from 0 at their appear zoom.
	const countryCasingSize = { 0: 0, 3: 2, 10: 8 };
	const countryLineSize = { 0: 0, 3: 1, 10: 4 };
	const stateCasingSize = { 7: 0, 8: 2, 10: 4 };
	const stateLineSize = { 7: 0, 8: 1, 10: 2 };

	// The casing is the light background colour at 0.75 opacity — a faint halo behind the line.
	const casing = { sourceLayer: vocab.sourceLayer, color: c.background, opacity: 0.75, lineCap, lineJoin };

	// ── casings (drawn beneath all the coloured lines) ──
	yield b.line('boundary-country:outline', {
		...casing,
		filter: COUNTRY,
		size: countryCasingSize,
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-disputed:outline', {
		...casing,
		filter: DISPUTED,
		size: countryCasingSize,
		group: 'boundaries.country',
	});
	yield b.line('boundary-state:outline', {
		...casing,
		filter: STATE,
		size: stateCasingSize,
		group: 'boundaries.state',
	});

	// ── coloured lines ──
	// country: solid
	yield b.line('boundary-country', {
		sourceLayer: vocab.sourceLayer,
		filter: COUNTRY,
		color: c.boundary,
		size: countryLineSize,
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	// disputed: dashed
	yield b.line('boundary-country-disputed', {
		sourceLayer: vocab.sourceLayer,
		filter: DISPUTED,
		color: c.boundaryDisputed,
		size: countryLineSize,
		lineDasharray: [2, 1],
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	// state: solid, fades in over z7→8 (Shortbread serves admin-4 from z7)
	yield b.line('boundary-state', {
		sourceLayer: vocab.sourceLayer,
		filter: STATE,
		color: c.boundary,
		size: stateLineSize,
		appear: 7,
		lineCap,
		lineJoin,
		group: 'boundaries.state',
	});
	// maritime: deeper-blue solid line over the water; fades in over z4→5 (newer; not in the old style)
	if (vocab.hasMaritime !== false) {
		yield b.line('boundary-country-maritime', {
			sourceLayer: vocab.sourceLayer,
			filter: MARITIME,
			color: c.water.blend(0.03, fg),
			size: countryLineSize,
			appear: 4,
			lineCap,
			lineJoin,
			group: 'boundaries.country',
		});
	}
}
