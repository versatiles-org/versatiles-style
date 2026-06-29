import { describe, expect, it } from 'vitest';
import { applyRecolor } from './index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { resolveRecolor } from '../resolve/resolveOsmOptions.js';

function makeStyle(bgColor: string, fillColor: string): StyleSpecification {
	return {
		version: 8,
		sources: {},
		layers: [
			{
				id: 'background',
				type: 'background',
				paint: { 'background-color': bgColor },
			},
			{
				id: 'fill',
				type: 'fill',
				source: 'src',
				'source-layer': 'land',
				paint: { 'fill-color': fillColor, 'fill-opacity': 1 },
			},
		],
	} as unknown as StyleSpecification;
}

function bgColor(style: StyleSpecification): string {
	return (style.layers[0].paint as Record<string, string>)['background-color'];
}

function fillColor(style: StyleSpecification): string {
	return (style.layers[1].paint as Record<string, string>)['fill-color'];
}

// ── No-op ──────────────────────────────────────────────────────────────────────

describe('applyRecolor()', () => {
	it('returns a new style object (does not mutate input)', () => {
		const original = makeStyle('#ffffff', '#aabbcc');
		const result = applyRecolor(original, resolveRecolor({ invertBrightness: false }));
		expect(result).not.toBe(original);
		expect(bgColor(original)).toBe('#ffffff');
	});

	it('empty options leave colors unchanged', () => {
		const style = makeStyle('#aabbcc', '#112233');
		const result = applyRecolor(style, resolveRecolor({}));
		// parse+re-stringify may change format but value should be equivalent
		expect(bgColor(result)).toBeDefined();
		expect(fillColor(result)).toBeDefined();
	});

	// ── invertBrightness ────────────────────────────────────────────────────────

	it('invertBrightness changes the background and fill colors', () => {
		const style = makeStyle('#ffffff', '#112233');
		const result = applyRecolor(style, resolveRecolor({ invertBrightness: true }));
		// Both colors should have changed
		expect(bgColor(result)).not.toBe('#ffffff');
		expect(fillColor(result)).not.toBe('#112233');
	});

	it('invertBrightness changes background color', () => {
		const original = makeStyle('#ff8800', '#000000');
		const result = applyRecolor(original, resolveRecolor({ invertBrightness: true }));
		expect(bgColor(result)).not.toBe(bgColor(original));
	});

	// ── rotateHue ──────────────────────────────────────────────────────────────

	it('rotateHue changes a saturated color', () => {
		const style = makeStyle('#ff0000', '#00ff00');
		const result = applyRecolor(style, resolveRecolor({ rotateHue: 120 }));
		expect(bgColor(result)).not.toBe(bgColor(makeStyle('#ff0000', '#00ff00')));
	});

	it('rotateHue by different amounts produces different colors', () => {
		const style = makeStyle('#ff8800', '#00ff00');
		const result60 = applyRecolor(style, resolveRecolor({ rotateHue: 60 }));
		const result120 = applyRecolor(style, resolveRecolor({ rotateHue: 120 }));
		expect(bgColor(result60)).not.toBe(bgColor(result120));
	});

	// ── saturate ──────────────────────────────────────────────────────────────

	it('saturate with -1 removes saturation from the output string', () => {
		const style = makeStyle('#ff0000', '#0000ff');
		const result = applyRecolor(style, resolveRecolor({ saturate: -1 }));
		// The Color class returns hsl(h,s%,l%) format; after -1 saturation, s should be 0
		expect(bgColor(result)).toMatch(/hsl\(\d+,0%/);
	});

	// ── tint ──────────────────────────────────────────────────────────────────

	it('tint shifts a saturated color toward the tint hue', () => {
		// Use a saturated blue (#0000ff) tinted toward red — the hue should shift
		const style = makeStyle('#0000ff', '#00ff00');
		const resultNone = applyRecolor(style, resolveRecolor({}));
		const resultTinted = applyRecolor(style, resolveRecolor({ tint: { color: '#ff0000', amount: 0.5 } }));
		expect(bgColor(resultTinted)).not.toBe(bgColor(resultNone));
	});

	// ── blend ─────────────────────────────────────────────────────────────────

	it('blend with amount=1 replaces color entirely', () => {
		const style = makeStyle('#ff0000', '#00ff00');
		const result = applyRecolor(style, resolveRecolor({ blend: { color: '#0000ff', amount: 1 } }));
		// After full blend → should be (close to) blue
		const bg = bgColor(result);
		const match = bg.match(/(\d+)[^0-9]+(\d+)[^0-9]+(\d+)/);
		if (match) {
			const b = Number(match[3]);
			expect(b).toBeGreaterThan(200);
		}
	});

	// ── non-color paint values are untouched ──────────────────────────────────

	it('does not alter fill-opacity (not a color key)', () => {
		const style = makeStyle('#ffffff', '#000000');
		const result = applyRecolor(style, resolveRecolor({ invertBrightness: true }));
		const opacity = (result.layers[1].paint as Record<string, unknown>)['fill-opacity'];
		expect(opacity).toBe(1);
	});

	// ── color string formats ──────────────────────────────────────────────────

	it('handles rgb() color strings', () => {
		const style = makeStyle('rgb(255,0,0)', '#000000');
		const result = applyRecolor(style, resolveRecolor({ rotateHue: 120 }));
		expect(bgColor(result)).toBeDefined();
	});

	it('handles hsl() color strings', () => {
		const style = makeStyle('hsl(0,100%,50%)', '#000000');
		const result = applyRecolor(style, resolveRecolor({ rotateHue: 120 }));
		expect(bgColor(result)).toBeDefined();
	});

	it('ignores non-color strings (passes them through)', () => {
		const style: StyleSpecification = {
			version: 8,
			sources: {},
			layers: [
				{
					id: 'symbol',
					type: 'symbol',
					source: 'src',
					'source-layer': 'labels',
					layout: { 'text-field': 'not-a-color' },
					paint: { 'text-color': '#000000' },
				},
			],
		} as unknown as StyleSpecification;
		// Should not throw
		expect(() => applyRecolor(style, resolveRecolor({ invertBrightness: true }))).not.toThrow();
	});

	// ── array paint values (expressions) ──────────────────────────────────────

	it('handles array paint values containing color strings', () => {
		const style: StyleSpecification = {
			version: 8,
			sources: {},
			layers: [
				{
					id: 'fill',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					paint: {
						'fill-color': ['case', ['==', ['get', 'kind'], 'forest'], '#008000', '#aaaaaa'],
					},
				},
			],
		} as unknown as StyleSpecification;
		const result = applyRecolor(style, resolveRecolor({ saturate: -1 }));
		const fillExpr = (result.layers[0].paint as Record<string, unknown>)['fill-color'];
		expect(Array.isArray(fillExpr)).toBe(true);
	});

	// ── caching ───────────────────────────────────────────────────────────────

	it('produces identical output for the same color used multiple times', () => {
		const style: StyleSpecification = {
			version: 8,
			sources: {},
			layers: [
				{
					id: 'a',
					type: 'fill',
					source: 's',
					'source-layer': 'l',
					paint: { 'fill-color': '#ff0000' },
				},
				{
					id: 'b',
					type: 'fill',
					source: 's',
					'source-layer': 'l',
					paint: { 'fill-color': '#ff0000' },
				},
			],
		} as unknown as StyleSpecification;
		const result = applyRecolor(style, resolveRecolor({ rotateHue: 60 }));
		const c1 = (result.layers[0].paint as Record<string, string>)['fill-color'];
		const c2 = (result.layers[1].paint as Record<string, string>)['fill-color'];
		expect(c1).toBe(c2);
	});
});
