import type { StyleSpecification } from '../types/index.js';
import { colorOptionsKeys } from '../options/index.js';
import {
	minimizeProtomapsOptions,
	resolveProtomaps,
	PROTOMAPS_PLACEHOLDER,
	type ProtomapsOptions,
	type ResolvedProtomaps,
} from './options.js';
import { PALETTES, getPaletteColors } from '../themes/index.js';
import { applyRecolor } from '../color/index.js';
import {
	addTerrain,
	addHillshade,
	configure3DLighting,
	applySky,
	applyProjection,
	applyLayout,
} from '../features/index.js';
import { buildSourceDescriptor, STYLE_METADATA, styleName } from '../lib/index.js';
import { getLanguages } from '../lib/languages.js';
import { styleCode } from '../api/code.js';
import type { SchemaDescriptor } from '../api/schema-builder.js';
import { PROTOMAPS_SCHEMA } from './schema.js';
import { buildContext } from './context.js';
import {
	buildStyleLayers,
	SLOT_BELOW_FILLS,
	SLOT_BELOW_STREETS,
	SLOT_BELOW_SYMBOLS,
	SLOT_BELOW_LABELS,
} from './layers/index.js';
import { getFontGroupMap, getLayerGroupMap } from './layer-groups-map.js';

/**
 * `protomaps()` — the Protomaps counterpart of `osm()`, exported from `@versatiles/style/protomaps`.
 *
 * SCHEMA-SUPPORT-PLAN.md §5.3: one function per schema, one subpath each, no registry. What that buys,
 * restated here because each point is a property of *this* file:
 *
 *  - **Bundle**: the browser entry imports `src/index.ts`, which does not import this module, so an
 *    Protomaps style cannot end up in the CDN bundle. No build flag decides that — the import graph
 *    does (verified by a test in `src/index.test.ts`).
 *  - **Purity**: no registration, no global state. `protomaps(options)` is a function of its argument.
 *  - **Validation**: `resolveProtomaps` carries its own static, type-derived `checkKeys` whitelist, so the
 *    "cannot drift" guarantee survives per schema rather than being weakened into one shared list.
 *  - **Codegen**: `protomaps.toCode()` emits the subpath import, so its output runs where it is pasted.
 */

const SOURCE_NAME = 'protomaps';

/** Stable layer IDs for use as MapLibre `beforeId` — the same four anchors every schema must emit (§6). */
const SLOT_IDS = {
	belowFills: SLOT_BELOW_FILLS,
	belowStreets: SLOT_BELOW_STREETS,
	belowSymbols: SLOT_BELOW_SYMBOLS,
	belowLabels: SLOT_BELOW_LABELS,
} as const;

function buildBase(resolved: ResolvedProtomaps): StyleSpecification {
	const source = buildSourceDescriptor('vector', resolved.urls.protomaps) as StyleSpecification['sources'][string];
	return {
		version: 8,
		name: styleName(resolved.theme),
		metadata: STYLE_METADATA,
		glyphs: resolved.urls.glyphsPattern,
		sprite: resolved.urls.sprite as StyleSpecification['sprite'],
		sources: { [SOURCE_NAME]: source },
		layers: [],
	};
}

function protomapsFn(options?: ProtomapsOptions): StyleSpecification {
	const resolved = resolveProtomaps(options);

	// The one schema with no default tileset: Protomaps ships a PMTiles archive rather than a hosted
	// endpoint, and its docs discourage hotlinking the daily builds. Refusing here rather than in the
	// resolver keeps `protomaps.defaults` and `minimizeOptions` usable, and turns what would be a style
	// that silently 404s into an error naming the fix.
	if (resolved.urls.protomaps === PROTOMAPS_PLACEHOLDER) {
		throw new Error(
			'protomaps: urls.protomaps is required — Protomaps publishes a PMTiles archive, not a hosted tile ' +
				'endpoint, so there is no default. Pass the archive you serve, e.g. ' +
				`"${PROTOMAPS_PLACEHOLDER}".`
		);
	}

	const style = buildBase(resolved);

	const ctx = buildContext(resolved);
	style.layers = buildStyleLayers(ctx) as StyleSpecification['layers'];

	applyLayout(style, resolved.layout);

	if (resolved.features.terrain !== false) {
		addTerrain(style, resolved.features.terrain, resolved.urls.elevation);
	}
	if (resolved.features.hillshade !== false) {
		addHillshade(style, resolved.features.hillshade, resolved.sun, resolved.urls.elevation);
	}
	// No `addLandcover`: Protomaps' coarse low-zoom band is its own `landcover` layer, emitted by the
	// landcover module when `features.landcover` is on (see `layers/landcover.ts`).

	configure3DLighting(style, resolved.sun);

	if (resolved.sky) {
		applySky(style, { skyColor: resolved.colors.water, ...resolved.sky });
	}
	applyProjection(style, resolved.projection);

	if (resolved.recolor) {
		applyRecolor(style, resolved.recolor);
	}

	return style;
}

export const protomaps = Object.assign(protomapsFn, {
	/** All available palette names — the palettes are schema-neutral, so these are `osm`'s (§6). */
	palettes: PALETTES,

	/** All color key names accepted by ColorsOptions. Some are inert under this schema. */
	colorKeys: colorOptionsKeys,

	/** Maps each `LayerGroupOptions` key to the layer IDs it controls, for *this* schema's layers. */
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
		return resolveProtomaps();
	},

	/** Return a palette's resolved colors. */
	colors: getPaletteColors,

	/** The language codes available in a given TileJSON — both `name_xx` and `name:xx`. */
	languages: getLanguages,

	/** Stable layer IDs for use as MapLibre `beforeId`. */
	slots: SLOT_IDS,

	/**
	 * How `guessStyle` recognises an Protomaps tileset and builds a style for it — the injection
	 * point of §5.3: `guessStyle(tileJSON, { schemas: [protomaps] })`.
	 */
	tileset: {
		id: 'protomaps',
		sourceLayers: Object.keys(PROTOMAPS_SCHEMA),
		build: (source, urls) => protomapsFn({ urls: { ...urls, protomaps: source } }),
	} satisfies SchemaDescriptor,

	/** Resolve raw ProtomapsOptions to a fully validated ResolvedProtomaps. */
	resolveOptions: resolveProtomaps,

	/**
	 * The smallest options object that builds the same style: every value equal to its default is
	 * dropped, colours compared against the chosen palette. For storing a style in a URL or config.
	 */
	minimizeOptions: minimizeProtomapsOptions,

	/** A runnable snippet for these options. Emits the subpath import, so it runs as pasted (§5.3). */
	toCode(options?: ProtomapsOptions): string {
		return styleCode('protomaps', minimizeProtomapsOptions(options));
	},
} as const);
