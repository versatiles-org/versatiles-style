import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
// the authoring helpers — `minimizeOptions` — are attached in the package entry, not here
import { osm, satellite } from '../index.js';
import { omt } from '../omt/index.js';
import { protomaps } from '../protomaps/index.js';
import type { LayerGroupOptions, OsmOptions } from '../options/index.js';

// `layers` takes a line style — `{ opacity, dashed }` — on the six groups that are a line: the three
// borders and the three kinds of path. The option is resolved in `options/parts/layer-groups.ts` and
// drawn by the shared border and road modules, so it has to hold in every schema, not only Shortbread.

type Build = (layers?: LayerGroupOptions) => StyleSpecification;
const BUILDERS: [string, Build][] = [
	['osm', (layers) => osm({ layers })],
	['omt', (layers) => omt({ layers })],
	['protomaps', (layers) => protomaps({ layers, urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } })],
];

const layerOf = (style: StyleSpecification, id: string) =>
	style.layers.find((layer) => layer.id === id) as
		{ paint?: Record<string, unknown>; layout?: Record<string, unknown> } | undefined;
const dashOf = (style: StyleSpecification, id: string) => layerOf(style, id)?.paint?.['line-dasharray'];
const capOf = (style: StyleSpecification, id: string) => layerOf(style, id)?.layout?.['line-cap'] ?? 'butt';
const ids = (style: StyleSpecification, prefix: string) =>
	style.layers.map((layer) => layer.id).filter((id) => id.startsWith(prefix));

describe.each(BUILDERS)('line styles in %s', (_name, build) => {
	it('draws each line group in its default pattern', () => {
		const style = build();
		expect(dashOf(style, 'boundary-country')).toBeUndefined();
		expect(dashOf(style, 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
		expect(dashOf(style, 'boundary-country-disputed')).toStrictEqual([2, 1]);
		expect(dashOf(style, 'way-footway')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-path')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-cycleway')).toStrictEqual([1.5, 0.75]);
		expect(dashOf(style, 'way-steps')).toStrictEqual([0.5, 0.25]);
	});

	it('draws a line solid, with round caps, when `dashed` is false', () => {
		const style = build({
			boundaries: { state: { dashed: false }, disputed: { dashed: false } },
			roads: { footway: { dashed: false }, paths: { dashed: false }, steps: { dashed: false } },
		});
		for (const id of [
			'boundary-state',
			'boundary-country-disputed',
			'way-footway',
			'way-path',
			'way-cycleway',
			'way-steps',
		]) {
			expect(dashOf(style, id), id).toBeUndefined();
			expect(capOf(style, id), id).toBe('round');
		}
		// the same path below and above ground
		expect(dashOf(style, 'tunnel-way-footway')).toBeUndefined();
		expect(dashOf(style, 'bridge-way-footway')).toBeUndefined();
	});

	it('dashes the country border when asked, in a pattern of its own', () => {
		const style = build({ boundaries: { country: { dashed: true } } });
		expect(dashOf(style, 'boundary-country')).toStrictEqual([4, 2]);
		expect(capOf(style, 'boundary-country')).toBe('butt');
	});

	it("draws a caller's own pattern as written, with butt caps", () => {
		const style = build({ boundaries: { state: { dashed: [6, 3] } }, roads: { paths: { dashed: [2, 4] } } });
		expect(dashOf(style, 'boundary-state')).toStrictEqual([6, 3]);
		expect(capOf(style, 'boundary-state')).toBe('butt');
		expect(dashOf(style, 'way-path')).toStrictEqual([2, 4]);
		expect(dashOf(style, 'way-cycleway')).toStrictEqual([2, 4]);
		expect(capOf(style, 'way-cycleway')).toBe('butt');
		// footways are a group of their own and keep theirs
		expect(dashOf(style, 'way-footway')).toStrictEqual([1.5, 0.75]);
	});

	it('applies the opacity of a line style like a plain value', () => {
		const plain = build({ boundaries: { state: 0.5 } });
		const styled = build({ boundaries: { state: { opacity: 0.5 } } });
		expect(layerOf(styled, 'boundary-state')).toStrictEqual(layerOf(plain, 'boundary-state'));
		expect(ids(build({ boundaries: { state: { opacity: false } } }), 'boundary-state')).toStrictEqual([]);
	});

	it('keeps disputed borders, with their casing, when the country borders are hidden', () => {
		const hidden = ids(build({ boundaries: { country: false } }), 'boundary-country');
		expect(hidden).toStrictEqual(['boundary-country-disputed:outline', 'boundary-country-disputed']);
		const without = ids(build({ boundaries: { disputed: false } }), 'boundary-country');
		expect(without).not.toContain('boundary-country-disputed');
		expect(without).not.toContain('boundary-country-disputed:outline');
		expect(without).toContain('boundary-country');
		expect(without).toContain('boundary-country:outline');
	});

	it('shares no dash pattern between two builds', () => {
		const [a, b] = [build(), build()];
		expect(dashOf(a, 'boundary-state')).not.toBe(dashOf(b, 'boundary-state'));
		expect(dashOf(a, 'way-steps')).not.toBe(dashOf(b, 'way-steps'));
	});
});

describe('line styles: the satellite overlay', () => {
	it('takes them on its own borders and paths', () => {
		const style = satellite({ osmOverlay: { layers: { boundaries: { state: { dashed: false } } } } });
		expect(dashOf(style, 'boundary-state')).toBeUndefined();
		expect(dashOf(satellite(), 'boundary-state')).toStrictEqual([3, 1, 1, 1]);
	});

	it('drops the casing of the disputed border with the others', () => {
		expect(ids(satellite(), 'boundary')).not.toContain('boundary-country-disputed:outline');
	});
});

describe('line styles: minimizeOptions', () => {
	const minimal = (options: OsmOptions) => osm.minimizeOptions(osm.resolveOptions(options));

	it('writes nothing for the defaults', () => {
		expect(minimal({})).toStrictEqual({});
		expect(minimal({ layers: { boundaries: { state: { dashed: true }, country: { dashed: false } } } })).toStrictEqual(
			{}
		);
	});

	it('writes a dash that differs from the default, and only that', () => {
		expect(minimal({ layers: { boundaries: { state: { dashed: false } } } })).toStrictEqual({
			layers: { boundaries: { state: { dashed: false } } },
		});
		expect(minimal({ layers: { roads: { footway: { dashed: [3, 1] } } } })).toStrictEqual({
			layers: { roads: { footway: { dashed: [3, 1] } } },
		});
	});

	it('still folds a branch whose groups agree, where no dash is set in it', () => {
		expect(minimal({ layers: { boundaries: 0.5 } })).toStrictEqual({ layers: { boundaries: 0.5 } });
		expect(minimal({ layers: 0.5 })).toStrictEqual({ layers: 0.5 });
		expect(minimal({ layers: false })).toStrictEqual({ layers: false });
	});

	it('spells a folded branch out again where one of its groups sets a dash', () => {
		expect(
			minimal({ layers: { boundaries: { country: 0.5, disputed: 0.5, state: { opacity: 0.5, dashed: false } } } })
		).toStrictEqual({
			layers: { boundaries: { country: 0.5, state: { opacity: 0.5, dashed: false }, disputed: 0.5 } },
		});
	});

	it('leaves the other branches as they were', () => {
		expect(
			minimal({ layers: { roads: { footway: { dashed: [3, 1] }, streets: { service: false } }, labels: false } })
		).toStrictEqual({ layers: { roads: { streets: { service: false }, footway: { dashed: [3, 1] } }, labels: false } });
	});

	it('says nothing about the dash of a hidden line', () => {
		expect(minimal({ layers: { boundaries: { state: { opacity: false, dashed: false } } } })).toStrictEqual({
			layers: { boundaries: { state: false } },
		});
	});

	it.each<OsmOptions>([
		{ layers: { boundaries: { state: { dashed: false } } } },
		{ layers: 0.5 },
		{ layers: { boundaries: 0.5, roads: { footway: { dashed: [3, 1] } } } },
		{ layers: { roads: { steps: { opacity: 0.2, dashed: false } }, boundaries: { country: { dashed: [1, 1] } } } },
		{ layers: { roads: 0.3, boundaries: { disputed: { opacity: 0.7, dashed: false } } } },
	])('resolves to the same thing after minimising: %j', (options) => {
		const resolved = osm.resolveOptions(options);
		expect(osm.resolveOptions(osm.minimizeOptions(resolved)).layers).toStrictEqual(resolved.layers);
		expect(JSON.stringify(osm(osm.minimizeOptions(resolved)))).toBe(JSON.stringify(osm(options)));
	});
});
