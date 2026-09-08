import type { StyleSpecification } from '../types/index.js';
import { scaleLayerOpacity } from '../shortbread/build.js';
import type { MaplibreLayer } from '../types/maplibre.js';

/**
 * Turning the OSM style into an overlay for satellite imagery.
 *
 * The vector style is designed to *be* the map; over a photo it has a different job — locating and
 * naming what the imagery already shows. v5 made three adjustments, and without them the overlay
 * reads as a basemap accidentally drawn on top of a picture.
 *
 * Two of those adjustments are expressed as option defaults instead of transforms, so callers can
 * still override them: white label text on a black halo (`colors.label` / `colors.labelHalo`) and a
 * bold font (`text.fontNormal`). What is left here is what the option surface cannot express.
 */

/**
 * Layer groups dropped from the overlay: the imagery already shows this ground truth, and drawing
 * it again only obscures the photo. Tunnels go too — they are underground, so a surface line for
 * them is actively misleading over imagery.
 *
 * `aerialway-*` is deliberately kept: cable cars and chair lifts are real infrastructure that
 * imagery does *not* resolve, and v5 had no such layers to exclude.
 */
const DROPPED_GROUPS = /^(land|water|site|airport|tunnel)-/;

/** Multiplier applied to every line's opacity, so roads read as an overlay rather than a basemap. */
const LINE_OPACITY = 0.2;

/** Halo tuned for imagery: tight and hard, rather than the wide soft halo used on a flat basemap. */
const HALO_WIDTH = 1;
const HALO_BLUR = 0;

/** Whether a layer belongs in the overlay at all. */
export function keepInOverlay(layer: { id: string; type: string }): boolean {
	// Fills would hide the imagery outright.
	if (layer.type === 'fill' || layer.type === 'fill-extrusion') return false;
	return !DROPPED_GROUPS.test(layer.id);
}

/**
 * Adjust a layer that is staying, in place. Text and icon colours are already correct via the
 * overlay's option defaults; this covers what those options cannot reach.
 *
 * `haloColor` is the overlay's resolved `colors.labelHalo`. It has to be forced onto every symbol
 * layer rather than left to the palette, because two label groups derive their halo elsewhere: POI
 * halos follow `bg` (deliberately opaque, so they cannot use the semi-transparent `labelHalo`) and
 * the motorway shield uses the road colour. Left alone, those become white halos behind the now-
 * white label text — invisible labels.
 */
export function applyImageryTreatment(layer: MaplibreLayer, haloColor: string): void {
	if (layer.type === 'line') {
		scaleLayerOpacity(layer, LINE_OPACITY);
		return;
	}
	if (layer.type === 'symbol') {
		const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
		// Only touch a halo that exists — layers with no halo should not gain one.
		if (paint['text-halo-color'] !== undefined) {
			paint['text-halo-color'] = haloColor;
			paint['text-halo-width'] = HALO_WIDTH;
			paint['text-halo-blur'] = HALO_BLUR;
		}
	}
}

/**
 * The option defaults that give the overlay its imagery treatment, overridable by the caller.
 *
 * Every label-text token is whitened, not just `label`: place names, POIs, transit symbols and
 * house numbers each draw from their own colour, so setting only `label` leaves two thirds of the
 * labels in basemap grey. `labelShield` is left alone — it is the motorway shield's background, not
 * text — and so are the oneway arrows, which are tinted from `fg` and carry no text.
 *
 * Note this also whitens POI and transit *icons*, which share their label's colour token. v5 left
 * those dark; white reads better over imagery, so it is a deliberate departure.
 */
export const OVERLAY_DEFAULTS = {
	/** White on black reads over both bright and dark ground; the basemap's dark-on-white does not. */
	colors: {
		label: '#ffffff',
		labelHalo: '#000000',
		labelPoi: '#ffffff',
		labelSymbol: '#ffffff',
		labelHousenumber: '#ffffff',
	},
	/** v5 set every symbol layer bold, so labels hold up against a busy photo. */
	text: { fontNormal: 'noto_sans_bold' },
} as const;

/** Filter and adjust a built OSM style's layers for use over imagery. */
export function toOverlayLayers(layers: StyleSpecification['layers'], haloColor: string): StyleSpecification['layers'] {
	const kept = layers.filter((l) => keepInOverlay(l as { id: string; type: string }));
	for (const layer of kept) applyImageryTreatment(layer as MaplibreLayer, haloColor);
	return kept;
}
