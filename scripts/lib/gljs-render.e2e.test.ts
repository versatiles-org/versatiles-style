import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GlMap } from './gljs-render.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/**
 * GL JS draws `line-layer-opacity`, which is the reason this renderer exists: two identical lines at
 * 0.5 blend to 1 − 0.5² = 0.75 per feature, but stay at 0.5 composited as one layer.
 *
 * Skipped where Playwright's Chromium is not installed (CI does not install it); run
 * `npx playwright install chromium` to enable it.
 */

const line = {
	type: 'Feature',
	properties: {},
	geometry: {
		type: 'LineString',
		coordinates: [
			[-90, 0],
			[90, 0],
		],
	},
};

function style(paint: Record<string, unknown>): StyleSpecification {
	return {
		version: 8,
		sources: {
			lines: { type: 'geojson', data: { type: 'FeatureCollection', features: [line, line] } },
		},
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': '#000000' } },
			{ id: 'line', type: 'line', source: 'lines', paint: { 'line-color': '#ffffff', 'line-width': 10, ...paint } },
		],
	} as StyleSpecification;
}

describe.skipIf(!GlMap.available())('GlMap', () => {
	let map: GlMap;
	beforeAll(async () => {
		map = await GlMap.launch({ offline: true });
	}, 60_000);
	afterAll(async () => {
		await map?.close();
	});

	const centre = async (paint: Record<string, unknown>) => {
		const { pixels, failures } = await map.render(style(paint), { center: [0, 0], zoom: 1, width: 64, height: 64 });
		expect(failures).toStrictEqual([]);
		const i = (32 * 64 + 32) * 4;
		return [...pixels.slice(i, i + 4)];
	};

	it('renders a background', async () => {
		const { pixels } = await map.render(
			{ version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ff0000' } }] },
			{ center: [0, 0], zoom: 0, width: 8, height: 8 }
		);
		expect([...pixels.slice(0, 4)]).toStrictEqual([255, 0, 0, 255]);
	});

	it('blends overlapping features per feature with line-opacity', async () => {
		const [r] = await centre({ 'line-opacity': 0.5 });
		expect(r).toBeGreaterThanOrEqual(189);
		expect(r).toBeLessThanOrEqual(193);
	});

	it('composites the layer once with line-layer-opacity', async () => {
		const [r] = await centre({ 'line-layer-opacity': 0.5 });
		expect(r).toBeGreaterThanOrEqual(126);
		expect(r).toBeLessThanOrEqual(130);
	});
});
