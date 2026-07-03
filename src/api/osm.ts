import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { TileJSONSpecificationVector } from '../types/index.js';
import type { OsmOptions, ResolvedLayout, ResolvedOsm } from '../options/index.js';
import { colorOptionsKeys, resolveOsmOptions } from '../options/index.js';
import { buildContext, buildStyleLayers, SLOT_IDS } from '../shortbread/index.js';
import { PALETTES, getPaletteColors } from '../themes/index.js';
import { applyRecolor } from '../color/recolor.js';
import { addTerrain, addHillshade, addLandcover, configure3DLighting } from '../features/index.js';
import { loadTileSource } from '../lib/loadTileSource.js';

const SOURCE_NAME = 'versatiles-shortbread';

// ── Build base style from resolved options ────────────────────────────────────

// The base style skeleton (version, metadata, glyphs/sprite, Shortbread vector source).
// `osmSource` is the resolved OSM source: a tile URL template, or a TileJSON whose
// `tiles[]` have already been made absolute.
function buildBase(resolved: ResolvedOsm, osmSource: TileJSONSpecification): StyleSpecification {
	const tj = osmSource;
	const source: StyleSpecification['sources'][string] = { type: 'vector', tiles: tj.tiles, url: resolved.urls.osm };

	if (tj.minzoom !== undefined) source.minzoom = tj.minzoom;
	if (tj.maxzoom !== undefined) source.maxzoom = tj.maxzoom;
	if (tj.bounds) source.bounds = tj.bounds;
	if (tj.attribution) source.attribution = tj.attribution;

	const style: StyleSpecification = {
		version: 8,
		name: 'versatiles',
		metadata: { license: 'https://creativecommons.org/publicdomain/zero/1.0/' },
		glyphs: resolved.urls.glyphsPattern,
		sprite: resolved.urls.sprite as StyleSpecification['sprite'],
		sources: {
			[SOURCE_NAME]: source,
		},
		layers: [],
	};

	return style;
}

// ── Apply text/icon scale ─────────────────────────────────────────────────────

function applyScale(style: StyleSpecification, layout: ResolvedLayout) {
	const labelScale = layout.scale.labels;
	const iconScale = layout.scale.icons;
	if (labelScale === 1 && iconScale === 1) return;

	for (const layer of style.layers) {
		if (layer.type !== 'symbol') continue;
		const lyt = layer.layout as Record<string, unknown> | undefined;
		if (!lyt) continue;

		if (labelScale !== 1) {
			const size = lyt['text-size'] as unknown;
			if (typeof size === 'number') {
				lyt['text-size'] = size * labelScale;
			} else if (Array.isArray(size) && size[0] === 'interpolate') {
				for (let i = 4; i < size.length; i += 2) {
					if (typeof size[i] === 'number') (size as unknown[])[i] = (size[i] as number) * labelScale;
				}
			}
		}

		if (iconScale !== 1 && lyt['icon-image'] != null) {
			const size = lyt['icon-size'] as unknown;
			if (size == null) {
				lyt['icon-size'] = iconScale;
			} else if (typeof size === 'number') {
				lyt['icon-size'] = size * iconScale;
			} else if (Array.isArray(size) && size[0] === 'interpolate') {
				for (let i = 4; i < size.length; i += 2) {
					if (typeof size[i] === 'number') (size as unknown[])[i] = (size[i] as number) * iconScale;
				}
			}
		}
	}
}

// ── Languages introspection helper ────────────────────────────────────────────

function getLanguages(tileJSON: TileJSONSpecification): string[] {
	const langs = new Set<string>();
	const vl = (tileJSON as TileJSONSpecificationVector).vector_layers ?? [];
	for (const layer of vl) {
		for (const key of Object.keys(layer.fields ?? {})) {
			if (key.startsWith('name_')) langs.add(key.slice(5));
		}
	}
	return [...langs].sort();
}

// ── Main osm() function ───────────────────────────────────────────────────────

async function osmFn(options?: OsmOptions): Promise<StyleSpecification> {
	const resolved = resolveOsmOptions(options);

	// Prefetch the TileJSON sources actually used by this style, in parallel.
	// Elevation is only needed (and fetched once, then reused) for terrain/hillshade.
	const needElevation = resolved.features.terrain !== false || resolved.features.hillshade !== false;
	const [osmSource, elevationSource] = await Promise.all([
		loadTileSource(resolved.urls.osm, resolved.urls.fetch),
		needElevation ? loadTileSource(resolved.urls.elevation, resolved.urls.fetch) : Promise.resolve(undefined),
	]);

	// 1. Base style (template + URL configuration)
	const style = buildBase(resolved, osmSource);

	// 2+3+4. Build the decorated layer list (structure + theme colors/fonts) from per-group modules.
	// Each module gates its own layers on the resolved `layers:` option (carried in the context):
	// invisible layers are dropped, opacity is baked in.
	const ctx = buildContext(resolved);
	style.layers = buildStyleLayers(ctx) as StyleSpecification['layers'];

	// 5. Text and icon size scaling
	applyScale(style, resolved.layout);

	// 6. Optional features
	if (resolved.features.terrain !== false) {
		addTerrain(style, resolved.features.terrain, elevationSource!);
	}
	if (resolved.features.hillshade !== false) {
		addHillshade(style, resolved.features.hillshade, resolved.sun, elevationSource!);
	}
	if (resolved.features.landcover) {
		addLandcover(style);
	}

	if (resolved.features.hillshade !== false || resolved.features.buildings === 'extruded') {
		configure3DLighting(style, resolved.sun);
	}

	// 7. Post-process: recolor
	if (resolved.recolor) {
		applyRecolor(style, resolved.recolor);
	}

	return style;
}

// ── Static properties ─────────────────────────────────────────────────────────

export const osm = Object.assign(osmFn, {
	/** All available palette names. */
	palettes: PALETTES,

	/** All color key names accepted by ColorsOptions. */
	colorKeys: colorOptionsKeys,

	/** Fully resolved defaults (palette: 'colorful', darkMode: false). */
	get defaults() {
		return resolveOsmOptions();
	},

	/** Return the palette's resolved colors for a given mode. */
	colors: getPaletteColors,

	/** Return the language codes available in a given TileJSON. */
	languages: getLanguages,

	/** Stable layer IDs for use as MapLibre `beforeId`. */
	slots: SLOT_IDS,

	/** Resolve raw OsmOptions to a fully validated ResolvedOsm. */
	resolveOptions: resolveOsmOptions,
} as const);
