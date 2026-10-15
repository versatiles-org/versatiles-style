import { Color } from '../color/index.js';
import { BUILDINGS_APPEAR_ZOOM } from '../cartography/index.js';
import type { StyleSpecification } from '../types/index.js';
import type { ResolvedLight, ResolvedProjection, ResolvedSky } from '../options/index.js';

type Position = [number, number, number];
type Light = Exclude<ResolvedLight, false>;

/** Where hillshade and fill-extrusion put the light: azimuth = where it comes from, polar = 90° − altitude. */
export function lightPosition(light: Light): Position {
	return [1.15, light.direction, 90 - light.altitude];
}

/**
 * The same light as MapLibre's globe atmosphere needs it.
 *
 * Measured in MapLibre GL JS 6.14 (headless render, brightness centroid of the glow): with a viewport
 * anchor the atmosphere mirrors the light vertically — azimuth 0° glows at the bottom, 90° on the
 * right — and puts the sun 90° + altitude away from the screen centre, i.e. behind the globe. Light
 * from the top-left at 45° therefore drew a thin backlit rim at the bottom-left. `180° − direction`
 * undoes the mirroring and `90° + altitude` brings the sun in front, so the lit side of the globe is
 * the side hillshade and buildings are lit from.
 */
export function globeLightPosition(light: Light): Position {
	return [1.15, (((180 - light.direction) % 360) + 360) % 360, 90 + light.altitude];
}

/**
 * Whether anything in the style reads `style.light`: a visible fill-extrusion layer, or the atmosphere,
 * which MapLibre draws only on a globe and only with an `atmosphere-blend` other than 0. An expression
 * counts as visible. The hillshade does not read it; it carries the light in its own paint properties.
 */
function usesLight(style: StyleSpecification, projection: ResolvedProjection, sky: ResolvedSky): boolean {
	const buildings = style.layers.some(
		(layer) => layer.type === 'fill-extrusion' && layer.layout?.visibility !== 'none'
	);
	const atmosphere = projection !== 'mercator' && sky !== false && sky.atmosphereBlend !== 0;
	return buildings || atmosphere;
}

/**
 * Writes `style.light`, where something reads it (`usesLight`): a style without 3D buildings or a
 * visible atmosphere gets none, as the light would change nothing on screen. Turning the
 * `building-3d` layer on at runtime then needs the light added too, or the buildings take MapLibre's.
 *
 * One light serves both fill-extrusion and, on a globe, the atmosphere, and the
 * two read it differently (see `globeLightPosition`). They never share a zoom, though: the atmosphere
 * is gone once the globe has turned into Mercator (z12 in MapLibre's `globe` preset) or the camera is
 * below ~100 km, and buildings only appear at `BUILDINGS_APPEAR_ZOOM`. So below that zoom the light
 * takes the atmosphere's position and from it on the true one.
 *
 * A light that turns with the map (`rotateWithMap`, MapLibre's `anchor: 'map'`) steps its anchor at
 * the same zoom: with a map anchor the atmosphere fixes the sun over one point on Earth, which no
 * position can align with the light of hillshade. Fixed to the screen below that zoom, the atmosphere
 * glows from `direction` while the map points north, and turns away from it only as far as the map is
 * rotated. Mercator draws no atmosphere at all, so there both are written plainly.
 */
export function configure3DLighting(
	style: StyleSpecification,
	light: ResolvedLight,
	projection: ResolvedProjection,
	sky: ResolvedSky
) {
	if (light && usesLight(style, projection, sky)) {
		const position = lightPosition(light);
		const anchor = light.rotateWithMap ? 'map' : 'viewport';
		const globe = projection !== 'mercator';
		style.light = {
			anchor: globe && anchor === 'map' ? ['step', ['zoom'], 'viewport', BUILDINGS_APPEAR_ZOOM, 'map'] : anchor,
			position: globe
				? ['step', ['zoom'], ['literal', globeLightPosition(light)], BUILDINGS_APPEAR_ZOOM, ['literal', position]]
				: position,
			color: Color.parse(light.color).asString(),
			intensity: light.intensity,
		};
	} else {
		delete style.light;
	}
}
