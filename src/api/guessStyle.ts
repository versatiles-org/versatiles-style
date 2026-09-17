import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import { assertTileJSONSpecification } from '../types/index.js';
import type { FetchLike, OsmUrlsOptions } from '../options/';
import { DEFAULT_BASE, DEFAULT_FONT_REGULAR, resolveOsmUrls } from '../options/';
import { loadTileSource, resolveTileJSONTiles } from '../lib/index.js';
import { resolveUrl } from '../options/';
import { osm } from './osm.js';
import { checkKeys } from '../options/';
import { satellite } from './satellite.js';
import type { SchemaBuilder } from './schema-builder.js';
import { guessSchema, qualifies } from './guessSchema.js';
import { SCHEMA_NAMES } from '../lib/';

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
 * The list is **additive**: which built-in schema a tileset is comes from `guessSchema`, which does not
 * depend on `schemas` at all — injecting `omt` only decides whether a tileset already detected as
 * OpenMapTiles gets its style or the inspector style. A schema of the caller's own (any other
 * `tileset.id`) is tried after that, by its `sourceLayers`, in the order given.
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

/** Whether a caller's own schema — one `guessSchema` does not know — looks like this tileset. */
function looksLike(tj: TileJSONSpecificationVector, sourceLayers: readonly string[]): boolean {
	const known = new Set(sourceLayers);
	return qualifies(tj.vector_layers.filter((l) => known.has(l.id)).length, tj.vector_layers.length);
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
				'text-font': [DEFAULT_FONT_REGULAR],
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
 * - OpenMapTiles or Protomaps vector tiles, with that schema injected (`options.schemas`) → its style
 * - Vector tiles matching a caller's own injected schema → that schema's style
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
			const builders = [osm, ...(options?.schemas ?? [])];
			// A built-in schema is recognised by `guessSchema`, and built only if its builder is at hand:
			// Shortbread always, the others when injected.
			const guess = guessSchema(tileJSON);
			const detected = guess.type === 'vector' && builders.find((b) => b.tileset.id === guess.schema);
			if (detected) return detected.tileset.build(osmSource, urls);
			// A caller's own schema, in the order given.
			for (const builder of builders) {
				if ((SCHEMA_NAMES as readonly string[]).includes(builder.tileset.id)) continue;
				if (looksLike(tileJSON, builder.tileset.sourceLayers)) return builder.tileset.build(osmSource, urls);
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
