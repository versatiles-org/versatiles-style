import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Flat building footprints (outline + fill), rendered in the `buildings` group beneath the road
// network. In extruded mode these are replaced by `buildings3d`, which is emitted last (above
// labels) so tall 3D buildings are not hidden behind later layers.
export function* buildings(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Extruded mode draws `building-3d` on top instead (see buildings3d), so emit no flat footprints.
	if (ctx.features.buildings === 'extruded') return;

	yield* b.gate(
		ctx.layers,
		b.fill('building:outline', {
			sourceLayer: 'buildings',
			color: c.buildingBg,
			appear: 14, // fade in over z14→15 (matches OSM Bright `building-top`)
			group: 'buildings',
		}),
		b.fill('building', {
			sourceLayer: 'buildings',
			color: c.building,
			appear: 14,
			fillTranslate: [-2, -2],
			group: 'buildings',
		})
	);
}

// Extruded (3D) buildings, emitted as the topmost layer (above labels) so tall buildings render
// over everything. A no-op unless `features.buildings === 'extruded'`. Stays in the `buildings`
// group so the `layers.buildings` visibility toggle still controls it.
export function* buildings3d(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	if (ctx.features.buildings !== 'extruded') return;

	yield* b.gate(
		ctx.layers,
		b.fillExtrusion('building-3d', {
			sourceLayer: 'buildings',
			filter: ['!=', ['get', 'hide_3d'], true],
			color: c.building,
			appear: 14,
			opacity: 0.7,
			fillExtrusionHeight: ['coalesce', ['get', 'height'], 5],
			fillExtrusionBase: ['coalesce', ['get', 'min_height'], 0],
			group: 'buildings',
		})
	);
}
