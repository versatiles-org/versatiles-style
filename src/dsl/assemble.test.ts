import { describe, expect, it } from 'vitest';
import { buildLayers } from './assemble.js';
import * as b from './build.js';

describe('buildLayers: the data floor', () => {
	const build = (...tagged: b.TaggedLayer[]) =>
		buildLayers({ layers: {}, text: {}, source: 's' } as never, { lines: { minzoom: 6 } }, tagged);
	const line = (id: string, opts: Partial<b.BuildOpts> = {}) =>
		b.line(id, { sourceLayer: 'lines', color: '#ff0000', ...opts });

	it('raises a layer without a zoom of its own to where its source-layer begins', () => {
		expect(build(line('x'))[0].minzoom).toBe(6);
	});

	it('raises a layer gated below the floor', () => {
		expect(build(line('x', { minzoom: 3 }))[0].minzoom).toBe(6);
	});

	it('leaves a layer gated above the floor', () => {
		expect(build(line('x', { appear: 9 }))[0].minzoom).toBe(9);
	});

	it('leaves a source-layer it has no floor for', () => {
		expect(build(b.line('x', { sourceLayer: 'other', color: '#ff0000' }))[0].minzoom).toBeUndefined();
	});
});
