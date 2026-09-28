import { describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import { Color } from '../color/index.js';
import type { RecolorOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';

/**
 * `recolor` must reach every colour a style emits.
 *
 * `src/color/recolor.test.ts` checks the transforms on single colours; this checks their reach. Blending
 * fully toward one colour is the probe: `blend(1, x)` returns exactly `x`, alpha included, so after it
 * every colour in the style has to be that colour, and any other one is a colour the walker missed.
 *
 * The colours are found independently of `applyRecolor`: the whole style is walked — paint, layout,
 * sky, expressions, nested objects — and every string that parses as a colour counts. Reusing the
 * walker's own `*-color` key test would only ever confirm it.
 */

const TARGET = '#123456';
const RECOLOR: RecolorOptions = { blend: { color: TARGET, amount: 1 } };

/** Every string anywhere in `value` that parses as a colour. */
function collectColors(value: unknown, path: string, found: { path: string; value: string }[] = []) {
	if (typeof value === 'string') {
		try {
			Color.parse(value);
			found.push({ path, value });
		} catch {
			// not a colour
		}
	} else if (Array.isArray(value)) {
		value.forEach((item, index) => collectColors(item, `${path}[${index}]`, found));
	} else if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) collectColors(child, `${path}.${key}`, found);
	}
	return found;
}

/** Colours in the style that are not the blend target, as `path: value` lines. */
function missedColors(style: StyleSpecification, layers = style.layers): string[] {
	// `style.light` is left alone on purpose: its colour is an illuminant, and recolouring it turns the
	// light off rather than changing the map's colours (see `applyRecolor`).
	const colors = [
		...layers.flatMap((layer) => collectColors(layer, `layers[${layer.id}]`)),
		...collectColors(style.sky, 'sky'),
	];
	expect(colors.length, 'the style should contain colours at all').toBeGreaterThan(0);
	const target = Color.parse(TARGET).asHex();
	return colors.filter(({ value }) => Color.parse(value).asHex() !== target).map((c) => `${c.path}: ${c.value}`);
}

const ARCHIVE = 'pmtiles://https://example.org/x.pmtiles';

describe('recolor reaches every colour', () => {
	describe('osm()', () => {
		it.each(osm.palettes)('%s', (theme) => {
			const style = osm({
				theme,
				recolor: RECOLOR,
				sky: true,
				features: { terrain: true, hillshade: true, landcover: true, buildings: 'extruded' },
			});
			expect(missedColors(style)).toStrictEqual([]);
		});
	});

	it('omt()', () => {
		expect(missedColors(omt({ recolor: RECOLOR, sky: true }))).toStrictEqual([]);
	});

	it('protomaps()', () => {
		expect(missedColors(protomaps({ urls: { protomaps: ARCHIVE }, recolor: RECOLOR, sky: true }))).toStrictEqual([]);
	});

	it('satellite() osmOverlay', () => {
		const style = satellite({ osmOverlay: { recolor: RECOLOR } });
		const overlay = satellite({ osmOverlay: {} });
		// The overlay's recolor is its own: the satellite's background and sky are not part of it.
		const own = new Set(satellite({ osmOverlay: false }).layers.map((layer) => layer.id));
		expect(overlay.layers.length).toBeGreaterThan(own.size);
		const overlayLayers = style.layers.filter((layer) => !own.has(layer.id));
		expect(missedColors({ ...style, sky: undefined }, overlayLayers)).toStrictEqual([]);
	});
});
