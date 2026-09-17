import { loadTileSource } from '../lib/index.js';
import { resolveUrl } from '../options/index.js';
import { fetchFontFaces } from '../lib/fetchFontFaces.js';
import { checkKeys, type FetchLike } from '../options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { deriveOptions, type OptionsGuess } from './derive.js';
import { diagnostic, sortDiagnostics, type Diagnostic } from './diagnostics.js';

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
 * source-layers the style reads — and is reported in `report.diagnostics`. Never throws: an invalid
 * argument or an unreachable style yields `kind: 'unknown'` with the reason in the warnings.
 */
export async function guessOptions(
	style: string | StyleSpecification,
	options?: GuessOptionsOptions
): Promise<OptionsGuess> {
	// Collected before `deriveOptions` runs, then merged into the report it returns — this half knows
	// about the network, that half about the style.
	const diagnostics: Diagnostic[] = [];
	try {
		try {
			checkKeys(options, { fetch: true, base: true }, 'guessOptions');
		} catch (error) {
			throw new BadOption(message(error));
		}
		// Bound, not a bare reference: a detached `fetch` throws `Illegal invocation` in a browser, and
		// `guessOptions` is plausibly browser-side — it is what a style editor calls to import a map.
		const fetchFn = options?.fetch ?? globalThis.fetch.bind(globalThis);

		let document: StyleSpecification;
		let styleUrl = options?.base;
		if (typeof style === 'string') {
			styleUrl = options?.base ? resolveUrl(options.base, style) : style;
			const response = await fetchFn(styleUrl);
			if (!response.ok) throw new FetchFailed(styleUrl, response.status);
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
					const cause = message(error);
					diagnostics.push(
						diagnostic(
							'source.tilejsonUnavailable',
							`source "${id}": TileJSON not loaded (${cause}); its schema was read from the style instead`,
							{ sourceId: id, url: source.url, cause },
							{ origin: { sourceId: id } }
						)
					);
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
		return {
			...guess,
			report: { ...guess.report, diagnostics: sortDiagnostics([...diagnostics, ...guess.report.diagnostics]) },
		} as OptionsGuess;
	} catch (error) {
		const cause = message(error);
		const fatal =
			error instanceof BadOption
				? diagnostic('input.badOption', cause, { cause })
				: error instanceof FetchFailed
					? diagnostic('input.fetchFailed', cause, { url: error.url, status: error.status })
					: diagnostic('input.unreadable', `the style could not be read: ${cause}`, { cause });
		return {
			kind: 'unknown',
			report: { diagnostics: sortDiagnostics([...diagnostics, fatal]), provenance: {}, sources: [], evidence: [] },
		};
	}
}

/** An option `guessOptions` does not have — distinguished so the diagnostic can say which it was. */
class BadOption extends Error {}

/** The style document itself could not be fetched; the status is worth reporting. */
class FetchFailed extends Error {
	constructor(
		readonly url: string,
		readonly status: number
	) {
		super(`failed to fetch style "${url}": HTTP ${status}`);
	}
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
