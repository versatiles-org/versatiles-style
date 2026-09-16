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
} from '../options/';
import { minimizeThemed } from '../options/minimize.js';
import { resolveUrl } from '../lib/utils.js';

/**
 * OpenMapTiles' options — in this directory, not in `src/options/`.
 *
 * Anything reachable from `src/index.ts` ships in the CDN bundle, and `src/options/index.js` is
 * reachable from it. Keeping this module here is what makes the per-schema bundle cost genuinely zero
 * rather than nearly zero: a caller who never imports `@versatiles/style/omt` downloads none of it.
 * See the note at the top of `src/options/index.ts`.
 *
 * The building blocks below all come from the shared option surface; only their assembly is per schema.
 */

/**
 * OpenMapTiles URLs. `omt` replaces `osm` as the vector tile source, and unlike every other URL here it
 * does **not** default relative to `base`: the VersaTiles CDN serves Shortbread tiles, so there is no
 * OpenMapTiles tileset behind it (SCHEMA-SUPPORT-PLAN.md §5.5). Glyphs, sprites and elevation still come
 * from `base` — those are the style's own assets, not the tileset's.
 */
export type OmtUrlsOptions = {
	base?: string;
	omt?: TileSource;
	elevation?: TileSource;
	glyphsPattern?: string;
	sprite?: SpriteEntries;
};

export type ResolvedOmtUrls = {
	omt: TileSource;
	elevation: TileSource;
	glyphsPattern: string;
	sprite: SpriteEntries;
};

/**
 * OpenFreeMap: unmodified OpenMapTiles, no API key, no request limits, commercial use allowed. Used as
 * the default so `omt()` builds a working style with no arguments, exactly as `osm()` does. Attribution
 * comes from the tileset's own TileJSON.
 */
const DEFAULT_OMT_TILES = 'https://tiles.openfreemap.org/planet';

export function resolveOmtUrls(urls?: OmtUrlsOptions, path = 'urls'): ResolvedOmtUrls {
	checkKeys(urls, { base: true, omt: true, elevation: true, glyphsPattern: true, sprite: true }, path);
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		omt: resolveTileSource(base, urls?.omt, DEFAULT_OMT_TILES),
		elevation: resolveTileSource(base, urls?.elevation, '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? [{ id: 'base', url: '/assets/sprites/base' }]),
	};
}

/**
 * OpenMapTiles features: the OSM set minus `landcover`, which exists for the Shortbread low-zoom
 * landcover extension and has no counterpart here. Leaving it out means
 * `omt({ features: { landcover: true } })` throws rather than silently doing nothing (§5.3, risk 3).
 */
export type OmtFeaturesOptions = {
	terrain?: TerrainOptions;
	hillshade?: HillshadeOptions;
	buildings?: 'flat' | 'extruded';
};

export type ResolvedOmtFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
	buildings: 'flat' | 'extruded';
};

export function resolveOmtFeatures(features?: OmtFeaturesOptions, path = 'features'): ResolvedOmtFeatures {
	checkKeys(features, { terrain: true, hillshade: true, buildings: true }, path);
	return {
		terrain: resolveTerrain(features?.terrain, `${path}.terrain`),
		hillshade: resolveHillshade(features?.hillshade, `${path}.hillshade`),
		buildings: features?.buildings ?? 'flat',
	};
}

/**
 * Options for `omt()`.
 *
 * §19 predicted that per-schema group trees would make `OmtOptions` and `OsmOptions` diverge and
 * multiply the work for downstream UI tools. In the event they differ in exactly two places, and the
 * shared part — `theme`, `colors`, `recolor`, `layout`, `text`, `layers`, `sun`, `sky`, `projection` —
 * is identical, because the option vocabulary names concepts rather than layers (§2):
 *
 *  - `urls.omt` replaces `urls.osm`, and does not default relative to `base` (§5.5);
 *  - `features` has no `landcover`, a Shortbread tileset extension.
 *
 * The `layers` tree is the *same* tree: every group Shortbread controls is expressible here.
 */
export type OmtOptions = OsmOverlayOptions & {
	urls?: OmtUrlsOptions;
	features?: OmtFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedOmt = ResolvedOsmOverlay & {
	urls: ResolvedOmtUrls;
	features: ResolvedOmtFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
};

export function resolveOmt(options?: OmtOptions): ResolvedOmt {
	// Its own static, type-derived whitelist, as each schema has (§5.1.3).
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
	const theme = resolveTheme(options?.theme, undefined, 'omt.theme');
	const colors = resolveColors(theme, options?.colors, 'omt.colors');

	return {
		urls: resolveOmtUrls(options?.urls, 'omt.urls'),
		features: resolveOmtFeatures(options?.features, 'omt.features'),
		sun: resolveSun(options?.sun, 'omt.sun'),
		sky: resolveSky(options?.sky, 'omt.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'omt.layers'),
		text: resolveText(options?.text, 'omt.text'),
		icon: resolveIcon(options?.icon, 'omt.icon'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'omt.recolor'),
	};
}

/** The smallest `OmtOptions` that builds the same style as `options`. */
export function minimizeOmtOptions(options: OmtOptions = {}): OmtOptions {
	resolveOmt(options); // rejects unknown keys; the resolved result is not needed
	return minimizeThemed(options, (theme) => resolveOmt({ theme }), 'colorful', { resolveUrls: resolveOmtUrls });
}
