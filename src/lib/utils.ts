/**
 * Attribution string canonicalization.
 *
 * This module also held `deepClone`, `deepMerge`, `isSimpleObject`, `isBasicType` and `basename`,
 * none of which anything called — they were carried over from v5 and re-exported from the barrel but
 * never reached a public entry. Each had defects of its own (`deepMerge`'s own-property guard was a
 * no-op, `isSimpleObject` threw on a null-prototype object), so they were removed rather than fixed.
 */

/**
 * Canonicalizes an attribution string so that two semantically identical attributions
 * (e.g. one with single-quoted attributes, the other double-quoted) become byte-identical.
 * MapLibre's attribution control deduplicates by exact string equality, so applying this
 * before writing into a style source lets the control collapse cosmetic duplicates.
 *
 * Three transformations:
 *   - trim leading/trailing whitespace
 *   - collapse internal whitespace runs to single spaces
 *   - rewrite `attr='value'` to `attr="value"` (HTML standard form)
 *
 * Upstream TileJSONs are inconsistent — the satellite source serves `href='…'` while OSM and
 * elevation serve `href="…"` — so a style inlining several sources would otherwise show mixed
 * quoting in one attribution bar. Purely cosmetic; the markup is otherwise untouched.
 *
 * The attribute pattern matches a single `\w` rather than `\w+`: the capture is echoed back
 * unchanged, so one preceding word character gives identical output. `\w+` there is ambiguous
 * with no left anchor, making the match quadratic on long runs of word characters — and an
 * attribution can arrive from a fetched TileJSON (CodeQL js/polynomial-redos).
 */
export function normalizeAttribution(s: string): string {
	return s
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/(\w)='([^']*)'/g, '$1="$2"');
}
