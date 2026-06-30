// Types for the OMT↔Shortbread style-equivalence harness.
//
// The harness does NOT render tiles. Instead it asks, for a given real-world feature,
// "how is it encoded in OpenMapTiles vs Shortbread?" and then evaluates BOTH styles'
// filters + paint/layout expressions for that feature at a set of zoom levels, comparing
// the fully-resolved visual result. This sidesteps the fact that the two tile pipelines
// produce different geometry.

export type Geom = 'Point' | 'LineString' | 'Polygon';

/** How a single feature is represented in one schema (source-layer + attributes + geometry). */
export interface Rep {
	sourceLayer: string;
	geom: Geom;
	/** Feature attributes the style filters read (`class`, `kind`, `brunnel`, …). */
	properties?: Record<string, unknown>;
}

/** One real-world feature, declared in both schemas, to be styled-compared across zooms. */
export interface Case {
	name: string;
	band: string;
	/** OpenMapTiles representation (matched against `style.osm-bright.json`). */
	omt: Rep;
	/** Shortbread representation (matched against the generated `colorful` style). */
	shortbread: Rep;
	/** Zoom levels to compare at; defaults to DEFAULT_ZOOMS. */
	zooms?: number[];
	/** Diff substrings to treat as accepted divergences (out-of-scope per project decisions),
	 *  e.g. a feature Shortbread can't represent without new sprites/sources. Reported, not failed. */
	ignore?: string[];
}

export const DEFAULT_ZOOMS = [5, 8, 12, 15, 18];
