import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Building footprints for OpenMapTiles — the cheapest module in the port, and the only one so far that
// is a pure rename.
//
// Verified with `npm run schema-values -- omt building`: the layer carries no `class` or `subclass` at
// all, so the fills are unfiltered exactly as in Shortbread, and the three fields the 3D layer needs are
// present under different names. `building` starts at z13 where Shortbread's starts at z14; the fade-in
// stays at 14 because that is a cartographic choice (it matches OSM Bright's `building-top`), not a
// statement about data availability — the data floor in `buildLayers` is what tracks the latter.
export function* buildings(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Extruded mode draws `building-3d` on top instead (see buildings3d), so emit no flat footprints.
	if (ctx.features.buildings === 'extruded') return;

	yield b.fill('building:outline', {
		sourceLayer: 'building',
		color: c.buildingBg,
		appear: 14,
		group: 'buildings',
	});
	yield b.fill('building', {
		sourceLayer: 'building',
		color: c.building,
		appear: 14,
		fillTranslate: [-2, -2],
		group: 'buildings',
	});
}

// Extruded (3D) buildings, emitted as the topmost layer. `height`/`min_height` are `render_height`/
// `render_min_height` here — OpenMapTiles pre-computes them from the building's tags, which is why they
// carry the `render_` prefix — and `hide_3d` survives under its own name.
export function* buildings3d(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	if (ctx.features.buildings !== 'extruded') return;

	yield b.fillExtrusion('building-3d', {
		sourceLayer: 'building',
		filter: ['!=', ['get', 'hide_3d'], true],
		color: c.building,
		appear: 14,
		opacity: 0.7,
		fillExtrusionHeight: ['coalesce', ['get', 'render_height'], 5],
		fillExtrusionBase: ['coalesce', ['get', 'render_min_height'], 0],
		group: 'buildings',
	});
}
