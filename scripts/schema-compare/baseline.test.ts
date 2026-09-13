import { describe, expect, it } from 'vitest';
import { compareToBaseline, nextBaseline, type Results, type ViewResult } from './baseline.js';

const view = (overrides: Partial<ViewResult> = {}): ViewResult => ({
	view: 'berlin-z14',
	complete: true,
	failures: [],
	geometry: { 'shortbread~omt': 0.05, 'shortbread~protomaps': 0.06, 'omt~protomaps': 0.04 },
	full: { 'shortbread~omt': 0.1 },
	classes: {
		shortbread: { forest: 0.3, rock: 0.1 },
		omt: { forest: 0.29, rock: 0.09 },
		protomaps: { forest: 0.3, rock: 0.1 },
	},
	...overrides,
});
const results = (...views: ViewResult[]): Results => ({ builds: {}, views });

describe('compareToBaseline', () => {
	it('finds nothing when a run matches the baseline within tolerance', () => {
		const now = view({ geometry: { 'shortbread~omt': 0.06 } });
		expect(compareToBaseline(results(now), results(view()))).toEqual([]);
	});

	it('reports pixel regressions and improvements beyond tolerance', () => {
		const now = view({ geometry: { 'shortbread~omt': 0.1, 'omt~protomaps': 0.01 }, full: { 'shortbread~omt': 0.2 } });
		const findings = compareToBaseline(results(now), results(view()));
		expect(findings).toEqual([
			{ view: 'berlin-z14', kind: 'regression', message: 'geometry shortbread~omt: 5.0 % → 10.0 % differing pixels' },
			{ view: 'berlin-z14', kind: 'improvement', message: 'geometry omt~protomaps: 4.0 % → 1.0 % differing pixels' },
			{ view: 'berlin-z14', kind: 'regression', message: 'full shortbread~omt: 10.0 % → 20.0 % differing pixels' },
		]);
	});

	it('reports a class drifting apart between two schemas', () => {
		const now = view({ classes: { ...view().classes, omt: { forest: 0.29, rock: 0 } } });
		const findings = compareToBaseline(results(now), results(view()));
		expect(findings).toEqual([
			{ view: 'berlin-z14', kind: 'regression', message: '"rock" shortbread vs omt: 1.0 % → 10.0 % apart' },
			{ view: 'berlin-z14', kind: 'regression', message: '"rock" omt vs protomaps: 1.0 % → 10.0 % apart' },
		]);
	});

	it('does not judge incomplete views or views the baseline lacks', () => {
		const worse = { geometry: { 'shortbread~omt': 0.9 } };
		expect(compareToBaseline(results(view({ ...worse, complete: false })), results(view()))).toEqual([]);
		expect(compareToBaseline(results(view({ ...worse, view: 'new' })), results(view()))).toEqual([]);
	});
});

describe('nextBaseline', () => {
	it('keeps the notes of the previous baseline', () => {
		const previous = results(view({ note: 'OpenMapTiles has no rock at this zoom' }));
		const saved = nextBaseline(results(view(), view({ view: 'other' })), previous);
		expect(saved.views.map((v) => v.note)).toEqual(['OpenMapTiles has no rock at this zoom', undefined]);
	});
});
