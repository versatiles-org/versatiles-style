import {
	resolveColors,
	resolveHillshade,
	resolveLayerGroups,
	resolveIcon,
	resolveProjection,
	resolveRecolor,
	resolveSky,
	resolveSprite,
	resolveSun,
	resolveTerrain,
	resolveText,
	resolveTheme,
	resolveTileSource,
	DEFAULT_BASE,
	checkKeys,
	minimizeThemed,
	type HillshadeOptions,
	type OsmOverlayOptions,
	type ProjectionOptions,
	type ResolvedHillshade,
	type ResolvedOsmOverlay,
	type ResolvedProjection,
	type ResolvedSky,
	type ResolvedSun,
	type ResolvedTerrain,
	type SkyOptions,
	type SpriteEntries,
	type SunOptions,
	type TerrainOptions,
	type TileSource,
} from '../options/index.js';
import { resolveUrl } from '../options/index.js';

/**
 * Protomaps' options — in this directory, not in `src/options/`.
 *
 * Anything reachable from `src/index.ts` ships in the CDN bundle, and `src/options/index.js` is
 * reachable from it. Keeping this module here is what makes the per-schema bundle cost genuinely zero
 * rather than nearly zero: a caller who never imports `@versatiles/style/omt` downloads none of it.
 * See the note at the top of `src/options/index.ts`.
 *
 * The building blocks below all come from the shared option surface; only their assembly is per schema.
 */

/**
 * Protomaps URLs. Like OpenMapTiles, the vector source does not default relative to `base` — the
 * VersaTiles CDN serves Shortbread tiles — but unlike it there is no hosted endpoint to fall back
 * on either: Protomaps publishes a PMTiles archive and its docs discourage hotlinking the daily builds.
 * So `protomaps` has **no default**, normally a `pmtiles://` URL the MapLibre plugin resolves.
 */
export type ProtomapsUrlsOptions = {
	base?: string;
	protomaps?: TileSource;
	elevation?: TileSource;
	glyphsPattern?: string;
	sprite?: SpriteEntries;
};

export type ResolvedProtomapsUrls = {
	protomaps: TileSource;
	elevation: TileSource;
	glyphsPattern: string;
	sprite: SpriteEntries;
};

/**
 * The reference basemap, with the build date left in — deliberately **not** a working URL. Protomaps
 * publishes a PMTiles archive rather than a hosted tile endpoint, and its docs discourage hotlinking the
 * daily builds, so unlike OpenFreeMap there is nothing honest to default to.
 *
 * Resolving leaves the placeholder in place rather than throwing, so `protomaps.defaults` and
 * `minimizeOptions` still work — every other default is meaningful and worth being able to read.
 * `protomaps()` is where a missing URL is refused, because that is where it would otherwise produce a
 * style that quietly 404s.
 */
export const PROTOMAPS_PLACEHOLDER = 'pmtiles://https://build.protomaps.com/<YYYYMMDD>.pmtiles';

/**
 * A `pmtiles://` URL must not be resolved against a base.
 *
 * The convention nests a real URL inside the scheme — `pmtiles://https://host/x.pmtiles` — and `new URL()`
 * normalises the path of what it thinks is a `pmtiles:` URL, collapsing the inner `https://` to `https//`
 * and silently producing an address that cannot be fetched. It is absolute by construction anyway, so
 * the right handling is to leave it alone.
 */
function resolveArchive(base: string, value: TileSource | undefined): TileSource {
	// The placeholder is not an address either, and resolving it would stop `protomaps()` recognising it.
	if (value === undefined) return PROTOMAPS_PLACEHOLDER;
	if (typeof value === 'string' && value.startsWith('pmtiles://')) return value;
	return resolveTileSource(base, value, PROTOMAPS_PLACEHOLDER);
}

export function resolveProtomapsUrls(urls?: ProtomapsUrlsOptions, path = 'urls'): ResolvedProtomapsUrls {
	checkKeys(urls, { base: true, protomaps: true, elevation: true, glyphsPattern: true, sprite: true }, path);
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		protomaps: resolveArchive(base, urls?.protomaps),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
	};
}

/**
 * Protomaps features: the same set as `osm()`'s. `landcover` draws Protomaps' coarse low-zoom
 * `landcover` layer (z0–7), the counterpart of Shortbread's low-zoom landcover extension — and, as there,
 * it is off by default, so the three schemas draw the same map unless asked otherwise.
 */
export type ProtomapsFeaturesOptions = {
	terrain?: TerrainOptions;
	hillshade?: HillshadeOptions;
	/** Coarse land cover at low zoom, from Protomaps' `landcover` layer. Default: false. */
	landcover?: boolean;
	buildings?: 'flat' | 'extruded';
};

export type ResolvedProtomapsFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
	landcover: boolean;
	buildings: 'flat' | 'extruded';
};

export function resolveProtomapsFeatures(
	features?: ProtomapsFeaturesOptions,
	path = 'features'
): ResolvedProtomapsFeatures {
	checkKeys(features, { terrain: true, hillshade: true, landcover: true, buildings: true }, path);
	return {
		terrain: resolveTerrain(features?.terrain, `${path}.terrain`),
		hillshade: resolveHillshade(features?.hillshade, `${path}.hillshade`),
		landcover: features?.landcover ?? false,
		buildings: features?.buildings ?? 'flat',
	};
}

/**
 * Options for `omt()`.
 *
 * The third schema, and the same story as the second. They differ in exactly
 * one place, and the shared part — `theme`, `colors`, `recolor`, `layout`, `text`, `layers`, `features`, `sun`, `sky`,
 * `projection` — is identical, because the option vocabulary names concepts rather than layers:
 *
 *  - `urls.protomaps` replaces `urls.osm`, and has no default (see `PROTOMAPS_PLACEHOLDER`).
 *
 * The `layers` tree is the *same* tree: every group Shortbread controls is expressible here.
 */
export type ProtomapsOptions = OsmOverlayOptions & {
	urls?: ProtomapsUrlsOptions;
	features?: ProtomapsFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedProtomaps = ResolvedOsmOverlay & {
	urls: ResolvedProtomapsUrls;
	features: ResolvedProtomapsFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
};

export function resolveProtomaps(options?: ProtomapsOptions): ResolvedProtomaps {
	// Its own static, type-derived whitelist, as each schema has.
	checkKeys(
		options,
		{
			theme: true,
			layers: true,
			text: true,
			icon: true,
			colors: true,
			recolor: true,
			urls: true,
			features: true,
			sun: true,
			sky: true,
			projection: true,
		},
		'omt'
	);
	const theme = resolveTheme(options?.theme, undefined, 'protomaps.theme');
	const colors = resolveColors(theme, options?.colors, 'protomaps.colors');

	return {
		urls: resolveProtomapsUrls(options?.urls, 'protomaps.urls'),
		features: resolveProtomapsFeatures(options?.features, 'protomaps.features'),
		sun: resolveSun(options?.sun, 'protomaps.sun'),
		sky: resolveSky(options?.sky, 'protomaps.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'protomaps.layers'),
		text: resolveText(options?.text, 'protomaps.text'),
		icon: resolveIcon(options?.icon, 'protomaps.icon'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'protomaps.recolor'),
	};
}

/** The smallest `ProtomapsOptions` that builds the same style as `options`. */
export function minimizeProtomapsOptions(options: ProtomapsOptions = {}): ProtomapsOptions {
	resolveProtomaps(options); // rejects unknown keys; the resolved result is not needed
	return minimizeThemed(options, (theme) => resolveProtomaps({ theme }), 'colorful', {
		resolveUrls: resolveProtomapsUrls,
	});
}
