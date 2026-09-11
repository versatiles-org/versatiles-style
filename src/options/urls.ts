import { checkKeys } from './keys.js';
import { resolveUrl } from '../lib/index.js';
import type { TileJSONSpecification } from '../types/index.js';
import type { SpriteEntries } from './sprite.js';
import { resolveSprite } from './sprite.js';

/**
 * A tile source: a URL string, or a TileJSON document the caller already holds.
 *
 * A string is a TileJSON URL unless it contains a `{z}` placeholder, in which case it
 * is a raw tile template. Pass an object (see `fetchTileJSON`) when the style must be
 * self-contained at build time, or when the source needs fields MapLibre cannot infer.
 */
export type TileSource = string | TileJSONSpecification;

/** A `fetch`-compatible function, used to download TileJSON documents. */
export type FetchLike = typeof fetch;

export type OsmUrlsOptions = {
	base?: string;
	osm?: TileSource;
	elevation?: TileSource;
	glyphsPattern?: string;
	sprite?: SpriteEntries;
	/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

export type SatelliteUrlsOptions = OsmUrlsOptions & {
	satellite?: TileSource;
};

export type ResolvedOsmUrls = {
	osm: TileSource;
	elevation: TileSource;
	glyphsPattern: string;
	sprite: SpriteEntries;
	/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

export type ResolvedSatelliteUrls = ResolvedOsmUrls & {
	satellite: TileSource;
};

/** Host that serves the default `/tiles/...` and `/assets/...` paths. */
const VERSATILES_HOST = 'https://tiles.versatiles.org';

/**
 * Base URL for every relative path in `urls`: the page origin when there is a usable one,
 * otherwise the VersaTiles host.
 *
 * `location.origin` cannot be trusted blindly. In a `srcdoc` or sandboxed iframe, a `data:`
 * document or a `file://` page it is the *string* `"null"` — not `null` — so a plain `??` never
 * reaches its fallback, and every `new URL(path, "null")` then throws
 * `TypeError: Invalid base URL`, killing the whole style build. Validate it instead of
 * defaulting on it. See issue #127.
 */
function resolveDefaultBase(): string {
	const origin = globalThis?.document?.location?.origin;
	if (!origin || origin === 'null') return VERSATILES_HOST;
	try {
		new URL(origin);
		return origin;
	} catch {
		return VERSATILES_HOST;
	}
}

export const DEFAULT_BASE = resolveDefaultBase();

export function resolveBase(base?: string): string {
	return base ?? DEFAULT_BASE;
}

/**
 * Resolve a tile source against `base`. A pre-fetched TileJSON is used as-is; only
 * strings are made absolute. This is what keeps style building free of I/O.
 */
function resolveTileSource(base: string, value: TileSource | undefined, fallback: string): TileSource {
	if (typeof value === 'object') return value;
	return resolveUrl(base, value ?? fallback);
}

export function resolveOsmUrls(urls?: OsmUrlsOptions, path = 'urls'): ResolvedOsmUrls {
	checkKeys(urls, { base: true, osm: true, elevation: true, glyphsPattern: true, sprite: true, fetch: true }, path);
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		osm: resolveTileSource(base, urls?.osm, '/tiles/osm/tiles.json'),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
		fetch: urls?.fetch,
	};
}

export function resolveSatelliteUrls(urls?: SatelliteUrlsOptions, path = 'urls'): ResolvedSatelliteUrls {
	checkKeys(
		urls,
		{ base: true, satellite: true, osm: true, elevation: true, glyphsPattern: true, sprite: true, fetch: true },
		path
	);
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		satellite: resolveTileSource(base, urls?.satellite, '/tiles/satellite/tiles.json'),
		osm: resolveTileSource(base, urls?.osm, '/tiles/osm/tiles.json'),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
		fetch: urls?.fetch,
	};
}

export function convertSatelliteUrlsToOsmUrls(urls: undefined | SatelliteUrlsOptions): undefined | OsmUrlsOptions {
	if (!urls) return undefined;
	return {
		base: urls.base,
		osm: urls.osm,
		elevation: urls.elevation,
		glyphsPattern: urls.glyphsPattern,
		sprite: urls.sprite,
		fetch: urls.fetch,
	};
}
