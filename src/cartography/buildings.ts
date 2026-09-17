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

/**
 * How opaque an extrusion is drawn when the caller states nothing — translucent enough to read the
 * streets and labels under a dense downtown. `layers.buildings` replaces it with a number of its own,
 * and `migrate` reads it back out of a foreign style against this value.
 */
export const EXTRUSION_OPACITY = 0.7;

// Extruded (3D) buildings, emitted as the topmost layer (above labels) so tall buildings render over
// everything. A no-op unless `features.buildings === 'extruded'`. Stays in the `buildings` group so the
// `layers.buildings` visibility toggle still controls it.
export function* buildings3d(ctx: LayerContext, vocab: BuildingVocabulary): Generator<b.TaggedLayer> {
	const { c } = ctx;

	if (ctx.features.buildings !== 'extruded') return;

	// `layers.buildings` sets the extrusion opacity outright: this is the one layer in its group in
	// extruded mode (flat footprints emit nothing), so the group's opacity and the building opacity are
	// the same number.
	//
	// Stating 1 here rather than the caller's value is what makes that work. `gate` then scales this
	// layer by the same option, so a base of 1 lands on exactly what was asked for; writing the value
	// here too would square it (0.5 → 0.25). Left at the cartographic default when the option is `true`
	// or unset, which mean "as the cartography drew it" — `gate` passes those through untouched.
	const opacity = typeof ctx.layers.buildings === 'number' ? 1 : EXTRUSION_OPACITY;

	yield b.fillExtrusion('building-3d', {
		sourceLayer: vocab.sourceLayer,
		filter: ['!=', ['get', 'hide_3d'], true],
		color: c.building,
		appear: 14,
		opacity,
		fillExtrusionHeight: ['coalesce', ['get', vocab.height], 5],
		fillExtrusionBase: ['coalesce', ['get', vocab.minHeight], 0],
		group: 'buildings',
	});
}
