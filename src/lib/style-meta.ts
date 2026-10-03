import type { StyleSpecification } from '../types/index.js';

/** The styles are CC0, like the VersaTiles data they render. */
export const STYLE_LICENSE = 'https://creativecommons.org/publicdomain/zero/1.0/';

/**
 * The metadata every builder starts from. Typed as a concrete record rather than the spec's
 * `unknown`, so that the builders can spread it — each style gets its **own copy**, because `metadata`
 * is the one part of a built style a caller is likely to write to, and a shared constant turned that
 * into a process-wide edit affecting every later style in every schema.
 */
export const STYLE_METADATA: Record<string, unknown> = { license: STYLE_LICENSE };

/** Which builder a recorded set of options belongs to. */
export type StyleBuilder = 'osm' | 'satellite' | 'omt' | 'protomaps';

/**
 * The metadata keys that record what a style was built from.
 *
 * Namespaced, because `metadata` is a free-for-all in the style spec and other tooling writes there too.
 */
export const METADATA_BUILDER_KEY = 'versatiles:builder';
export const METADATA_OPTIONS_KEY = 'versatiles:options';
export const METADATA_VERSION_KEY = 'versatiles:metadataVersion';

/**
 * The shape of the recorded options, not the package version. A reader branches on this; bump it when
 * the meaning of what `styleMetadata` writes changes.
 */
export const METADATA_VERSION = 1;

/** What `readStyleOptions` recovered from a style. */
export interface StyleOptionsRecord {
	builder: StyleBuilder;
	/** The options as they were recorded — feed them back into the matching builder. */
	options: Record<string, unknown>;
	version: number;
}

const BUILDERS = new Set<string>(['osm', 'satellite', 'omt', 'protomaps']);

/**
 * Metadata recording the options a style was built from, so a tool can later read a finished style.json
 * back into the options that made it.
 *
 * **Opt-in, and deliberately not written by the builders themselves.** `osm()` and friends guarantee that
 * `osm(minimizeOptions(x))` builds the *identical* style to `osm(x)`; minimising drops representations
 * that resolve differently but render the same (a tint at amount 0, the `icons` alias), so baking the
 * options into the style would make that guarantee false and `src/api/minimize.test.ts` fail. It would
 * also add a copy of every option to every style built by every consumer, most of whom never read it back.
 *
 * So the caller that wants a round-trip asks for one — pass the *minimised* options, which is what such a
 * caller already holds:
 *
 * ```ts
 * const options = osm.minimizeOptions(myOptions);
 * const style = { ...osm(myOptions), metadata: styleMetadata('osm', options) };
 * ```
 *
 * Pass options only — never a resolved tree containing `urls`, whose `osm` field may be a whole
 * pre-fetched TileJSON, and which pins the style to the host that built it. URLs are environment, not
 * style: a reader supplies its own.
 */
export function styleMetadata(
	builder: StyleBuilder,
	options: object,
	base: StyleSpecification['metadata'] = STYLE_METADATA
): StyleSpecification['metadata'] {
	const { urls: _urls, ...rest } = options as Record<string, unknown>;
	return {
		...(base as Record<string, unknown>),
		[METADATA_VERSION_KEY]: METADATA_VERSION,
		[METADATA_BUILDER_KEY]: builder,
		[METADATA_OPTIONS_KEY]: rest,
	};
}

/**
 * The options a style records in its metadata, or `undefined` if it carries none — which is the case for
 * any style not written with {@link styleMetadata}, including every foreign style. Reconstructing options
 * from one of those is what `@versatiles/style/migrate` is for.
 *
 * Never throws: anything malformed reads as `undefined`.
 */
export function readStyleOptions(style: StyleSpecification): StyleOptionsRecord | undefined {
	const metadata = style.metadata as Record<string, unknown> | undefined;
	if (metadata == null || typeof metadata !== 'object') return undefined;

	const builder = metadata[METADATA_BUILDER_KEY];
	const options = metadata[METADATA_OPTIONS_KEY];
	if (typeof builder !== 'string' || !BUILDERS.has(builder)) return undefined;
	if (options == null || typeof options !== 'object' || Array.isArray(options)) return undefined;

	const version = metadata[METADATA_VERSION_KEY];
	return {
		builder: builder as StyleBuilder,
		options: options as Record<string, unknown>,
		version: typeof version === 'number' ? version : 0,
	};
}

/**
 * Style name, e.g. `versatiles-colorful` or `versatiles-gray-dark`.
 *
 * v5 published a distinct name per style (`versatiles-colorful`, `versatiles-graybeard`, …) and
 * tooling keys off it, so a single generic `versatiles` for every palette loses the distinction.
 */
export function styleName(palette: string): string {
	return `versatiles-${palette}`;
}
