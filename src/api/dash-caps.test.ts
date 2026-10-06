import { describe, expect, it } from 'vitest';
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from './index.js';
import { omt } from '../omt/index.js';
import { protomaps } from '../protomaps/index.js';
import * as b from '../dsl/index.js';

// A round cap extends every dash by half a line width at both ends, so it closes any gap of one line
// width or less and the line renders solid. Nothing reports that: the style is valid, the dash is in
// it, and the map shows a solid line — which is how the disputed border carried a `[2, 1]` for years
// that never showed. `make` in `src/dsl/build.ts` now gives such a line butt caps; this is the check
// that it reaches every dashed layer of every schema.

const STYLES: [string, StyleSpecification][] = [
	['osm', osm()],
	['omt', omt()],
	['protomaps', protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } })],
];

const dashOf = (layer: LayerSpecification): number[] | undefined =>
	(layer as { paint?: Record<string, unknown> }).paint?.['line-dasharray'] as number[] | undefined;
const capOf = (layer: LayerSpecification): string =>
	((layer as { layout?: Record<string, unknown> }).layout?.['line-cap'] as string | undefined) ?? 'butt';
const gapsOf = (dash: number[]): number[] => dash.filter((_, index) => index % 2 === 1);

describe('a dash is never drawn under a cap that closes it', () => {
	it.each(STYLES)('%s', (_name, style) => {
		const dashed = style.layers.filter((layer) => dashOf(layer) !== undefined);
		expect(dashed.length).toBeGreaterThan(5);
		const closed = dashed
			.filter((layer) => capOf(layer) === 'round' && gapsOf(dashOf(layer)!).some((gap) => gap <= 1))
			.map((layer) => layer.id);
		expect(closed).toStrictEqual([]);
	});

	it.each(STYLES)(
		'%s draws the state border dash-dot and the disputed border dashed, in different patterns',
		(_name, style) => {
			const state = style.layers.find((layer) => layer.id === 'boundary-state')!;
			const disputed = style.layers.find((layer) => layer.id === 'boundary-country-disputed')!;
			const country = style.layers.find((layer) => layer.id === 'boundary-country')!;
			expect(dashOf(state)).toStrictEqual([3, 1, 1, 1]);
			expect(dashOf(disputed)).toStrictEqual([2, 1]);
			expect(dashOf(country)).toBeUndefined();
			expect(capOf(state)).toBe('butt');
			expect(capOf(disputed)).toBe('butt');
		}
	);
});

describe('the line builder', () => {
	const build = (props: object) =>
		b.line('test', { sourceLayer: 'streets', color: '#000000', ...props } as Parameters<typeof b.line>[1]).layer;

	it('replaces a round cap on a dash whose gaps it would close', () => {
		expect(capOf(build({ lineCap: 'round', lineDasharray: [2, 1] }))).toBe('butt');
		expect(capOf(build({ lineCap: 'round', lineDasharray: [3, 1, 1, 0.5] }))).toBe('butt');
	});

	it('keeps a round cap where every gap outlasts it, and on a solid line', () => {
		expect(capOf(build({ lineCap: 'round', lineDasharray: [2, 3] }))).toBe('round');
		expect(capOf(build({ lineCap: 'round' }))).toBe('round');
	});
});
