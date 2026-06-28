import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { MaplibreLayer } from '../types/index.js';
import type { OsmOptions } from '../types/index.js';
import type { TileJSONSpecificationVector } from '../types/index.js';
import type { ResolvedLayout, ResolvedOsmOptions } from '../types/index.js';
import type { LayerGroupOptions } from '../types/index.js';
import type { StyleRules } from '../style_builder/types.js';
import { colorOptionsKeys } from '../types/index.js';
import { getShortbreadTemplate, getShortbreadLayers, layerGroups, SLOT_IDS } from '../shortbread/index.js';
import { buildThemeRules, PALETTES, getPaletteColors } from '../themes/index.js';
import { decorate } from '../style_builder/decorator.js';
import { CachedRecolor } from '../style_builder/recolor.js';
import { applyRecolor } from '../color/recolor.js';
import { addTerrain, addHillshade, addLandcover, addBuildings3D } from '../features/index.js';
import { resolveOsmOptions } from '../resolve/index.js';

const SOURCE_NAME = 'versatiles-shortbread';

// ── Build base style from resolved options ────────────────────────────────────

function buildBase(resolved: ResolvedOsmOptions): StyleSpecification {
	const style = getShortbreadTemplate();

	style.glyphs = resolved.urls.glyphsPattern;
	style.sprite = resolved.urls.sprite as StyleSpecification['sprite'];

	const source = style.sources[SOURCE_NAME] as Record<string, unknown>;
	if (typeof resolved.urls.osm === 'string') {
		source['tiles'] = [resolved.urls.osm];
	} else {
		const tj = resolved.urls.osm as TileJSONSpecification;
		source['tiles'] = tj.tiles;
		if (tj.minzoom !== undefined) source['minzoom'] = tj.minzoom;
		if (tj.maxzoom !== undefined) source['maxzoom'] = tj.maxzoom;
		if (tj.bounds) source['bounds'] = tj.bounds;
		if (tj.attribution) source['attribution'] = tj.attribution;
	}

	return style;
}

// ── Build layer list with source name ─────────────────────────────────────────

function buildLayers(resolved: ResolvedOsmOptions): MaplibreLayer[] {
	const { language, languageStrict } = resolved.text;
	return getShortbreadLayers({ language, languageStrict }).map((def) => {
		if (def.type === 'background') return def as MaplibreLayer;
		return { source: SOURCE_NAME, ...def } as MaplibreLayer;
	});
}

// ── Apply theme rules (colors + fonts) to layers ─────────────────────────────

function applyTheme(style: StyleSpecification, resolved: ResolvedOsmOptions): StyleSpecification {
	const rules = buildThemeRules(resolved.colors, {
		normal: resolved.text.fontNormal,
		bold: resolved.text.fontBold,
	});
	const result = structuredClone(style);
	// decorate mutates matched layers in place; unmatched layers are left unchanged.
	// CachedRecolor with no args is a no-op — recolor is applied as a separate step.
	decorate(result.layers as MaplibreLayer[], rules as unknown as StyleRules, new CachedRecolor());
	return result;
}

// ── Apply layer group visibility / opacity ────────────────────────────────────

type LayerOverride = { visible: boolean; opacity?: number };

function collectGroupOverrides(group: unknown, opt: unknown, result: Map<string, LayerOverride>): void {
	if (opt === undefined) return;

	if (Array.isArray(group)) {
		const ids = group as string[];
		if (opt === false || opt === 0) {
			ids.forEach((id) => result.set(id, { visible: false }));
		} else if (opt === true || opt === 1) {
			ids.forEach((id) => result.delete(id));
		} else if (typeof opt === 'number') {
			ids.forEach((id) => result.set(id, { visible: true, opacity: opt }));
		}
		return;
	}

	if (typeof group === 'object' && group !== null) {
		const groupObj = group as Record<string, unknown>;
		if (typeof opt === 'boolean' || typeof opt === 'number') {
			for (const child of Object.values(groupObj)) {
				collectGroupOverrides(child, opt, result);
			}
		} else if (typeof opt === 'object' && opt !== null) {
			const optObj = opt as Record<string, unknown>;
			for (const [key, child] of Object.entries(groupObj)) {
				if (key in optObj) collectGroupOverrides(child, optObj[key], result);
			}
		}
	}
}

function setLayerOpacity(layer: { type: string; paint?: unknown }, opacity: number): void {
	const paint = (layer.paint ?? {}) as Record<string, unknown>;
	switch (layer.type) {
		case 'fill':
			paint['fill-opacity'] = opacity;
			break;
		case 'line':
			paint['line-opacity'] = opacity;
			break;
		case 'symbol':
			paint['text-opacity'] = opacity;
			paint['icon-opacity'] = opacity;
			break;
		case 'background':
			paint['background-opacity'] = opacity;
			break;
		case 'fill-extrusion':
			paint['fill-extrusion-opacity'] = opacity;
			break;
		case 'raster':
			paint['raster-opacity'] = opacity;
			break;
	}
	layer.paint = paint as typeof layer.paint;
}

function applyLayerGroups(style: StyleSpecification, opts: LayerGroupOptions): StyleSpecification {
	if (!opts || Object.keys(opts).length === 0) return style;

	const overrides = new Map<string, LayerOverride>();

	// Process icons alias first (least specific), then individual groups override it
	if (opts.icons !== undefined) collectGroupOverrides(layerGroups.icons, opts.icons, overrides);

	const groups = layerGroups as unknown as Record<string, unknown>;
	const optsObj = opts as Record<string, unknown>;
	for (const key of [
		'land',
		'water',
		'roads',
		'transit',
		'buildings',
		'sites',
		'airport',
		'pois',
		'boundaries',
		'markings',
		'labels',
	]) {
		if (key in optsObj) collectGroupOverrides(groups[key], optsObj[key], overrides);
	}

	if (overrides.size === 0) return style;

	const result = structuredClone(style);
	for (const layer of result.layers as Array<{ id: string; type: string; layout?: unknown; paint?: unknown }>) {
		const override = overrides.get(layer.id);
		if (!override) continue;

		if (!override.visible) {
			layer.layout = { ...(layer.layout as Record<string, unknown>), visibility: 'none' };
		} else if (override.opacity !== undefined) {
			setLayerOpacity(layer, override.opacity);
		}
	}
	return result;
}

// ── Apply text/icon scale ─────────────────────────────────────────────────────

function applyScale(style: StyleSpecification, layout: ResolvedLayout): StyleSpecification {
	const labelScale = layout.labels.scale;
	const iconScale = layout.icons.scale;
	if (labelScale === 1 && iconScale === 1) return style;

	const result = structuredClone(style);
	for (const layer of result.layers) {
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
	return result;
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

function osmFn(options?: OsmOptions): StyleSpecification {
	const resolved = resolveOsmOptions(options);

	// 1. Base style (template + URL configuration)
	let style = buildBase(resolved);

	// 2. Layer list with source name and language-aware name fields
	style.layers = buildLayers(resolved) as StyleSpecification['layers'];

	// 3. Theme: apply colors and fonts from the resolved palette
	style = applyTheme(style, resolved);

	// 4. Layer group visibility / opacity
	style = applyLayerGroups(style, resolved.layers);

	// 5. Text and icon size scaling
	style = applyScale(style, resolved.layout);

	// 6. Optional features
	if (resolved.features.terrain !== false) {
		style = addTerrain(style, resolved.features.terrain, resolved.urls.elevation);
	}
	if (resolved.features.hillshade !== false) {
		style = addHillshade(style, resolved.features.hillshade, resolved.sun, resolved.urls.elevation);
	}
	if (resolved.features.landcover) {
		style = addLandcover(style);
	}
	if (resolved.features.buildings === 'extruded') {
		style = addBuildings3D(style, {}, resolved.sun);
	}

	// 7. Post-process: recolor
	if (resolved.recolor) {
		style = applyRecolor(style, resolved.recolor);
	}

	return style;
}

// ── Static properties ─────────────────────────────────────────────────────────

export const osm = Object.assign(osmFn, {
	/** All available palette names. */
	palettes: PALETTES,

	/** All color key names accepted by ColorsOptions. */
	colorKeys: colorOptionsKeys,

	/** Registry mapping each LayerGroupOptions key to its layer IDs. */
	layerGroups,

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

	/** Resolve raw OsmOptions to a fully validated ResolvedOsmOptions. */
	resolveOptions: resolveOsmOptions,
} as const);
