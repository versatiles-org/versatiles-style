import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { TileJSONSpecificationVector } from '../types/index.js';
import type { OsmOptions, ResolvedOsm } from '../options/index.js';
import { colorOptionsKeys, resolveOsm } from '../options/index.js';
import { buildContext, buildStyleLayers, SLOT_IDS } from '../shortbread/index.js';
import { PALETTES, getPaletteColors } from '../themes/index.js';
import { applyRecolor } from '../color/index.js';
import {
	applyLayout,
	addTerrain,
	addHillshade,
	addLandcover,
	configure3DLighting,
	applySky,
	applyProjection,
} from '../features/index.js';
import { buildSourceDescriptor, STYLE_METADATA, styleName } from '../lib/index.js';
import { getLanguages } from '../lib/languages.js';
import { getFontGroupMap, getLayerGroupMap } from '../shortbread/layer-groups-map.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { LANDCOVER_LAYERS, LAND_APPEAR_MIN } from '../shortbread/layers/landcover.js';
import { minimizeOsmOptions } from '../options/minimize.js';
import { styleCode } from './code.js';
import type { SchemaDescriptor } from './schema-builder.js';

const SOURCE_NAME = 'versatiles-shortbread';

// ── Build base style from resolved options ────────────────────────────────────

// The base style skeleton (version, metadata, glyphs/sprite, Shortbread vector source).
// `osmSource` is the resolved OSM source: a tile URL template, or a TileJSON whose
// `tiles[]` have already been made absolute.
function buildBase(resolved: ResolvedOsm): StyleSpecification {
	const source = buildSourceDescriptor('vector', resolved.urls.osm) as StyleSpecification['sources'][string];

	const style: StyleSpecification = {
		version: 8,
		name: styleName(resolved.theme),
		metadata: STYLE_METADATA,
		glyphs: resolved.urls.glyphsPattern,
		sprite: resolved.urls.sprite as StyleSpecification['sprite'],
		sources: {
			[SOURCE_NAME]: source,
		},
		layers: [],
	};

	return style;
}

function supportsLandcover(tileJSON: TileJSONSpecification): boolean {
	const layers = (tileJSON as TileJSONSpecificationVector).vector_layers ?? [];
	const land = layers.find((layer) => layer.id === 'land');
	// Missing metadata counts as "no": a style with landcover fills and no data behind them is worse
	// than the plain Shortbread fade-ins.
	return land?.minzoom !== undefined && land.minzoom < LAND_APPEAR_MIN;
}

// ── Main osm() function ───────────────────────────────────────────────────────

function osmFn(options?: OsmOptions): StyleSpecification {
	const resolved = resolveOsm(options);

	// 1. Base style (template + URL configuration). No I/O: a URL becomes a source `url`
	//    that MapLibre resolves at map load; a pre-fetched TileJSON is inlined as-is.
	const style = buildBase(resolved);

	// 2+3+4. Build the decorated layer list (structure + theme colors/fonts) from per-group modules.
	// Each module gates its own layers on the resolved `layers:` option (carried in the context):
	// invisible layers are dropped, opacity is baked in.
	const ctx = buildContext(resolved);
	style.layers = buildStyleLayers(ctx) as StyleSpecification['layers'];

	// 5. Text/icon size scaling + symbol spacing
	applyLayout(style, resolved.layout);

	// 6. Optional features
	if (resolved.features.terrain !== false) {
		addTerrain(style, resolved.features.terrain, resolved.urls.elevation);
	}
	if (resolved.features.hillshade !== false) {
		addHillshade(style, resolved.features.hillshade, resolved.sun, resolved.urls.elevation);
	}
	if (resolved.features.landcover) {
		addLandcover(style, LANDCOVER_LAYERS);
	}

	configure3DLighting(style, resolved.sun);

	// Sky (rendered by MapLibre when the map is pitched / in globe projection).
	// The sky follows the palette: its `water` for the sky, its `background` for the horizon.
	if (resolved.sky) {
		applySky(style, { skyColor: resolved.colors.water, ...resolved.sky });
	}
	applyProjection(style, resolved.projection);

	// 7. Post-process: recolor
	if (resolved.recolor) {
		applyRecolor(style, resolved.recolor);
	}

	return style;
}

// ── Static properties ─────────────────────────────────────────────────────────

export const osm = Object.assign(osmFn, {
	/** All available palette names: five light themes, each followed by its `-dark` theme. */
	palettes: PALETTES,

	/** All color key names accepted by ColorsOptions. */
	colorKeys: colorOptionsKeys,

	/** Maps each `LayerGroupOptions` key to the layer IDs it controls. */
	get layerGroups() {
		return getLayerGroupMap();
	},

	/**
	 * Maps each font topic of `text.fonts` (`water.rivers`, `pois.transit`, …) to the text layer IDs it
	 * sets. Built from the same group tags as `layerGroups`.
	 */
	get fontGroups() {
		return getFontGroupMap();
	},

	/** Fully resolved defaults (theme: 'colorful'). */
	get defaults() {
		return resolveOsm();
	},

	/** Return a palette's resolved colors. */
	colors: getPaletteColors,

	/** Return the language codes available in a given TileJSON. */
	languages: getLanguages,

	/**
	 * Whether a tileset can back `features.landcover`: its `land` layer starts below the zoom where
	 * plain Shortbread's first land kind appears, so it carries the low-zoom landcover extension.
	 */
	supportsLandcover,

	/** Stable layer IDs for use as MapLibre `beforeId`. */
	slots: SLOT_IDS,

	/** How `guessStyle` recognises a Shortbread tileset and builds a style for it. */
	tileset: {
		id: 'shortbread',
		sourceLayers: Object.keys(SHORTBREAD_SCHEMA),
		// `osmFn`, not `osm`: referring to the exported const inside its own initialiser makes its type
		// circular, which TypeScript resolves by widening the whole statics object to `any`.
		build: (source, urls) => osmFn({ urls: { ...urls, osm: source } }),
	} satisfies SchemaDescriptor,

	/** Resolve raw OsmOptions to a fully validated ResolvedOsm. */
	resolveOptions: resolveOsm,

	/**
	 * The smallest options object that builds the same style: every value equal to its default is
	 * dropped, colours compared against the chosen palette. For storing a style in a URL or config.
	 */
	minimizeOptions: minimizeOsmOptions,

	/** A runnable `@versatiles/style` snippet for these options, minimised first. */
	toCode(options?: OsmOptions): string {
		return styleCode('osm', minimizeOsmOptions(options));
	},
} as const);
