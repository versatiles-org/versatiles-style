import { describe, expect, it } from 'vitest';
import { renderReport, worstPerZoom, type BoundaryRow, type Pair, type ReportData } from './report.js';

const pair = (share: number, controlShare = 0): Pair => ({ share, max: 10, controlShare, controlMax: 5 });

const rows: BoundaryRow[] = [
	{ place: 'city', zoom: 5, sets: { all: pair(0.1), dark: pair(0.3) } },
	{ place: 'coast', zoom: 5, sets: { all: pair(0.2), dark: pair(0.05) } },
	{ place: 'city', zoom: 6, sets: { all: pair(0.04) } },
];

const data: ReportData = {
	version: '1.2.3',
	width: 512,
	height: 512,
	epsilon: 0.001,
	changedAbove: 8,
	projection: 'mercator',
	landcover: false,
	themes: { light: 'colorful' },
	places: [{ name: 'city', center: [1, 2] }],
	boundaries: rows,
	bounds: [
		{ id: 'small', type: 'line', bound: 'minzoom', zoom: 9, place: 'city', share: 0.01, max: 20 },
		{ id: 'large', type: 'symbol', bound: 'maxzoom', zoom: 4, place: 'city', share: 0.5, max: 200 },
	],
	failures: [],
};

describe('worstPerZoom', () => {
	it('takes the largest of each set per zoom, whichever place it is at', () => {
		const [five, six] = worstPerZoom(rows);
		expect(five.zoom).toBe(5);
		expect(five.sets.all?.share).toBe(0.2);
		expect(five.sets.dark?.share).toBe(0.3);
		expect(six.sets.all?.share).toBe(0.04);
	});
});

describe('renderReport', () => {
	it('shows the numbers', () => {
		const html = renderReport(data);
		expect(html).toContain('20.00%');
		expect(html).toContain('MapLibre GL JS 1.2.3');
	});

	it('lists the layers with hard bounds, largest first', () => {
		const html = renderReport(data);
		expect(html.indexOf('>large<')).toBeLessThan(html.indexOf('>small<'));
	});

	it('shows the images of the largest change first', () => {
		const html = renderReport(data);
		expect(html.indexOf('coast.z5.diff.png')).toBeLessThan(html.indexOf('city.z5.diff.png'));
	});

	it('adds a baseline column only when there is a baseline', () => {
		expect(renderReport(data)).not.toContain('baseline');
		expect(renderReport(data, [{ place: 'coast', zoom: 5, sets: { all: pair(0.75) } }])).toContain('75.00%');
	});

	it('reports failures', () => {
		expect(renderReport({ ...data, failures: ['x'] })).toContain('1 render failures');
		expect(renderReport(data)).not.toContain('render failures');
	});

	it('escapes what it is given', () => {
		const html = renderReport({ ...data, bounds: [{ ...data.bounds[0], id: '<x>' }] });
		expect(html).not.toContain('<x>');
	});
});
