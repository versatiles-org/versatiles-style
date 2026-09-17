import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import { assertTileJSONSpecification } from '../types/index.js';
import type { OsmUrlsOptions } from '../options/index.js';
import { DEFAULT_BASE, DEFAULT_FONT_REGULAR, resolveOsmUrls, checkKeys } from '../options/index.js';
import { resolveTileJSONTiles } from '../lib/index.js';

/** Options for {@link inspectorStyle}. The same `urls` shape as `osm()`, minus what this never reads. */
export type InspectorStyleOptions = {
	urls?: Pick<OsmUrlsOptions, 'base' | 'glyphsPattern'>;
};

// Deterministic hue from a string (djb2 hash → 0–359).
//
// Per source-layer *name*, not per tileset: `water` is the same colour in every style this builds, so
// two tilesets can be compared side by side. The cost is that unrelated layers can land on the same
// hue; with 360 buckets that is a collision at about 25 layers, which is worth the stability.
function stringToHue(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
	return Math.abs(h) % 360;
}

/**
 * A colour-coded style that draws every source-layer of a vector tileset, whatever it contains.
 *
 * Each source-layer gets three layers — a translucent fill, a line, and a `name` label — in one hue
 * derived from its name, over a neutral background. Nothing is filtered and nothing is hidden, so
 * geometry shows up whichever type it turns out to be. This is what you want when the tiles are
 * unfamiliar, or when you are checking what a tileset actually carries rather than how it should look.
 *
 * It is the style {@link guessStyle} falls back to for vector tiles whose schema it cannot build, and
 * exporting it means you can ask for it deliberately — including for a tileset that *is* recognised,
 * where `guessStyle` would give you real cartography instead:
 *
 * ```ts
 * import { inspectorStyle } from '@versatiles/style';
 * const style = inspectorStyle(tileJSON); // raw source-layers, even for Shortbread tiles
 * ```
 *
 * Synchronous and performs no I/O, like `osm()` and `guessSchema()`: it takes a TileJSON **object**.
 * Pass a URL through {@link fetchTileJSON} first.
 *
 * Unlike `guessStyle`, this throws rather than returning a blank style — it is a builder, and you
 * asked for this style specifically, so a malformed tileset is an error rather than something to
 * paper over.
 *
 * @param tileJSON a vector TileJSON, i.e. one carrying `vector_layers`
 * @param options `urls.base` resolves relative tile URLs; `urls.glyphsPattern` says where the labels
 *   load fonts from. No `sprite`: nothing here places an icon.
 * @throws if `tileJSON` is not a valid TileJSON, carries no `vector_layers`, or `options` has an
 *   unknown key.
 */
export function inspectorStyle(tileJSON: TileJSONSpecification, options?: InspectorStyleOptions): StyleSpecification {
	checkKeys(options, { urls: true }, 'inspectorStyle');
	checkKeys(options?.urls, { base: true, glyphsPattern: true }, 'inspectorStyle.urls');
	assertTileJSONSpecification(tileJSON);

	if (!isVectorTileJSON(tileJSON)) {
		throw new Error(
			'inspectorStyle: expected a vector TileJSON with `vector_layers` — there is nothing to inspect in a ' +
				'raster tileset, whose tiles carry no named layers. Use `guessStyle` for raster sources.'
		);
	}

	const urls = options?.urls;
	const base = urls?.base ?? DEFAULT_BASE;
	const sourceName = 'tiles';
	const sourceSpec: Record<string, unknown> = {
		type: 'vector',
		tiles: resolveTileJSONTiles(tileJSON, base).tiles,
		scheme: tileJSON.scheme ?? 'xyz',
	};
	if (tileJSON.minzoom !== undefined) sourceSpec['minzoom'] = tileJSON.minzoom;
	if (tileJSON.maxzoom !== undefined) sourceSpec['maxzoom'] = tileJSON.maxzoom;
	if (tileJSON.bounds) sourceSpec['bounds'] = tileJSON.bounds;
	if (tileJSON.attribution) sourceSpec['attribution'] = tileJSON.attribution;

	const layers: StyleSpecification['layers'] = [
		{
			id: 'background',
			type: 'background',
			paint: { 'background-color': '#f8f4f0' },
		} as StyleSpecification['layers'][number],
	];

	for (const vl of tileJSON.vector_layers) {
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

/** Whether a TileJSON carries `vector_layers`. */
export function isVectorTileJSON(tj: TileJSONSpecification): tj is TileJSONSpecificationVector {
	return 'vector_layers' in tj && Array.isArray((tj as TileJSONSpecificationVector).vector_layers);
}
