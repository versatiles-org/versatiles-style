import { describe, expect, it } from 'vitest';
import { buildContext } from '../context.js';
import { resolveOsm } from '../../options/index.js';
import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../build.js';
import { background } from './background.js';
import { landcover } from './landcover.js';
import { water } from './water.js';
import { sites } from './sites.js';
import { airport } from './airport.js';
import { buildings, buildings3d } from './buildings.js';
import { roads } from './roads.js';
import { pois } from './pois.js';
import { boundaries } from './boundaries.js';
import { markings } from './markings.js';
import { transitStops } from './transitstops.js';
import { labels } from './labels.js';

// Contract tests for each layer generator in isolation (previously they were only exercised
// via full-style builds). Each generator is a pure function of the LayerContext, yielding
// TaggedLayers. We assert per-generator structural contracts and snapshot the yielded ids so a
// rename/removal is a reviewable diff.

const ctx: LayerContext = buildContext(resolveOsm());
// buildings3d only emits when buildings are extruded.
const ctxExtruded: LayerContext = buildContext(resolveOsm({ features: { buildings: 'extruded' } }));

const GENERATORS: [string, (ctx: LayerContext) => Generator<TaggedLayer>, LayerContext][] = [
	['background', background, ctx],
	['landcover', landcover, ctx],
	['water', water, ctx],
	['sites', sites, ctx],
	['airport', airport, ctx],
	['buildings', buildings, ctx],
	['buildings3d', buildings3d, ctxExtruded],
	['roads', roads, ctx],
	['pois', pois, ctx],
	['boundaries', boundaries, ctx],
	['markings', markings, ctx],
	['transitStops', transitStops, ctx],
	['labels', labels, ctx],
];

const COLORED_TYPES = new Set(['fill', 'line', 'fill-extrusion', 'background']);

describe.each(GENERATORS)('generator: %s', (name, gen, genCtx) => {
	const tagged = [...gen(genCtx)];
	const layers = tagged.map((t) => t.layer as unknown as Record<string, unknown>);

	it('yields at least one layer', () => {
		expect(tagged.length).toBeGreaterThan(0);
	});

	it('every layer has a non-empty id and a valid type', () => {
		for (const l of layers) {
			expect(typeof l.id).toBe('string');
			expect((l.id as string).length).toBeGreaterThan(0);
			expect(['background', 'fill', 'line', 'symbol', 'fill-extrusion']).toContain(l.type);
		}
	});

	it('ids are unique within the generator', () => {
		const ids = layers.map((l) => l.id as string);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('every non-background layer names a source-layer', () => {
		for (const l of layers) {
			if (l.type === 'background') continue;
			expect(l['source-layer'], `${l.id as string} missing source-layer`).toBeTruthy();
		}
	});

	it('every colored layer defines its color (no black fallback)', () => {
		for (const l of layers) {
			if (!COLORED_TYPES.has(l.type as string)) continue;
			const paint = (l.paint ?? {}) as Record<string, unknown>;
			const colorKey = `${l.type === 'fill-extrusion' ? 'fill-extrusion' : l.type}-color`;
			expect(paint[colorKey], `${l.id as string} missing ${colorKey}`).toBeDefined();
		}
	});

	it('yielded layer ids are stable', () => {
		expect(layers.map((l) => `${l.type as string}:${l.id as string}`)).toMatchSnapshot();
	});
});
