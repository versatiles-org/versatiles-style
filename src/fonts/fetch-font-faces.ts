import { checkKeys, DEFAULT_BASE, type FetchLike } from '../options/index.js';
import { resolveUrl } from '../options/index.js';

/**
 * One glyph face a server publishes, described for a font picker.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export type FontFaceInfo = {
	/** The glyph name — a value for a `font` in `text`, e.g. `'fira_sans_condensed_light_italic'`. */
	id: string;
	/** The family, e.g. `'Fira Sans'`. */
	family: string;
	/** A readable name, e.g. `'Fira Sans Condensed Light Italic'`. */
	title: string;
	/** The CSS weight, 100–900. */
	weight: number;
	italic: boolean;
	/** The CSS width: `'normal'`, `'condensed'`, `'extra-condensed'`, … */
	width: string;
	/** The 16-codepoint blocks the face covers, as the server publishes them; read by `fontCovers()`. */
	codeblocks: string;
};

const WEIGHT_NAMES: Readonly<Record<number, string>> = {
	100: 'Thin',
	200: 'ExtraLight',
	300: 'Light',
	400: 'Regular',
	500: 'Medium',
	600: 'SemiBold',
	700: 'Bold',
	800: 'ExtraBold',
	900: 'Black',
};

/** `normal` first, then narrow to wide, as CSS orders `font-stretch`. */
const WIDTH_ORDER = [
	'normal',
	'ultra-condensed',
	'extra-condensed',
	'condensed',
	'semi-condensed',
	'semi-expanded',
	'expanded',
	'extra-expanded',
	'ultra-expanded',
];

type RawFace = { id: string; style: string; weight: number; width: string; codeblocks: string };
type RawFamily = { name: string; faces: RawFace[] };

function isFamilies(value: unknown): value is RawFamily[] {
	return (
		Array.isArray(value) &&
		value.every(
			(family) =>
				typeof family?.name === 'string' &&
				Array.isArray(family.faces) &&
				(family.faces as unknown[]).every((face) => {
					const f = face as Partial<RawFace> | null;
					return (
						typeof f?.id === 'string' &&
						typeof f.style === 'string' &&
						typeof f.weight === 'number' &&
						typeof f.width === 'string' &&
						typeof f.codeblocks === 'string'
					);
				})
		)
	);
}

/** "Fira Sans Condensed Light Italic"; "Regular" is dropped before "Italic", as the font files name themselves. */
function titleOf(family: string, face: RawFace, italic: boolean): string {
	const width =
		face.width === 'normal'
			? []
			: [
					face.width
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' '),
				];
	const weight = WEIGHT_NAMES[face.weight] ?? String(face.weight);
	return [family, ...width, ...(italic && weight === 'Regular' ? [] : [weight]), ...(italic ? ['Italic'] : [])].join(
		' '
	);
}

function widthRank(width: string): number {
	const rank = WIDTH_ORDER.indexOf(width);
	return rank === -1 ? WIDTH_ORDER.length : rank;
}

/**
 * The URL of a glyph server's face list: `font_families.json` in the directory that holds the
 * `{fontstack}` folders. `undefined` when the pattern has no `{fontstack}` path segment to find it by.
 */
export function fontFamiliesUrl(glyphsPattern: string): string | undefined {
	const at = glyphsPattern.indexOf('/{fontstack}/');
	return at === -1 ? undefined : glyphsPattern.slice(0, at + 1) + 'font_families.json';
}

/**
 * The glyph faces a server publishes, for a font picker — sorted by family, width, weight and italic.
 *
 * `urls` resolves as in `osm()`: `glyphsPattern` (default `/assets/glyphs/{fontstack}/{range}.pbf`)
 * against `base` (default the page origin, or `https://tiles.versatiles.org`). The list is read from
 * `font_families.json` next to the `{fontstack}` folders, which VersaTiles glyph servers publish.
 *
 * Resolves to `undefined` when there is no list to read — a pattern without a `{fontstack}` segment, a
 * server that does not publish the file (any non-OK response), or a document that is not a face list —
 * so a UI can fall back to a free text field. Rejects only when the request itself fails.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export async function fetchFontFaces(
	urls?: { base?: string; glyphsPattern?: string },
	options?: { fetch?: FetchLike }
): Promise<FontFaceInfo[] | undefined> {
	checkKeys(urls, { base: true, glyphsPattern: true }, 'fetchFontFaces.urls');
	checkKeys(options, { fetch: true }, 'fetchFontFaces');
	const pattern = resolveUrl(
		urls?.base ?? DEFAULT_BASE,
		urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'
	);
	const url = fontFamiliesUrl(pattern);
	if (url === undefined) return undefined;

	// `.bind(globalThis)`, not a bare reference: in a browser, `fetch` called with no `this` of `Window`
	// throws `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation`. Node does not care,
	// which is why the tests never saw it. `cachingFetch` avoids this by calling `globalThis.fetch(…)`
	// as a method.
	const doFetch = options?.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!doFetch) throw new Error(`Cannot load "${url}": no fetch implementation available. Pass a \`fetch\` option.`);
	const response = await doFetch(url);
	if (!response.ok) return undefined;

	let families: unknown;
	try {
		families = await response.json();
	} catch {
		return undefined;
	}
	if (!isFamilies(families)) return undefined;

	const faces = families.flatMap((family) =>
		family.faces.map((face): FontFaceInfo => {
			const italic = face.style === 'italic' || face.style === 'oblique';
			return {
				id: face.id,
				family: family.name,
				title: titleOf(family.name, face, italic),
				weight: face.weight,
				italic,
				width: face.width,
				codeblocks: face.codeblocks,
			};
		})
	);
	return faces.sort(
		(a, b) =>
			a.family.localeCompare(b.family) ||
			widthRank(a.width) - widthRank(b.width) ||
			a.weight - b.weight ||
			Number(a.italic) - Number(b.italic)
	);
}
