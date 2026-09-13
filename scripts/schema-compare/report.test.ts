import { describe, expect, it } from 'vitest';
import type { Results, ViewResult } from './baseline.js';
import { formatCountDelta, formatDelta, formatPercent, imageName, renderReport } from './report.js';

const group = (iou: number, area = 0.1) => ({
	'shortbread~omt': { a: area, b: area, iou: 1 },
	'shortbread~protomaps': { a: area, b: area / 3, iou },
	'omt~protomaps': { a: area, b: area / 3, iou },
});

const view = (overrides: Partial<ViewResult> = {}): ViewResult => ({
	view: 'berlin-z14',
	complete: true,
	failures: [],
	geometry: { 'shortbread~omt': 0.01, 'shortbread~protomaps': 0.04, 'omt~protomaps': 0.04 },
	full: { 'shortbread~omt': 0.02, 'shortbread~protomaps': 0.05, 'omt~protomaps': 0.05 },
	classes: {
		shortbread: { forest: 0.3, rock: 0.1 },
		omt: { forest: 0.3, rock: 0.1 },
		protomaps: { forest: 0.3, rock: 0 },
	},
	groups: { 'roads.footway': group(0.4), 'water.rivers': group(0.95) },
	...overrides,
});
const results = (...views: ViewResult[]): Results => ({ builds: { protomaps: 'build <1>' }, views });

describe('formatting', () => {
	it('formats shares and their changes', () => {
		expect(formatPercent(undefined)).toBe('–');
		expect(formatPercent(0.0004)).toBe('<0.1');
		expect(formatPercent(0.064)).toBe('6.4');
		expect(formatPercent(0.158)).toBe('16');

		expect(formatDelta(0.04, 0.06)).toBe('<span class="delta better">−2.0</span>');
		expect(formatDelta(0.06, 0.04)).toBe('<span class="delta worse">+2.0</span>');
		expect(formatDelta(0.6, 0.4, true)).toBe('<span class="delta better">+20.0</span>');
		expect(formatDelta(0.0401, 0.04)).toBe('<span class="delta same">±0</span>');
		expect(formatDelta(0.04, undefined)).toBe('');

		expect(formatCountDelta(3, 5)).toBe('<span class="delta better">−2</span>');
		expect(formatCountDelta(5, 5)).toBe('<span class="delta same">±0</span>');
		expect(formatCountDelta(5, undefined)).toBe('');
	});
});

describe('renderReport', () => {
	it('shows renders, diffs and group overlays of every view, escaped', () => {
		const html = renderReport({ results: results(view()), passes: ['geometry', 'full', 'sentinel'] });
		expect(html).toContain(`src="${imageName('berlin-z14', 'geometry', 'protomaps')}"`);
		expect(html).toContain(`src="${imageName('berlin-z14', 'full', 'shortbread~protomaps')}"`);
		expect(html).toContain(`src="${imageName('berlin-z14', 'sentinel', 'omt')}"`);
		expect(html).not.toContain(imageName('berlin-z14', 'sentinel', 'shortbread~omt'));
		// only the differing group gets an overlay
		expect(html).toContain(`src="${imageName('berlin-z14', 'group', 'roads.footway')}"`);
		expect(html).not.toContain(imageName('berlin-z14', 'group', 'water.rivers'));
		expect(html).toContain('build &lt;1&gt;');
		expect(html).toContain('no baseline yet');
		expect(html).not.toContain('class="delta better"');
	});

	it('shows every number with its change against the baseline', () => {
		const now = view({
			geometry: { 'shortbread~omt': 0.01, 'shortbread~protomaps': 0.02, 'omt~protomaps': 0.04 },
			groups: { 'roads.footway': group(0.95), 'water.rivers': group(0.5) },
		});
		const html = renderReport({
			results: results(now),
			baseline: results(view()),
			findings: [{ view: 'berlin-z14', kind: 'improvement', message: 'geometry shortbread~protomaps: 4.0 % → 2.0 %' }],
			passes: ['geometry'],
		});
		expect(html).toContain('<span class="delta better">−2.0</span>'); // pixels closer together
		expect(html).toContain('<span class="delta worse">−45.0</span>'); // rivers overlap dropped
		expect(html).toContain('<span class="delta better">+55.0</span>'); // footway overlap rose
		expect(html).toContain('<tr class="resolved">'); // footway no longer differs, still listed
		expect(html).toContain('1 better');
	});
});
