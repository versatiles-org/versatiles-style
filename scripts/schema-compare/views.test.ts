import { describe, expect, it } from 'vitest';
import { randomViews, tilesForView, VIEWS, type View } from './views.js';

const at = (center: [number, number], zoom: number): View => ({ id: 'test', place: 'test', center, zoom });

describe('views', () => {
	it('have unique ids and cover every zoom band', () => {
		expect(new Set(VIEWS.map((v) => v.id)).size).toBe(VIEWS.length);
		const zooms = VIEWS.map((v) => v.zoom);
		expect(Math.min(...zooms)).toBeLessThanOrEqual(2);
		expect(Math.max(...zooms)).toBeGreaterThanOrEqual(17);
	});

	it('random views are reproducible from their seed', () => {
		expect(randomViews(5, 7)).toEqual(randomViews(5, 7));
		expect(randomViews(5, 7)).not.toEqual(randomViews(5, 8));
		for (const view of randomViews(20, 1)) expect(view.zoom).toBeGreaterThanOrEqual(3);
	});
});

describe('tilesForView', () => {
	const source = { minzoom: 0, maxzoom: 14 };

	it('covers a tile-centred viewport with the tile itself when there is no buffer', () => {
		// the centre of z1 tile (1, 0): lon 90, lat ≈ 66.51
		const tiles = tilesForView(at([90, 66.51326044311186], 1), source, { buffer: 0, width: 510, height: 510 });
		expect(tiles).toEqual([{ z: 1, x: 1, y: 0 }]);
	});

	it('adds the neighbours a buffer reaches, wrapping around the antimeridian', () => {
		const tiles = tilesForView(at([-179.9, 0], 3), source, { buffer: 0 });
		const xs = new Set(tiles.map((t) => t.x));
		expect(xs.has(0)).toBe(true);
		expect(xs.has(7)).toBe(true);
		expect(tiles.every((t) => t.z === 3)).toBe(true);
	});

	it('rounds the zoom down and overzooms past the source maximum', () => {
		expect(tilesForView(at([13.4, 52.52], 12.7), source).every((t) => t.z === 12)).toBe(true);
		const overzoomed = tilesForView(at([13.4, 52.52], 17), source);
		expect(overzoomed.every((t) => t.z === 14)).toBe(true);
		expect(overzoomed.length).toBeLessThanOrEqual(2);
	});

	it('never leaves the world vertically', () => {
		const tiles = tilesForView(at([0, 85], 2), source);
		expect(tiles.every((t) => t.y >= 0 && t.y < 4)).toBe(true);
	});
});
