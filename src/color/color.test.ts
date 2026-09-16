import { describe, expect, it } from 'vitest';
import { Color } from './color.js';
import { ColorParseError } from './parser.js';
import type { Space } from './space.js';

const SPACES: Space[] = ['srgb', 'hsl', 'hwb', 'hsv', 'oklab', 'oklch'];
const red = Color.srgb(255, 0, 0);
const white = Color.srgb(255, 255, 255);
const black = Color.srgb(0, 0, 0);
const grey = Color.srgb(128, 128, 128);

describe('construction', () => {
	it('builds from every space', () => {
		expect(Color.srgb(255, 0, 0).asHex()).toBe('#FF0000');
		expect(Color.hsl(0, 100, 50).asHex()).toBe('#FF0000');
		expect(Color.hwb(0, 0, 0).asHex()).toBe('#FF0000');
		expect(Color.hsv(0, 100, 100).asHex()).toBe('#FF0000');
		expect(Color.oklch(0.6279554, 0.2576833, 29.2338851).asHex()).toBe('#FF0000');
	});

	it('normalises on the way in', () => {
		expect(Color.srgb(-10, 300, 128).coords).toStrictEqual([0, 255, 128]);
		expect(Color.hsl(-30, 50, 50).coords[0]).toBe(330);
		expect(Color.srgb(0, 0, 0, 5).alpha).toBe(1);
		expect(Color.srgb(0, 0, 0, -5).alpha).toBe(0);
	});

	it('parses, and passes a Color straight through', () => {
		expect(Color.parse('#ff0000').asHex()).toBe('#FF0000');
		expect(Color.parse('oklch(0.7 0.15 45)').space).toBe('oklch');
		expect(Color.parse(red)).toBe(red);
	});

	it('throws a named error on bad input', () => {
		expect(() => Color.parse('steelblue')).toThrow(ColorParseError);
		expect(() => Color.parse('steelblue')).toThrow('named colours are not supported');
	});

	it('is frozen, and every method returns a new instance', () => {
		expect(Object.isFrozen(red)).toBe(true);
		const transformed = [
			red.fade(0.5),
			red.opaque(),
			red.blend(0.5, white),
			red.lighten(0.5),
			red.darken(0.5),
			red.saturate(0.5),
			red.rotateHue(30),
			red.invertLuminosity(),
			red.invert(),
			red.gamma(2),
			red.contrast(2),
			red.brightness(0.5),
			red.setHue(120),
			red.tint(0.5, Color.srgb(0, 0, 255)),
			red.over(white.fade(0.5)),
			red.colorize(Color.srgb(0, 0, 255, 0.5)),
			red.mix(white),
			red.round(),
			red.toGamut(),
		];
		for (const result of transformed) {
			expect(result).toBeInstanceOf(Color);
			expect(result).not.toBe(red);
		}
		expect(red.asHex()).toBe('#FF0000'); // the receiver is untouched
	});
});

describe('conversion and access', () => {
	it('returns itself when converting to its own space', () => {
		expect(red.to('srgb')).toBe(red);
	});

	it.each(SPACES)('round-trips through %s', (space) => {
		expect(Color.srgb(12, 34, 56).to(space).to('srgb').round().asHex()).toBe('#0C2238');
	});

	it('names channels as its space names them', () => {
		expect(Object.keys(red.srgb)).toStrictEqual(['r', 'g', 'b', 'alpha']);
		expect(Object.keys(red.oklch)).toStrictEqual(['l', 'c', 'h', 'alpha']);
		expect(Object.keys(red.hwb)).toStrictEqual(['h', 'w', 'b', 'alpha']);
		expect(red.srgb.r).toBe(255);
		expect(red.hsl.h).toBe(0);
	});

	it('carries alpha through every conversion', () => {
		const translucent = Color.srgb(255, 0, 0, 0.25);
		for (const space of SPACES) expect(translucent.to(space).alpha, space).toBe(0.25);
	});
});

describe('with()', () => {
	it('replaces channels by name, in the colour own space', () => {
		expect(Color.hsl(120, 50, 50).with({ l: 80 }).hsl.l).toBe(80);
		expect(red.with({ alpha: 0.5 }).alpha).toBe(0.5);
	});

	it('lightens in OKLCh without touching hue or chroma', () => {
		const lighter = red.to('oklch').with({ l: 0.8 });
		expect(lighter.oklch.l).toBe(0.8);
		expect(lighter.oklch.h).toBeCloseTo(red.to('oklch').oklch.h, 6);
	});

	it('ignores undefined, and names the real channels when given a wrong one', () => {
		expect(red.with({ r: undefined }).asHex()).toBe('#FF0000');
		expect(() => red.with({ h: 120 })).toThrow('srgb has no channel "h" — its channels are r, g, b');
	});
});

describe('output', () => {
	it('always writes styles in sRGB, whatever space it is held in', () => {
		// the v6 leak: invertLuminosity() returned an HSL, whose asString() wrote hsl(), so four
		// marking-* layers in every style were hsl() while everything else was rgb()
		expect(white.invertLuminosity().asString()).toMatch(/^rgb\(/);
		expect(Color.oklch(0.7, 0.15, 45).asString()).toMatch(/^rgb\(/);
		expect(Color.hsl(120, 50, 50).asString()).toBe('rgb(64,191,64)');
	});

	it('writes hex, CSS and JSON', () => {
		expect(red.asHex()).toBe('#FF0000');
		expect(red.asString()).toBe('rgb(255,0,0)');
		expect(red.toCSS()).toBe('rgb(255 0 0)');
		expect(red.toCSS('oklch')).toBe('oklch(0.62796 0.25768 29.23389)');
		expect(`${red}`).toBe('rgb(255,0,0)');
		expect(JSON.stringify({ color: red })).toBe('{"color":"rgb(255,0,0)"}');
	});

	it('rounds sRGB to integers and everything else to decimals', () => {
		expect(Color.srgb(10.6, 20.4, 30.5).round().asArray()).toStrictEqual([11, 20, 31, 1]);
		expect(Color.oklch(0.123456, 0.15, 45).round(3).asArray()).toStrictEqual([0.123, 0.15, 45, 1]);
	});
});

describe('measurement', () => {
	it('measures WCAG luminance and contrast', () => {
		expect(white.luminance()).toBeCloseTo(1, 6);
		expect(black.luminance()).toBeCloseTo(0, 6);
		expect(white.contrastRatio(black)).toBeCloseTo(21, 6);
		expect(black.contrastRatio(white)).toBeCloseTo(21, 6); // order does not matter
		expect(red.contrastRatio(red)).toBe(1);
	});

	it('measures perceptual distance', () => {
		expect(red.deltaEOK(red)).toBe(0);
		expect(black.deltaEOK(white)).toBeCloseTo(1, 3);
		expect(red.deltaEOK(red.to('oklch'))).toBeLessThan(1e-12);
	});

	it('knows what a screen can show', () => {
		expect(red.inGamut()).toBe(true);
		expect(Color.oklch(0.7, 0.4, 145).inGamut()).toBe(false);
		expect(Color.oklch(0.7, 0.4, 145).toGamut().inGamut()).toBe(true);
	});

	it('knows when a hue means nothing', () => {
		expect(grey.to('oklch').hasPowerlessHue()).toBe(true);
		expect(red.to('oklch').hasPowerlessHue()).toBe(false);
	});
});

describe('mix()', () => {
	it('returns the ends unchanged', () => {
		expect(red.mix(white, 0).deltaEOK(red)).toBeLessThan(1e-9);
		expect(red.mix(white, 1).deltaEOK(white)).toBeLessThan(1e-9);
	});

	it('interpolates in OKLab by default', () => {
		expect(red.mix(white).space).toBe('oklab');
		expect(red.mix(white, 0.5, { space: 'srgb' }).space).toBe('srgb');
		expect(red.mix(white, 0.5, { space: 'srgb' }).asString()).toBe('rgb(255,128,128)');
	});

	it('takes the short way round a hue circle, or the long way when asked', () => {
		// 350° to 10° is 20° apart the short way, 340° the long way
		const from = Color.hsl(350, 100, 50);
		const to = Color.hsl(10, 100, 50);
		expect(from.mix(to, 0.5, { space: 'hsl' }).hsl.h).toBeCloseTo(0, 6);
		expect(from.mix(to, 0.5, { space: 'hsl', hue: 'longer' }).hsl.h).toBeCloseTo(180, 6);
		expect(from.mix(to, 0.5, { space: 'hsl', hue: 'increasing' }).hsl.h).toBeCloseTo(0, 6);
		expect(from.mix(to, 0.5, { space: 'hsl', hue: 'decreasing' }).hsl.h).toBeCloseTo(180, 6);
	});

	it('premultiplies alpha, so a transparent end does not drag the colour', () => {
		// mixing red with transparent white: the result should still be red, only fainter
		const faded = red.mix(Color.srgb(255, 255, 255, 0), 0.5, { space: 'srgb' });
		expect(faded.alpha).toBe(0.5);
		expect(faded.srgb.r).toBeCloseTo(255, 6);
		expect(faded.srgb.g).toBeCloseTo(0, 6);
	});
});

describe('the cartographic vocabulary', () => {
	it('fades and restores alpha', () => {
		expect(red.fade(0.5).alpha).toBe(0.5);
		expect(red.fade(0.5).opaque().alpha).toBe(1);
		expect(red.fade(0.5).asString()).toBe('rgba(255,0,0,0.5)');
	});

	it('composites source-over', () => {
		expect(black.over(white.fade(0.5)).asString()).toBe('rgb(128,128,128)');
		expect(black.over(white).asString()).toBe('rgb(255,255,255)');
		expect(Color.srgb(0, 0, 0, 0).over(Color.srgb(0, 0, 0, 0)).alpha).toBe(0);
	});

	it('blends in sRGB', () => {
		expect(black.blend(0.5, white).asString()).toBe('rgb(128,128,128)');
		expect(black.blend(0, white).asHex()).toBe('#000000');
		expect(black.blend(1, white).asHex()).toBe('#FFFFFF');
	});

	it('keeps hue and saturation when colorizing, and takes lightness from the base', () => {
		const colorized = grey.colorize(Color.srgb(0, 0, 255, 1));
		expect(colorized.hsl.h).toBeCloseTo(240, 3);
		expect(colorized.hsl.l).toBeCloseTo(grey.hsl.l, 3);
	});

	it('inverts, gammas, contrasts and brightens as v6 did', () => {
		expect(red.invert().asHex()).toBe('#00FFFF');
		expect(grey.gamma(2).asString()).toBe('rgb(64,64,64)');
		expect(grey.contrast(0).asString()).toBe('rgb(128,128,128)');
		expect(white.contrast(2).asHex()).toBe('#FFFFFF');
		expect(red.brightness(-1).asHex()).toBe('#000000');
		expect(red.brightness(1).asHex()).toBe('#FFFFFF');
	});

	it('inverts luminosity while keeping hue', () => {
		const inverted = Color.hsl(200, 50, 20).invertLuminosity();
		expect(inverted.hsl.h).toBeCloseTo(200, 6);
		expect(inverted.hsl.l).toBeCloseTo(80, 6);
	});

	it('rotates hue, saturates and sets hue', () => {
		expect(red.rotateHue(120).asHex()).toBe('#00FF00');
		expect(red.rotateHue(-120).asHex()).toBe('#0000FF');
		expect(Color.hsl(0, 50, 50).saturate(1).hsl.s).toBe(100);
		expect(Color.hsl(0, 50, 50).saturate(10).hsl.s).toBe(100); // clamps
		expect(red.setHue(240).asHex()).toBe('#0000FF');
	});
});

describe('v6 bugs, fixed', () => {
	it('tinting toward a colour with no hue leaves the colour alone', () => {
		// v6 read white, black and grey as hue 0°, so tinting toward any of them went red:
		// new RGB(50,100,200).tint(1, black) gave #C83232
		const blue = Color.srgb(50, 100, 200);
		for (const target of [white, black, grey]) {
			expect(blue.tint(1, target).asHex(), target.asHex()).toBe('#3264C8');
		}
		// a real hue still tints
		expect(blue.tint(1, red).asHex()).not.toBe('#3264C8');
	});

	it('blending interpolates alpha too', () => {
		// v6 kept the base alpha, so blend(1, transparent) returned an opaque colour
		expect(Color.srgb(0, 0, 0, 1).blend(1, Color.srgb(255, 255, 255, 0)).alpha).toBe(0);
		expect(Color.srgb(0, 0, 0, 1).blend(0.5, Color.srgb(255, 255, 255, 0)).alpha).toBe(0.5);
	});

	it('clamps the lighten and darken ratio', () => {
		// v6 clamped neither: RGB(200,100,50).lighten(-1) gave [145,0,0] and darken(-1) brightened
		expect(Color.srgb(200, 100, 50).lighten(-1).asHex()).toBe('#C86432');
		expect(Color.srgb(100, 100, 50).darken(-1).asHex()).toBe('#646432');
		expect(Color.srgb(100, 100, 50).lighten(2).asHex()).toBe('#FFFFFF');
		expect(Color.srgb(100, 100, 50).darken(2).asHex()).toBe('#000000');
	});

	it('keeps an alpha spelling that matches the alpha it prints', () => {
		expect(Color.srgb(1, 2, 3, 0.9999).asString()).toBe('rgb(1,2,3)');
	});

	it('does not lose precision through an integer HSL round trip', () => {
		// v6's recolor wrote HSL-returning transforms as hsl(h,s%,l%) with whole numbers, costing up to
		// 4/255 per channel; here the colour is written from sRGB whatever space it was computed in
		const start = Color.parse('#17F715');
		expect(start.rotateHue(0.0001).round().asHex()).toBe('#17F715');
	});
});
