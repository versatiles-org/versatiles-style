import { resolveUrl } from '../lib/utils.js';
import type { SpriteInput } from './sprite.js';
import { resolveSprite } from './sprite.js';

/** A `fetch`-compatible function, used to download TileJSON documents. */
export type FetchLike = typeof fetch;

export type OsmUrlsOptions = {
	base?: string;
	osm?: string;
	elevation?: string;
	glyphsPattern?: string;
	sprite?: SpriteInput;
	/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

export type SatelliteUrlsOptions = OsmUrlsOptions & {
	satellite?: string;
};

export type ResolvedOsmUrls = {
	osm: string;
	elevation: string;
	glyphsPattern: string;
	sprite: SpriteInput;
	/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

export type ResolvedSatelliteUrls = ResolvedOsmUrls & {
	satellite: string;
};

export const DEFAULT_BASE = globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';

export function resolveBase(base?: string): string {
	return base ?? DEFAULT_BASE;
}

export function resolveOsmUrls(urls?: OsmUrlsOptions): ResolvedOsmUrls {
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		osm: resolveUrl(base, urls?.osm ?? '/tiles/osm/tiles.json'),
		elevation: resolveUrl(base, urls?.elevation ?? '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? '/assets/sprites/basics/sprites'),
		fetch: urls?.fetch,
	};
}

export function resolveSatelliteUrls(urls?: SatelliteUrlsOptions): ResolvedSatelliteUrls {
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		satellite: resolveUrl(base, urls?.satellite ?? '/tiles/satellite/tiles.json'),
		osm: resolveUrl(base, urls?.osm ?? '/tiles/osm/tiles.json'),
		elevation: resolveUrl(base, urls?.elevation ?? '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? '/assets/sprites/basics/sprites'),
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
