import { describe, expect, it } from 'vitest';
import { applyRecolor, Color } from './index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { RecolorOptions } from '../types/index.js';
import { resolveRecolor } from '../resolve/resolveOsmOptions.js';

// applyRecolor() mutates the style in place (returns void), rewriting every paint `*-color`
// value through the resolved recolor transform. Colors are re-emitted via Color.asString()
// (so a no-op recolor still reformats #rrggbb → rgb()/hsl()), hence assertions compare the
// canonical RGB value rather than the exact string.

function makeStyle(bgColor: string, fillColor: string): StyleSpecification {
	return {
		version: 8,
		sources: {},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': bgColor } },
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

const bgColor = (style: StyleSpecification): string =>
	(style.layers[0].paint as Record<string, string>)['background-color'];
const fillColor = (style: StyleSpecification): string =>
	(style.layers[1].paint as Record<string, string>)['fill-color'];

// Canonical [r,g,b] of any color string, for value comparisons.
function toRGB(s: string): [number, number, number] {
	const str = Color.parse(s).asRGB().round().asString();
	const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!m) throw new Error(`not an rgb string: ${str}`);
	return [Number(m[1]), Number(m[2]), Number(m[3])];
}
const sameColor = (a: string, b: string): boolean => toRGB(a).join() === toRGB(b).join();

// Recolor a single bg color and return the resulting string.
function recolored(input: string, opt: RecolorOptions = {}): string {
	const style = makeStyle(input, '#000000');
	applyRecolor(style, resolveRecolor(opt));
	return bgColor(style);
}

describe('applyRecolor()', () => {
	it('mutates the style in place and returns nothing', () => {
		const style = makeStyle('#ffffff', '#aabbcc');
		const ret = applyRecolor(style, resolveRecolor({ invertBrightness: true }));
		expect(ret).toBeUndefined();
		expect(sameColor(bgColor(style), '#ffffff')).toBe(false); // input was changed in place
	});

	it('leaves color values unchanged with empty options (only reformats)', () => {
		const style = makeStyle('#aabbcc', '#112233');
		applyRecolor(style, resolveRecolor({}));
		expect(sameColor(bgColor(style), '#aabbcc')).toBe(true);
		expect(sameColor(fillColor(style), '#112233')).toBe(true);
	});

	// ── invertBrightness ──────────────────────────────────────────────────────────

	it('invertBrightness changes both background and fill colors', () => {
		const style = makeStyle('#ffffff', '#112233');
		applyRecolor(style, resolveRecolor({ invertBrightness: true }));
		expect(sameColor(bgColor(style), '#ffffff')).toBe(false);
		expect(sameColor(fillColor(style), '#112233')).toBe(false);
	});

	it('invertBrightness inverts white toward black', () => {
		const [r, g, b] = toRGB(recolored('#ffffff', { invertBrightness: true }));
		expect(Math.max(r, g, b)).toBeLessThan(64);
	});

	// ── rotateHue ────────────────────────────────────────────────────────────────

	it('rotateHue changes a saturated color', () => {
		expect(sameColor(recolored('#ff0000', { rotateHue: 120 }), '#ff0000')).toBe(false);
	});

	it('rotateHue by different amounts yields different colors', () => {
		expect(sameColor(recolored('#ff8800', { rotateHue: 60 }), recolored('#ff8800', { rotateHue: 120 }))).toBe(false);
	});

	it('rotateHue by 360° is a no-op on the value', () => {
		expect(sameColor(recolored('#ff8800', { rotateHue: 360 }), '#ff8800')).toBe(true);
	});

	// ── saturate ──────────────────────────────────────────────────────────────────

	it('saturate -1 desaturates to gray (r=g=b)', () => {
		const [r, g, b] = toRGB(recolored('#ff0000', { saturate: -1 }));
		expect(r).toBe(g);
		expect(g).toBe(b);
	});

	// ── tint ────────────────────────────────────────────────────────────────────

	it('tint shifts a saturated color toward the tint color', () => {
		const none = recolored('#0000ff');
		const tinted = recolored('#0000ff', { tint: { color: '#ff0000', amount: 0.5 } });
		expect(sameColor(tinted, none)).toBe(false);
		// red channel should increase as we tint toward red
		expect(toRGB(tinted)[0]).toBeGreaterThan(toRGB(none)[0]);
	});

	// ── blend ─────────────────────────────────────────────────────────────────────

	it('blend with amount=1 replaces the color with the blend color', () => {
		const [r, g, b] = toRGB(recolored('#ff0000', { blend: { color: '#0000ff', amount: 1 } }));
		expect(b).toBeGreaterThan(200);
		expect(r).toBeLessThan(64);
		expect(g).toBeLessThan(64);
	});

	// ── non-color paint values are untouched ──────────────────────────────────────

	it('does not alter fill-opacity (not a color key)', () => {
		const style = makeStyle('#ffffff', '#000000');
		applyRecolor(style, resolveRecolor({ invertBrightness: true }));
		expect((style.layers[1].paint as Record<string, unknown>)['fill-opacity']).toBe(1);
	});

	// ── color string formats ────────────────────────────────────────────────────

	it('handles rgb() input strings', () => {
		expect(sameColor(recolored('rgb(255,0,0)', { rotateHue: 120 }), recolored('#ff0000', { rotateHue: 120 }))).toBe(
			true
		);
	});

	it('handles hsl() input strings', () => {
		expect(sameColor(recolored('hsl(0,100%,50%)', { rotateHue: 120 }), recolored('#ff0000', { rotateHue: 120 }))).toBe(
			true
		);
	});

	it('ignores non-color strings (passes them through)', () => {
		const style = {
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
		expect(() => applyRecolor(style, resolveRecolor({ invertBrightness: true }))).not.toThrow();
		expect((style.layers[0].layout as Record<string, unknown>)['text-field']).toBe('not-a-color');
	});

	// ── array paint values (expressions) ──────────────────────────────────────────

	it('recolors color strings inside array paint expressions', () => {
		const style = {
			version: 8,
			sources: {},
			layers: [
				{
					id: 'fill',
					type: 'fill',
					source: 'src',
					'source-layer': 'land',
					paint: { 'fill-color': ['case', ['==', ['get', 'kind'], 'forest'], '#008000', '#aaaaaa'] },
				},
			],
		} as unknown as StyleSpecification;
		applyRecolor(style, resolveRecolor({ saturate: -1 }));
		const expr = (style.layers[0].paint as Record<string, unknown>)['fill-color'] as unknown[];
		expect(Array.isArray(expr)).toBe(true);
		expect(expr[0]).toBe('case');
		// the embedded colors are desaturated to gray
		const [r, g, b] = toRGB(expr[3] as string);
		expect(r).toBe(g);
		expect(g).toBe(b);
	});

	// ── caching ───────────────────────────────────────────────────────────────────

	it('produces identical output for the same color used multiple times', () => {
		const style = makeStyle('#ff0000', '#ff0000');
		applyRecolor(style, resolveRecolor({ rotateHue: 60 }));
		expect(bgColor(style)).toBe(fillColor(style));
	});
});
