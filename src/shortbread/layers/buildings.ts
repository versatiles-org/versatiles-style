import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Flat building footprints (outline + fill). The 3D extrusion lives in buildings3d.ts
// because it is rendered later in the stack (above roads). All in the `buildings` group.
export function* buildings(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	if (ctx.features.buildings === 'extruded') {
		yield b.fillExtrusion('building-3d', {
			sourceLayer: 'buildings',
			filter: ['!=', ['get', 'hide_3d'], true],
			color: c.building,
			opacity: { 14: 0, 15: 0.7 },
			fillExtrusionHeight: ['coalesce', ['get', 'height'], 5],
			fillExtrusionBase: ['coalesce', ['get', 'min_height'], 0],
			group: 'buildings',
		});
	} else {
		yield b.fill('building:outline', {
			sourceLayer: 'buildings',
			color: c.buildingBg,
			opacity: { 14: 0, 15: 1 },
			group: 'buildings',
		});
		yield b.fill('building', {
			sourceLayer: 'buildings',
			color: c.building,
			opacity: { 14: 0, 15: 1 },
			fillTranslate: [-2, -2],
			group: 'buildings',
		});
	}
}
