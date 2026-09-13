import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import { assertTileJSONSpecification } from '../types/index.js';
import type { FetchLike, OsmUrlsOptions } from '../options/index.js';
import { DEFAULT_BASE, resolveOsmUrls, resolveText } from '../options/index.js';
import { loadTileSource, resolveTileJSONTiles, resolveUrl } from '../lib/index.js';
import { osm } from './osm.js';
import { checkKeys } from '../options/keys.js';
import { satellite } from './satellite.js';
import type { SchemaBuilder } from './schema-builder.js';

/**
 * Options for {@link guessStyle}.
 *
 * - `urls` — the same shape as for `osm()` and `satellite()`: `base` resolves relative URLs (`tiles`,
 *   glyphs, sprites) and defaults to the page origin, or tiles.versatiles.org outside a browser;
 *   `glyphsPattern` and `sprite` set where the guessed style loads fonts and icons from.
 * - `fetch` — used when `source` is a URL, as for `inlineSources()` and `fetchTileJSON()`.
 * - `schemas` — additional schemas to recognise, each the builder from its own subpath.
 *
 * ── Why `schemas` is an option and a registry was not ─────────────────────────
 *
 * SCHEMA-SUPPORT-PLAN.md §5.3, risk 10: auto-dispatch is the one thing one-function-per-subpath does not
 * get for free. `guessStyle` lives in the root entry, so importing every schema here would reintroduce
 * exactly the bundle cost that design avoids — a CDN user who never touches OpenMapTiles would still
 * download it. Injection keeps the cost with the caller who asked for it:
 *
 * ```ts
 * import { guessStyle } from '@versatiles/style';
 * import { omt } from '@versatiles/style/omt';
 * await guessStyle(tileJSON, { schemas: [omt] });
 * ```
 *
 * This is acceptable here precisely where a global registry was not (§5.2): `guessStyle` is already
 * async, already does runtime detection, already takes a function-valued option (`fetch`), and its
 * options never pass through `minimizeOptions`/`toCode`, so nothing here has to round-trip.
 *
 * The list is **additive**: Shortbread is always tried first, so passing `schemas` can only widen what
 * is recognised, never change what a tileset resolved to before.
 */
export type GuessStyleOptions = {
	urls?: Pick<OsmUrlsOptions, 'base' | 'glyphsPattern' | 'sprite'>;
	fetch?: FetchLike;
	schemas?: readonly SchemaBuilder[];
};

const SATELLITE_HINTS = new Set(['satellite', 'aerial', 'ortho', 'imagery']);

function isVectorTileJSON(tj: TileJSONSpecification): tj is TileJSONSpecificationVector {
	return 'vector_layers' in tj && Array.isArray((tj as TileJSONSpecificationVector).vector_layers);
}

/** A tileset must carry this many of a schema's source-layers to be recognised by count alone. */
const STRONG_MATCH_COUNT = 8;

/**
 * Does this tileset look like the given schema's?
 *
 * Recognised when **at least half** its source-layers are the schema's, or when it carries at least
 * `STRONG_MATCH_COUNT` of them outright. The candidate ids come from the schema's own vendored record
 * rather than a list kept by hand here, which is one fewer copy of a fact that has drifted before.
 *
 * ── Why not "3 or more", as this was ──────────────────────────────────────────
 *
 * Three is a low bar for a coincidence. Vendoring the Protomaps record showed it plainly: Protomaps
 * carries `boundaries`, `buildings` and `pois` — three generic names that Shortbread also uses, with
 * entirely different fields behind them — so a Protomaps tileset scored exactly 3 and was handed a full
 * 287-layer Shortbread style. Nearly every layer of it reads a source-layer the tiles do not have, and
 * the three that do read fields that are not there, so the result was a blank map where the inspector
 * style would have been useful.
 *
 * The two clauses cover the two honest cases. A **rate** test catches a tileset that is mostly this
 * schema, including a small extract of a handful of layers. A **count** test catches a tileset that is
 * this schema plus a pile of extra layers of its own, where the rate would fall below half. Protomaps
 * satisfies neither: 3 of 9 is 33%, and 3 is far short of 8.
 */
function looksLike(tj: TileJSONSpecificationVector, sourceLayers: readonly string[]): boolean {
	const ids = tj.vector_layers.map((l) => l.id);
	if (ids.length === 0) return false;
	const known = new Set(sourceLayers);
	const matches = ids.filter((id) => known.has(id)).length;
	return matches / ids.length >= 0.5 || matches >= STRONG_MATCH_COUNT;
}

// Deterministic hue from a string (djb2 hash → 0–359).
function stringToHue(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
	return Math.abs(h) % 360;
}

// Build a simple inspector style: one fill + one line + one symbol layer per source-layer,
// each with a unique hue derived from the layer name. Useful for visualising unknown vector tiles.
function buildInspectorStyle(tj: TileJSONSpecificationVector, urls: GuessStyleOptions['urls']): StyleSpecification {
	const base = urls?.base ?? DEFAULT_BASE;
	const sourceName = 'tiles';
	const sourceSpec: Record<string, unknown> = {
		type: 'vector',
		tiles: resolveTileJSONTiles(tj, base).tiles,
		scheme: tj.scheme ?? 'xyz',
	};
	if (tj.minzoom !== undefined) sourceSpec['minzoom'] = tj.minzoom;
	if (tj.maxzoom !== undefined) sourceSpec['maxzoom'] = tj.maxzoom;
	if (tj.bounds) sourceSpec['bounds'] = tj.bounds;
	if (tj.attribution) sourceSpec['attribution'] = tj.attribution;

	const layers: StyleSpecification['layers'] = [
		{
			id: 'background',
			type: 'background',
			paint: { 'background-color': '#f8f4f0' },
		} as StyleSpecification['layers'][number],
	];

	for (const vl of tj.vector_layers) {
		const hue = stringToHue(vl.id);
		const fillColor = `hsl(${hue}, 40%, 70%)`;
		const lineColor = `hsl(${hue}, 60%, 40%)`;

		layers.push({
			id: `${vl.id}-fill`,
			type: 'fill',
			source: sourceName,
			'source-layer': vl.id,
			paint: { 'fill-color': fillColor, 'fill-opacity': 0.4 },
		} as StyleSpecification['layers'][number]);

		layers.push({
			id: `${vl.id}-line`,
			type: 'line',
			source: sourceName,
			'source-layer': vl.id,
			paint: { 'line-color': lineColor, 'line-width': 1 },
		} as StyleSpecification['layers'][number]);

		layers.push({
			id: `${vl.id}-label`,
			type: 'symbol',
			source: sourceName,
			'source-layer': vl.id,
			layout: {
				'text-field': ['get', 'name'],
				'text-font': [resolveText().fontNormal],
				'text-size': 11,
				'text-max-width': 6,
			},
			paint: { 'text-color': lineColor, 'text-halo-color': '#fff', 'text-halo-width': 1 },
		} as StyleSpecification['layers'][number]);
	}

	return {
		version: 8,
		// the labels need glyphs: from `urls.glyphsPattern`, or the VersaTiles default, like osm()
		glyphs: resolveOsmUrls({ base: urls?.base, glyphsPattern: urls?.glyphsPattern }).glyphsPattern,
		sources: { [sourceName]: sourceSpec } as unknown as StyleSpecification['sources'],
		layers,
	};
}

// Build a minimal raster style for a raster TileJSON.
async function buildRasterStyle(
	source: string | TileJSONSpecification,
	tj: TileJSONSpecification,
	urls: GuessStyleOptions['urls']
): Promise<StyleSpecification> {
	const base = urls?.base ?? DEFAULT_BASE;
	const sourceName = isSatelliteHint(tj) ? 'satellite' : 'raster';
	const sourceSpec: Record<string, unknown> = {
		type: 'raster',
		tiles: resolveTileJSONTiles(tj, base).tiles,
		tileSize: (tj as TileJSONSpecification & { tile_size?: number }).tile_size ?? 256,
	};
	if (tj.minzoom !== undefined) sourceSpec['minzoom'] = tj.minzoom;
	if (tj.maxzoom !== undefined) sourceSpec['maxzoom'] = tj.maxzoom;
	if (tj.bounds) sourceSpec['bounds'] = tj.bounds;
	if (tj.attribution) sourceSpec['attribution'] = tj.attribution;

	if (isSatelliteHint(tj)) {
		return satellite({ urls: { ...urls, satellite: source } });
	}

	return {
		version: 8,
		sources: { [sourceName]: sourceSpec } as unknown as StyleSpecification['sources'],
		layers: [
			{
				id: 'background',
				type: 'background',
				paint: { 'background-color': '#000' },
			} as StyleSpecification['layers'][number],
			{
				id: sourceName,
				type: 'raster',
				source: sourceName,
			} as StyleSpecification['layers'][number],
		],
	};
}

function isSatelliteHint(tj: TileJSONSpecification): boolean {
	const name = ((tj as { name?: string }).name ?? '').toLowerCase();
	return SATELLITE_HINTS.has(name) || [...SATELLITE_HINTS].some((hint) => name.includes(hint));
}

/**
 * Inspect a tileset and return the most appropriate MapLibre style.
 *
 * `source` is either the URL of a TileJSON document, which is downloaded (relative `tiles` are
 * resolved against the document), or a TileJSON object the caller already holds — a tile server has
 * one in memory from its container's metadata — which is used without any network access (relative
 * `tiles` are resolved against `options.urls.base`). The caller's object is not modified.
 *
 * Styles by tileset:
 * - Shortbread vector tiles → full `osm()` style
 * - Vector tiles matching an injected schema (`options.schemas`) → that schema's style
 * - Unknown vector tiles → inspector style (one color-coded fill+line+label per source-layer)
 * - Raster tiles with satellite name hint → `satellite()` style
 * - Other raster tiles → minimal single-layer raster style
 *
 * Never throws — an invalid argument, a failed download or a malformed document all yield a
 * blank (but valid) StyleSpecification.
 */
export async function guessStyle(
	source: string | TileJSONSpecification,
	options?: GuessStyleOptions
): Promise<StyleSpecification> {
	// Everything is inside the try: the point of guessStyle is that it always yields a usable
	// style. A bad argument, an unreachable host, a malformed document — each falls back to a blank
	// style rather than surfacing. Previously the argument check and the download sat outside, so
	// the documented "never throws" contract was false for both.
	try {
		// An unknown option key is an invalid argument like any other: blank style, and no download.
		checkKeys(options, { urls: true, fetch: true, schemas: true }, 'guessStyle');
		checkKeys(options?.urls, { base: true, glyphsPattern: true, sprite: true }, 'guessStyle.urls');
		const urls = options?.urls;
		const base = urls?.base ?? DEFAULT_BASE;
		let tileJSON: TileJSONSpecification;
		// What osm()/satellite() receive: the URL, so the style references the document, or the resolved
		// object, so it is inlined — either way without a second download.
		let osmSource: string | TileJSONSpecification;

		if (typeof source === 'string') {
			if (!source) throw new TypeError('guessStyle: source must be a non-empty URL or a TileJSON object');
			const url = resolveUrl(base, source);
			tileJSON = await loadTileSource(url, options?.fetch);
			osmSource = url;
		} else if (source !== null && typeof source === 'object' && !Array.isArray(source)) {
			// resolve relative tiles against `base` on a copy, so the caller's object stays untouched
			tileJSON = resolveTileJSONTiles(source, base);
			osmSource = tileJSON;
		} else {
			throw new TypeError('guessStyle: source must be a non-empty URL or a TileJSON object');
		}

		assertTileJSONSpecification(tileJSON);
		if (isVectorTileJSON(tileJSON)) {
			// Shortbread first, then whatever the caller injected, in the order given.
			for (const schema of [osm, ...(options?.schemas ?? [])]) {
				if (looksLike(tileJSON, schema.tileset.sourceLayers)) return schema.tileset.build(osmSource, urls);
			}
			return buildInspectorStyle(tileJSON, urls);
		}
		return await buildRasterStyle(osmSource, tileJSON, urls);
	} catch {
		// A blank style is still a valid style: the map loads, and the caller sees an empty map
		// rather than an exception at style-build time.
		return { version: 8, sources: {}, layers: [] };
	}
}
