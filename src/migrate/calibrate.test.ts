import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { getPaletteColors } from '../themes/index.js';
import { colorOptionsKeys } from '../options/';
import type { StyleSpecification } from '../types/index.js';
import { calibrate, FULL_EVIDENCE, parseRGBA, solveColors, type ChannelId } from './calibrate.js';
import { readProbe, type Channel, type RGBA } from './evaluate.js';
import { colorDistance } from './math.js';
import { PROBES } from './probes.js';

const schemas = new Map([['versatiles-shortbread', 'shortbread' as const]]);
const model = calibrate({ build: (colors) => osm({ colors }), defaults: getPaletteColors('colorful'), schemas });

function channels(style: StyleSpecification): Map<ChannelId, RGBA> {
	const out = new Map<ChannelId, RGBA>();
	for (const probe of PROBES) {
		const reading = readProbe(style, schemas, probe);
		for (const [channel, color] of Object.entries(reading?.colors ?? {}) as [Channel, RGBA][]) {
			out.set(`${probe.id}/${channel}`, color);
		}
	}
	return out;
}

describe('calibrate', () => {
	it('finds the key a palette colour painted as-is depends on, with an exact fit', () => {
		const water = model.channels.get('water-ocean/color')!;
		expect(water.keys).toEqual(['water']);
		expect(water.residual).toBeLessThan(1e-5);
	});

	it('finds channels derived from more than one key', () => {
		expect([...model.channels.values()].some((c) => c.keys.length > 1)).toBe(true);
	});

	it('records the default readings', () => {
		expect(model.base.get('street-motorway')?.layers).toEqual(['street-motorway', 'street-motorway:outline']);
	});
});

describe('solveColors', () => {
	it.each(['gray', 'toner', 'muted'] as const)('recovers the %s palette from a style built with it', (palette) => {
		const truth = getPaletteColors(palette);
		const solved = solveColors(model, channels(osm({ colors: truth })), getPaletteColors('colorful'));
		const observed = colorOptionsKeys.filter((key) => solved.evidence.get(key)! >= FULL_EVIDENCE);
		expect(observed.length).toBeGreaterThan(35);
		for (const key of observed) {
			expect(colorDistance(solved.colors.get(key)!, parseRGBA(truth[key])), key).toBeLessThan(1);
		}
	});

	it('keeps the prior for keys nothing was observed for', () => {
		const prior = getPaletteColors('natural');
		const solved = solveColors(model, new Map(), prior);
		for (const key of colorOptionsKeys) {
			expect(solved.evidence.get(key)).toBe(0);
			expect(solved.residual.get(key)).toBe(Infinity);
			expect(colorDistance(solved.colors.get(key)!, parseRGBA(prior[key]))).toBeLessThan(0.5);
		}
	});

	it('ignores channels the model does not know', () => {
		const solved = solveColors(model, new Map([['nowhere/color', [1, 0, 0, 1]]]), getPaletteColors('colorful'));
		expect([...solved.evidence.values()].every((e) => e === 0)).toBe(true);
	});
});
