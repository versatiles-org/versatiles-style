import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { SatelliteOptions, ResolvedSatellite } from '../options/index.js';
import { colorOptionsKeys, resolveSatellite } from '../options/index.js';
import { SLOT_BELOW_FILLS, SLOT_BELOW_SYMBOLS, SLOT_BELOW_LABELS } from '../shortbread/index.js';
import {
	addTerrain,
	addHillshade,
	configure3DLighting,
	applySky,
	applyProjection,
	toOverlayLayers,
} from '../features/index.js';
import { buildSourceDescriptor } from '../lib/tileSource.js';
import type { TileSource } from '../options/urls.js';
import { osm } from './osm.js';
import { ResolvedOsmOverlay } from '../options/osm-overlay.js';
import { STYLE_METADATA } from '../lib/styleMeta.js';

// Stable slot IDs for satellite styles
const SAT_SLOT_BELOW_RASTER = 'slot-below-raster';

export const SAT_SLOT_IDS = {
	belowRaster: SAT_SLOT_BELOW_RASTER,
	belowSymbols: SLOT_BELOW_SYMBOLS,
	belowLabels: SLOT_BELOW_LABELS,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slotLayer(id: string): StyleSpecification['layers'][number] {
	return { id, type: 'background', paint: { 'background-opacity': 0 } } as StyleSpecification['layers'][number];
}

function buildSatelliteSource(source: TileSource): Record<string, unknown> {
	return buildSourceDescriptor('raster', source);
}

function buildRasterPaint(raster: ResolvedSatellite['raster']): Record<string, number> {
	const paint: Record<string, number> = {};
	if (raster.opacity !== 1) paint['raster-opacity'] = raster.opacity;
	if (raster.hueRotate !== 0) paint['raster-hue-rotate'] = raster.hueRotate;
	if (raster.brightnessMin !== 0) paint['raster-brightness-min'] = raster.brightnessMin;
	if (raster.brightnessMax !== 1) paint['raster-brightness-max'] = raster.brightnessMax;
	if (raster.saturation !== 0) paint['raster-saturation'] = raster.saturation;
	if (raster.contrast !== 0) paint['raster-contrast'] = raster.contrast;
	return paint;
}

// Build OSM vector overlay layers for satellite context.
// Filters out background and all fill layers (they would obscure satellite imagery).
// Keeps slot anchors, roads, boundaries, and labels/symbols.
function buildOsmOverlayLayers(overlayResolved: ResolvedOsmOverlay): StyleSpecification['layers'] {
	// Run the full OSM pipeline using the overlay's resolved options.
	// We reconstruct OsmOptions from the resolved overlay so that osm() re-resolves it
	// (including URL configuration that was inherited from the satellite options).
	// `osmSource` is the already-prefetched OSM source, passed through so osm() reuses it
	// (a resolved TileJSON object is used as-is, avoiding a second download).
	const overlayStyle = osm(overlayResolved);

	// Filter: remove the opaque background layer and all fill layers.
	// Slot anchors (background type with opacity 0) are kept — they provide stable beforeId targets.
	// Slot anchors are background-type layers and must survive; the opaque base background and the
	// below-fills slot must not.
	const candidates = overlayStyle.layers.filter((layer) => layer.id !== 'background' && layer.id !== SLOT_BELOW_FILLS);
	return toOverlayLayers(candidates, overlayResolved.colors.labelHalo);
}

// ── Main satellite() function ─────────────────────────────────────────────────

function satelliteFn(options?: SatelliteOptions): StyleSpecification {
	const resolved = resolveSatellite(options);

	// Base style shell
	const style: StyleSpecification = {
		version: 8,
		name: 'versatiles-satellite',
		metadata: STYLE_METADATA,
		sources: {},
		layers: [],
		glyphs: resolved.urls.glyphsPattern,
		sprite: resolved.urls.sprite as StyleSpecification['sprite'],
	};

	// Satellite raster source
	(style.sources as Record<string, unknown>)['satellite'] = buildSatelliteSource(resolved.urls.satellite);

	// Layer stack
	const rasterPaint = buildRasterPaint(resolved.raster);
	const layers: StyleSpecification['layers'] = [
		// Dark background visible before satellite tiles load
		{
			id: 'background',
			type: 'background',
			paint: { 'background-color': '#000' },
		} as StyleSpecification['layers'][number],

		// Slot: users can insert layers below the satellite raster (e.g. a basemap)
		slotLayer(SAT_SLOT_BELOW_RASTER),

		// Satellite raster imagery
		{
			id: 'satellite',
			type: 'raster',
			source: 'satellite',
			...(Object.keys(rasterPaint).length > 0 && { paint: rasterPaint }),
		} as StyleSpecification['layers'][number],
	];

	if (resolved.osmOverlay !== false) {
		// OSM vector overlay: roads, labels, boundaries on top of satellite
		const overlayLayers = buildOsmOverlayLayers(resolved.osmOverlay);
		layers.push(...overlayLayers);

		// Also add the OSM vector source (reusing the already-prefetched OSM source)
		(style.sources as Record<string, unknown>)['versatiles-shortbread'] = buildOsmVectorSource(resolved.urls.osm);
	} else {
		// No overlay: still provide slot anchors so satellite.slots references are valid
		layers.push(slotLayer(SLOT_BELOW_SYMBOLS));
		layers.push(slotLayer(SLOT_BELOW_LABELS));
	}

	style.layers = layers;

	// Optional terrain
	if (resolved.features.terrain !== false) {
		addTerrain(style, resolved.features.terrain, resolved.urls.elevation);
	}

	// Optional hillshade
	if (resolved.features.hillshade !== false) {
		addHillshade(style, resolved.features.hillshade, resolved.sun, resolved.urls.elevation);
		configure3DLighting(style, resolved.sun);
	}

	// Sky (rendered by MapLibre when the map is pitched / in globe projection).
	applySky(style, resolved.sky);
	applyProjection(style, resolved.projection);

	return style;
}

// Build the OSM vector source descriptor for the overlay.
function buildOsmVectorSource(source: TileSource): Record<string, unknown> {
	return buildSourceDescriptor('vector', source, { scheme: 'xyz' });
}

// ── Static properties ─────────────────────────────────────────────────────────

export const satellite = Object.assign(satelliteFn, {
	/** Color key names accepted by osmOverlay.colors. */
	colorKeys: colorOptionsKeys,

	/** Fully resolved defaults. */
	get defaults() {
		return resolveSatellite();
	},

	/** Return language codes available in a given TileJSON. */
	languages(tileJSON: TileJSONSpecification): string[] {
		const langs = new Set<string>();
		const vl = (tileJSON as { vector_layers?: Array<{ fields?: Record<string, unknown> }> }).vector_layers ?? [];
		for (const layer of vl) {
			for (const key of Object.keys(layer.fields ?? {})) {
				if (key.startsWith('name_')) langs.add(key.slice(5));
			}
		}
		return [...langs].sort();
	},

	/** Stable layer IDs for use as MapLibre `beforeId`. */
	slots: SAT_SLOT_IDS,

	/** Resolve raw SatelliteOptions to a fully validated ResolvedSatellite. */
	resolveOptions: resolveSatellite,
} as const);
