import { loadTileSource } from '../lib/';
import { resolveUrl } from '../options/';
import { fetchFontFaces } from '../lib/fetchFontFaces.js';
import { checkKeys, type FetchLike } from '../options/';
import type { StyleSpecification, TileJSONSpecification } from '../types/';
import { deriveOptions, type GuessReport, type OptionsGuess } from './derive.js';

export type GuessOptionsOptions = {
	/** Used for the style document and every source's TileJSON; defaults to `globalThis.fetch`. */
	fetch?: FetchLike;
	/** Resolves a relative style URL; relative TileJSON URLs resolve against the style's own URL. */
	base?: string;
};

/**
 * The asynchronous half of {@link deriveOptions}: downloads the style when given its URL, the TileJSON of
 * every vector source that references one, and the font list of the glyph server the options will use —
 * `osm()`'s default, via `fetchFontFaces()` — and derives the options from all three. Without a font
 * list, fonts carry over their weight only.
 *
 * A TileJSON that cannot be downloaded is not fatal — the schema is then recognised from the
 * source-layers the style reads — and is reported in `report.warnings`. Never throws: an invalid
 * argument or an unreachable style yields `kind: 'unknown'` with the reason in the warnings.
 */
export async function guessOptions(
	style: string | StyleSpecification,
	options?: GuessOptionsOptions
): Promise<OptionsGuess> {
	const warnings: string[] = [];
	try {
		checkKeys(options, { fetch: true, base: true }, 'guessOptions');
		const fetchFn = options?.fetch ?? globalThis.fetch;

		let document: StyleSpecification;
		let styleUrl = options?.base;
		if (typeof style === 'string') {
			styleUrl = options?.base ? resolveUrl(options.base, style) : style;
			const response = await fetchFn(styleUrl);
			if (!response.ok) throw new Error(`failed to fetch style "${styleUrl}": HTTP ${response.status}`);
			document = (await response.json()) as StyleSpecification;
		} else if (style !== null && typeof style === 'object') {
			document = style;
		} else {
			throw new TypeError('style must be a URL or a style object');
		}

		const tileJSONs: Record<string, TileJSONSpecification> = {};
		const sources = document && typeof document.sources === 'object' ? Object.entries(document.sources) : [];
		await Promise.all(
			sources.map(async ([id, source]) => {
				if (source.type !== 'vector' || typeof source.url !== 'string') return;
				let url: string;
				try {
					url = styleUrl ? resolveUrl(styleUrl, source.url) : source.url;
					if (!/^https?:/.test(url)) throw new Error(`"${source.url}" is not an http(s) URL`);
					tileJSONs[id] = await loadTileSource(url, fetchFn);
				} catch (error) {
					warnings.push(`source "${id}": TileJSON not loaded (${message(error)}); schema read from the style`);
				}
			})
		);

		// The glyph server of `osm()`'s default URLs: the options carry no `urls`, so that is where they load
		// fonts from. Its font list is optional, so a failure is not reported here; `deriveOptions` names
		// the fonts it could not carry over.
		const fontNames = await fetchFontFaces(undefined, { fetch: fetchFn }).then(
			(faces) => faces?.map((face) => face.id),
			() => undefined
		);

		const guess = deriveOptions(document, tileJSONs, fontNames);
		guess.report.warnings.unshift(...warnings);
		return guess;
	} catch (error) {
		const report: GuessReport = {
			sources: [],
			evidence: [],
			unmatched: [],
			warnings: [...warnings, `guessOptions: ${message(error)}`],
		};
		return { kind: 'unknown', report };
	}
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
