import { describe, expect, it } from 'vitest';
import { NativeMap } from './native-render.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/**
 * The native engine reports a colour it cannot read, instead of quietly drawing nothing.
 *
 * mbgl treats an unreadable colour as a warning, not an error: it renders the layer fully transparent
 * and reports success. Before `NativeMap` collected those warnings, a style could lose an entire layer
 * in every screenshot with nothing in the output to say so — and the two colours below that do it are
 * ones `validateStyleMin` accepts, because the JS parser reads CSS the C++ parser never learned.
 */

const style = (color: string): StyleSpecification => ({
	version: 8,
	sources: {},
	layers: [{ id: 'bg', type: 'background', paint: { 'background-color': color } }],
});

async function render(color: string) {
	const map = new NativeMap(style(color), { offline: true });
	try {
		return await map.render({ center: [0, 0], zoom: 0, width: 4, height: 4 });
	} finally {
		map.release();
	}
}

describe('NativeMap colour warnings', () => {
	it.each(['#ff0000', 'rgb(255,0,0)', 'rgba(255,0,0,1)', 'hsl(0,100%,50%)'])(
		'renders %s and reports nothing',
		async (color) => {
			const { pixels, failures } = await render(color);
			expect(failures).toStrictEqual([]);
			expect([...pixels.slice(0, 4)]).toStrictEqual([255, 0, 0, 255]);
		}
	);

	it.each([
		['oklch(0.7 0.15 45)', 'a space the native parser does not have'],
		['rgb(128 0 0)', 'CSS Color 4 space-separated syntax, which validateStyleMin accepts'],
		['rebeccapurple', 'the one named colour the native table is missing'],
	])('reports %s — %s', async (color) => {
		const { pixels, failures } = await render(color);
		expect(failures.join('\n')).toMatch(/ParseStyle/);
		// the layer really did vanish: fully transparent, which is what made this silent before
		expect([...pixels.slice(0, 4)]).toStrictEqual([0, 0, 0, 0]);
	});
});
