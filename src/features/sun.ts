import { Color } from '../color/index.js';
import { BUILDINGS_APPEAR_ZOOM } from '../cartography/index.js';
import type { StyleSpecification } from '../types/index.js';
import type { ResolvedProjection, ResolvedSun } from '../options/index.js';

type Position = [number, number, number];

/** Where hillshade and fill-extrusion put the light: azimuth = where it comes from, polar = 90° − altitude. */
export function sunPosition(sun: NonNullable<ResolvedSun>): Position {
	return [1.15, sun.direction, 90 - sun.altitude];
}

/**
 * The same sun as MapLibre's globe atmosphere needs it.
 *
 * Measured in MapLibre GL JS 6.14 (headless render, brightness centroid of the glow): with a viewport
 * anchor the atmosphere mirrors the light vertically — azimuth 0° glows at the bottom, 90° on the
 * right — and puts the sun 90° + altitude away from the screen centre, i.e. behind the globe. Light
 * from the top-left at 45° therefore drew a thin backlit rim at the bottom-left. `180° − direction`
 * undoes the mirroring and `90° + altitude` brings the sun in front, so the lit side of the globe is
 * the side hillshade and buildings are lit from.
 */
export function globeSunPosition(sun: NonNullable<ResolvedSun>): Position {
	return [1.15, (((180 - sun.direction) % 360) + 360) % 360, 90 + sun.altitude];
}

/**
 * Writes `style.light`. One light serves both fill-extrusion and, on a globe, the atmosphere, and the
 * two read it differently (see `globeSunPosition`). They never share a zoom, though: the atmosphere
 * is gone once the globe has turned into Mercator (z12 in MapLibre's `globe` preset) or the camera is
 * below ~100 km, and buildings only appear at `BUILDINGS_APPEAR_ZOOM`. So below that zoom the light
 * takes the atmosphere's position and from it on the true one.
 *
 * Not for `anchor: 'map'`: there the atmosphere fixes the sun over a point on Earth, which no
 * position can align with the local light of hillshade. Mercator draws no atmosphere at all.
 */
export function configure3DLighting(style: StyleSpecification, sun: ResolvedSun, projection: ResolvedProjection) {
	if (sun) {
		const position = sunPosition(sun);
		style.light = {
			anchor: sun.anchor,
			position:
				projection === 'mercator' || sun.anchor === 'map'
					? position
					: ['step', ['zoom'], ['literal', globeSunPosition(sun)], BUILDINGS_APPEAR_ZOOM, ['literal', position]],
			color: Color.parse(sun.color).asString(),
			intensity: sun.intensity,
		};
	} else {
		delete style.light;
	}
}
