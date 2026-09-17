import type { LayerContext } from '../dsl/index.js';
import * as b from '../dsl/index.js';

/**
 * Building cartography, shared by every schema.
 *
 * The cheapest of the extractions: the two ports were 27 of 33 lines identical, and all six
 * differing lines were names — the source-layer, and the two height fields OpenMapTiles prefixes with
 * `render_` because it pre-computes them from the building's tags.
 */
export type BuildingVocabulary = {
	/** The source-layer carrying building footprints. */
	readonly sourceLayer: string;
	/** Field holding a building's height, and the base height of an extrusion. */
	readonly height: string;
	readonly minHeight: string;
};

// Flat building footprints (outline + fill), rendered in the `buildings` group beneath the road
// network. In extruded mode these are replaced by `buildings3d`, which is emitted last (above labels)
// so tall 3D buildings are not hidden behind later layers.
export function* buildings(ctx: LayerContext, vocab: BuildingVocabulary): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Extruded mode draws `building-3d` on top instead (see buildings3d), so emit no flat footprints.
	if (ctx.features.buildings === 'extruded') return;

	yield b.fill('building:outline', {
		sourceLayer: vocab.sourceLayer,
		color: c.buildingBg,
		appear: 14, // fade in over z14→15 (matches OSM Bright `building-top`)
		group: 'buildings',
	});
	yield b.fill('building', {
		sourceLayer: vocab.sourceLayer,
		color: c.building,
		appear: 14,
		fillTranslate: [-2, -2],
		group: 'buildings',
	});
}

// Extruded (3D) buildings, emitted as the topmost layer (above labels) so tall buildings render over
// everything. A no-op unless `features.buildings === 'extruded'`. Stays in the `buildings` group so the
// `layers.buildings` visibility toggle still controls it.
export function* buildings3d(ctx: LayerContext, vocab: BuildingVocabulary): Generator<b.TaggedLayer> {
	const { c } = ctx;

	if (ctx.features.buildings !== 'extruded') return;

	yield b.fillExtrusion('building-3d', {
		sourceLayer: vocab.sourceLayer,
		filter: ['!=', ['get', 'hide_3d'], true],
		color: c.building,
		appear: 14,
		opacity: 0.7,
		fillExtrusionHeight: ['coalesce', ['get', vocab.height], 5],
		fillExtrusionBase: ['coalesce', ['get', vocab.minHeight], 0],
		group: 'buildings',
	});
}
