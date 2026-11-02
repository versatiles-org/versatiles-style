import { checkKeys } from './keys.js';
import { resolveUrl } from './resolve-url.js';
import type { TileJSONSpecification } from '../../types/index.js';
import { type SpriteEntries, resolveSprite } from './sprite.js';

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
	/**
	 * The land cover `features.landcover` draws. The same source as `osm` means it is merged into OSM's
	 * tiles. A TileJSON in `osm` that carries the land cover says so itself, and needs no `landcover`.
	 */
	landcover?: TileSource;
	elevation?: TileSource;
	glyphsPattern?: string;
	sprite?: SpriteEntries;
};

export type SatelliteUrlsOptions = Omit<OsmUrlsOptions, 'landcover'> & {
	satellite?: TileSource;
};

export type ResolvedOsmUrls = {
	osm: TileSource;
	landcover: TileSource;
	elevation: TileSource;
	glyphsPattern: string;
	sprite: SpriteEntries;
};

export type ResolvedSatelliteUrls = Omit<ResolvedOsmUrls, 'landcover'> & {
	satellite: TileSource;
};

type VectorLayerEntry = { id?: unknown; fields?: unknown; maxzoom?: number };

function vectorLayersOf(tileJSON: TileJSONSpecification): VectorLayerEntry[] {
	const layers = (tileJSON as { vector_layers?: unknown }).vector_layers;
	return Array.isArray(layers) ? (layers as VectorLayerEntry[]) : [];
}

/**
 * A tileset's land cover layer: `landcover`, with a `kind`. OpenMapTiles and Mapbox have a `landcover`
 * with a `class`, which isn't this, and Protomaps one with a `kind`, which `isMergedLandcover` and
 * `osm.supportsLandcover` tell apart by the layers around it.
 */
export function landcoverLayerOf(tileJSON: TileJSONSpecification): VectorLayerEntry | undefined {
	return vectorLayersOf(tileJSON).find(
		({ id, fields }) => id === 'landcover' && fields !== null && typeof fields === 'object' && 'kind' in fields
	);
}

/** Whether a tileset is the land cover on its own: its only layer. */
export function isLandcoverTileset(tileJSON: TileJSONSpecification): boolean {
	return landcoverLayerOf(tileJSON) !== undefined && vectorLayersOf(tileJSON).length === 1;
}

/** Whether a tileset is Shortbread with the land cover merged in. Protomaps has no `land` layer. */
export function isMergedLandcover(tileJSON: TileJSONSpecification): boolean {
	return landcoverLayerOf(tileJSON) !== undefined && vectorLayersOf(tileJSON).some(({ id }) => id === 'land');
}

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
/**
 * Resolve a tile source: a pre-fetched TileJSON object passes through, a URL (or the fallback) is made
 * absolute against `base`.
 *
 * Exported because each schema resolves its own URLs in its own directory — see the note on
 * `src/options/index.ts` about why per-schema option code does not live here.
 */
export function resolveTileSource(base: string, value: TileSource | undefined, fallback: string): TileSource {
	if (typeof value === 'object') return value;
	return resolveUrl(base, value ?? fallback);
}

export function resolveOsmUrls(urls?: OsmUrlsOptions, path = 'urls'): ResolvedOsmUrls {
	checkKeys(urls, { base: true, osm: true, landcover: true, elevation: true, glyphsPattern: true, sprite: true }, path);
	const base = urls?.base ?? DEFAULT_BASE;
	const osm = resolveTileSource(base, urls?.osm, '/tiles/osm/tiles.json');
	const merged = urls?.landcover === undefined && typeof osm === 'object' && isMergedLandcover(osm);
	return {
		osm,
		landcover: merged ? osm : resolveTileSource(base, urls?.landcover, '/tiles/landcover-vectors/tiles.json'),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
	};
}

export function resolveSatelliteUrls(urls?: SatelliteUrlsOptions, path = 'urls'): ResolvedSatelliteUrls {
	checkKeys(urls, { base: true, satellite: true, osm: true, elevation: true, glyphsPattern: true, sprite: true }, path);
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		satellite: resolveTileSource(base, urls?.satellite, '/tiles/satellite/tiles.json'),
		osm: resolveTileSource(base, urls?.osm, '/tiles/osm/tiles.json'),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
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
	};
}
