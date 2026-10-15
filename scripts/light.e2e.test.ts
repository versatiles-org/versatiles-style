import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { GlMap } from './lib/gljs-render.js';
import { configure3DLighting } from '../src/features/light.js';
import { SKY_DEFAULTS, type ResolvedLight } from '../src/options/index.js';

/**
 * `configure3DLighting` corrects for how MapLibre GL JS draws the globe's atmosphere: mirrored
 * vertically, with the sun behind the globe. The correction is a measurement of GL JS, not something
 * the style spec states, so it is checked against GL JS here — if MapLibre ever changes the
 * atmosphere's convention, this is what says the correction has to go.
 *
 * Every view is read by where it is brightest: the brightness-weighted centre of the pixels, as a
 * compass angle on screen (0 = top, 90 = right). The light is anchored to the viewport throughout, so
 * light from `direction` should brighten that side of the screen.
 *
 * Skipped where Playwright's Chromium is not installed; run `npx playwright install chromium`.
 */

const SIZE = 512;

function sun(direction: number, altitude = 45, fixedToScreen = true): Exclude<ResolvedLight, false> {
	return { direction, altitude, fixedToScreen, color: '#ffffff', intensity: 0.5 };
}

function luminance(pixels: Uint8Array): Float64Array {
	const l = new Float64Array(pixels.length / 4);
	for (let i = 0; i < l.length; i++) l[i] = (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3;
	return l;
}

/** The screen direction, in compass degrees, in which `image` is brighter than `base`. */
function brightSide(image: Float64Array, base: Float64Array): number {
	let x = 0;
	let y = 0;
	for (let i = 0; i < image.length; i++) {
		const d = image[i] - base[i];
		x += d * ((i % SIZE) - SIZE / 2);
		y += d * (SIZE / 2 - Math.floor(i / SIZE));
	}
	return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

/** The smallest angle between two compass directions. */
function angleBetween(a: number, b: number): number {
	const d = Math.abs(a - b) % 360;
	return Math.min(d, 360 - d);
}

function globe(atmosphereBlend: number, light?: Exclude<ResolvedLight, false>): StyleSpecification {
	const style = {
		version: 8,
		projection: { type: 'globe' },
		sky: { 'atmosphere-blend': atmosphereBlend },
		sources: {},
		layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#404040' } }],
	} as StyleSpecification;
	if (light) configure3DLighting(style, light, 'globe', { ...SKY_DEFAULTS, atmosphereBlend });
	return style;
}

/** A round tower: a 48-gon, wound clockwise as a building footprint is. */
function tower(light: Exclude<ResolvedLight, false>): StyleSpecification {
	const ring = Array.from({ length: 49 }, (_, i) => {
		const a = (-i / 48) * 2 * Math.PI;
		return [0.0006 * Math.cos(a), 0.0006 * Math.sin(a)];
	});
	const style = {
		version: 8,
		projection: { type: 'globe' },
		sources: {
			b: {
				type: 'geojson',
				data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
			},
		},
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': '#000000' } },
			{
				id: 'b',
				type: 'fill-extrusion',
				source: 'b',
				paint: { 'fill-extrusion-color': '#ffffff', 'fill-extrusion-height': 150 },
			},
		],
	} as StyleSpecification;
	configure3DLighting(style, light, 'globe', false);
	return style;
}

describe.skipIf(!GlMap.available())('light on a globe, in MapLibre GL JS', () => {
	let map: GlMap;
	beforeAll(async () => {
		map = await GlMap.launch({ offline: true });
	}, 60_000);
	afterAll(async () => {
		await map?.close();
	});

	const render = async (style: StyleSpecification, view: { zoom: number; pitch?: number; bearing?: number }) => {
		const { pixels, failures } = await map.render(style, { center: [0, 0], width: SIZE, height: SIZE, ...view });
		expect(failures).toStrictEqual([]);
		return luminance(pixels);
	};

	it.each([0, 90, 180, 270, 315])(
		'lights the globe from direction %i°, in front',
		async (direction) => {
			const view = { zoom: 0.6 };
			const base = await render(globe(0), view);
			const image = await render(globe(1, sun(direction)), view);
			expect(angleBetween(brightSide(image, base), direction)).toBeLessThan(20);
			// In front, not behind: the middle of the globe is lit, not only a rim.
			const centre = (SIZE / 2) * SIZE + SIZE / 2;
			expect(image[centre] - base[centre]).toBeGreaterThan(20);
		},
		30_000
	);

	// A light that turns with the map is fixed to the screen below building zoom, so the atmosphere
	// glows from `direction` — on screen, whatever the bearing — rather than over one point on Earth.
	it.each([0, 90])(
		'lights the globe from direction 315° on screen for a light that turns with the map, at bearing %i°',
		async (bearing) => {
			const view = { zoom: 0.6, bearing };
			const base = await render(globe(0), view);
			const image = await render(globe(1, sun(315, 45, false)), view);
			expect(angleBetween(brightSide(image, base), 315)).toBeLessThan(20);
		},
		30_000
	);

	// …and turns with the map from building zoom on: light from the east, with the map turned upside
	// down, comes from the left of the screen.
	it('lights buildings from the map direction for a light that turns with the map', async () => {
		const image = await render(tower(sun(90, 30, false)), { zoom: 16, pitch: 60, bearing: 180 });
		let left = 0;
		let right = 0;
		for (let i = 0; i < image.length; i++) {
			if (i % SIZE < SIZE / 2) left += image[i];
			else right += image[i];
		}
		expect(left).toBeGreaterThan(right);
	}, 30_000);

	it.each([
		[90, 'right'],
		[270, 'left'],
	] as const)(
		'lights buildings from direction %i° (the %s side) at building zoom',
		async (direction, side) => {
			const image = await render(tower(sun(direction, 30)), { zoom: 16, pitch: 60 });
			let left = 0;
			let right = 0;
			for (let i = 0; i < image.length; i++) {
				if (i % SIZE < SIZE / 2) left += image[i];
				else right += image[i];
			}
			expect(side === 'right' ? right > left : left > right).toBe(true);
		},
		30_000
	);
});
