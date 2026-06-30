import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { CASES } from './cases.js';
import type { Case } from './types.js';
import { matchingLayerIndices } from './evaluate.js';

// Layer-order comparison.
//
// `colorful` (Shortbread) and `osm-bright.json` (OMT) share no layer names, so we can't diff layer
// lists directly. Instead we compare RELATIVE draw order: for each catalog feature we take the index
// of the topmost layer that paints it (draw order = array order, so a higher index draws on top),
// then check every PAIR of features stacks the same way in both styles — geometry- and schema-
// independent, like the rest of the harness, and exactly Kendall pairwise agreement.

const ORDER_ZOOM = 16; // high enough that every band — incl. buildings and labels — is present

// Top-level band relationships whose relative order legitimately differs between the two schemas, so
// an inversion there is structural — not a regression. Keyed by the two top-level bands sorted and
// joined with '|'. This is the order-comparison analogue of the per-case `ignore` list for styling:
// any inversion in a band-pair NOT listed here is flagged.
export const ACCEPTED_ORDER_DIFFS = new Set([
	// Land & water polygon fills barely overlap; their relative stacking is a schema artifact (e.g.
	// Shortbread draws `ocean` as the base layer, OMT folds oceans into the `water` layer on top).
	'landcover|landcover',
	'landcover|landuse',
	'landcover|water',
	'landuse|landuse',
	'landuse|water',
	'water|water',
	// Bridge / tunnel / surface interleaving differs (OMT `brunnel` ordering vs Shortbread's
	// bridge/tunnel flags), so road/rail/aeroway/ferry layers interleave differently.
	'aeroway|buildings',
	'aeroway|roads',
	'aeroway|transit',
	'rail|rail',
	'rail|transit',
	'roads|roads',
	'roads|transit',
	'transit|transit',
	// Overlay & label ordering (POI markers, boundaries, name labels, road markings).
	'boundaries|pois',
	'labels|labels',
	'markings|pois',
]);

function bandPair(a: Case, b: Case): string {
	return [a.band.split('.')[0], b.band.split('.')[0]].sort().join('|');
}

export interface OrderInversion {
	a: Case;
	b: Case;
	/** How `a` sits relative to `b` in OSM Bright; colorful does the opposite. */
	omt: 'above' | 'below';
	bandPair: string;
	accepted: boolean;
}

export interface CaseHeight {
	c: Case;
	omt: number | null;
	sb: number | null;
}

export interface OrderResult {
	zoom: number;
	comparablePairs: number;
	agreeingPairs: number;
	inversions: OrderInversion[];
	/** Inversions in a band-pair that is NOT in `ACCEPTED_ORDER_DIFFS` — i.e. real regressions. */
	unaccepted: OrderInversion[];
	/** Cases whose feature has no painting layer in one or both styles at `zoom` (excluded). */
	unmatched: { c: Case; inOmt: boolean; inColorful: boolean }[];
	heights: CaseHeight[];
}

// Topmost layer index covering the feature, or null if nothing paints it.
function topIndex(indices: number[]): number | null {
	return indices.length ? Math.max(...indices) : null;
}

export function compareLayerOrder(colorful: StyleSpecification, osmBright: StyleSpecification): OrderResult {
	const heights: CaseHeight[] = CASES.map((c) => ({
		c,
		omt: topIndex(matchingLayerIndices(osmBright, c.omt, ORDER_ZOOM)),
		sb: topIndex(matchingLayerIndices(colorful, c.shortbread, ORDER_ZOOM)),
	}));

	const unmatched = heights
		.filter((h) => h.omt === null || h.sb === null)
		.map((h) => ({ c: h.c, inOmt: h.omt !== null, inColorful: h.sb !== null }));

	const usable = heights.filter((h): h is { c: Case; omt: number; sb: number } => h.omt !== null && h.sb !== null);

	let comparablePairs = 0;
	let agreeingPairs = 0;
	const inversions: OrderInversion[] = [];
	for (let i = 0; i < usable.length; i++) {
		for (let j = i + 1; j < usable.length; j++) {
			const a = usable[i];
			const b = usable[j];
			const oOmt = Math.sign(a.omt - b.omt);
			const oSb = Math.sign(a.sb - b.sb);
			if (oOmt === 0 || oSb === 0) continue; // a tie in one style imposes no ordering constraint
			comparablePairs++;
			if (oOmt === oSb) {
				agreeingPairs++;
				continue;
			}
			const key = bandPair(a.c, b.c);
			inversions.push({
				a: a.c,
				b: b.c,
				omt: oOmt > 0 ? 'above' : 'below',
				bandPair: key,
				accepted: ACCEPTED_ORDER_DIFFS.has(key),
			});
		}
	}

	return {
		zoom: ORDER_ZOOM,
		comparablePairs,
		agreeingPairs,
		inversions,
		unaccepted: inversions.filter((i) => !i.accepted),
		unmatched,
		heights,
	};
}
