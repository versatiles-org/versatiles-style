import { describe, expect, it } from 'vitest';
import { getStyleVariants, type StyleVariant } from './variants.js';
import type { StyleSpecification } from './types/index.js';
import type { OsmFeaturesOptions } from './options/index.js';

function byName(variants: StyleVariant[], name: string): StyleVariant {
	const v = variants.find((x) => x.name === name);
	if (!v) throw new Error(`variant "${name}" not found`);
	return v;
}

function layerIds(style: StyleSpecification): string[] {
	return style.layers.map((l) => l.id);
}

async function build(features: OsmFeaturesOptions | undefined, name: string): Promise<StyleSpecification> {
	return byName(getStyleVariants(features), name).build();
}

describe('getStyleVariants()', () => {
	// ── Structure ─────────────────────────────────────────────────────────────

	it('returns the expected set of variant names', () => {
		const names = getStyleVariants().map((v) => v.name);
		// 5 palettes × 7 osm variants + 8 satellite variants
		expect(names).toHaveLength(5 * 7 + 8);
		expect(new Set(names).size).toBe(names.length); // all unique

		for (const palette of ['colorful', 'natural', 'muted', 'gray', 'toner']) {
			expect(names).toContain(`${palette}/style`);
			expect(names).toContain(`${palette}/en`);
			expect(names).toContain(`${palette}/de`);
			expect(names).toContain(`${palette}/nolabel`);
			expect(names).toContain(`${palette}-terrain/style`);
		}
		expect(names).toContain('satellite/style');
		expect(names).toContain('satellite/nooverlay');
		expect(names).toContain('terrain/nooverlay');
	});

	it('every variant builds a valid MapLibre style', async () => {
		const variants = getStyleVariants();
		const styles = await Promise.all(variants.map((v) => v.build()));
		for (const style of styles) {
			expect(style.version).toBe(8);
			expect(style.layers.length).toBeGreaterThan(0);
		}
	});

	// ── Built-in terrain variants (independent of the features argument) ────────

	it('*-terrain variants add terrain + hillshade', async () => {
		const style = await build(undefined, 'colorful-terrain/style');
		expect(style.terrain).toBeDefined();
		expect(style.sources).toHaveProperty('elevation');
		expect(layerIds(style)).toContain('hillshade');
	});

	it('plain variants have no terrain', async () => {
		const style = await build(undefined, 'colorful/style');
		expect(style.terrain).toBeUndefined();
		expect(layerIds(style)).not.toContain('hillshade');
	});

	it('language variants set the label language', async () => {
		const de = await build(undefined, 'colorful/de');
		const layout = de.layers.find((l) => l.id === 'label-place-village')?.layout as Record<string, unknown>;
		expect(JSON.stringify(layout['text-field'])).toContain('name_de');
	});

	it('nolabel variant drops labels', async () => {
		const style = await build(undefined, 'colorful/nolabel');
		expect(layerIds(style)).not.toContain('label-place-village');
	});

	// ── The `features` argument must actually be applied ────────────────────────

	it('default (no features) renders flat buildings', async () => {
		const ids = layerIds(await build(undefined, 'colorful/style'));
		expect(ids).toContain('building');
		expect(ids).not.toContain('building-3d');
	});

	it('applies an activated feature (buildings: extruded) to a plain variant', async () => {
		const ids = layerIds(await build({ buildings: 'extruded' }, 'colorful/style'));
		expect(ids).toContain('building-3d');
		expect(ids).not.toContain('building');
	});

	it('applies an activated feature to language / nolabel variants too', async () => {
		for (const name of ['colorful/en', 'colorful/de', 'colorful/nolabel']) {
			const ids = layerIds(await build({ buildings: 'extruded' }, name));
			expect(ids, `${name} should honour buildings:extruded`).toContain('building-3d');
		}
	});

	it('activates landcover when requested', async () => {
		const on = await build({ landcover: true }, 'colorful/style');
		const off = await build(undefined, 'colorful/style');
		const opacity = (s: StyleSpecification) =>
			(s.layers.find((l) => l.id === 'land-forest')?.paint as Record<string, unknown> | undefined)?.['fill-opacity'];
		// landcover removes the low-zoom fade (a zoom interpolate expression) and pins a constant.
		expect(opacity(on)).not.toStrictEqual(opacity(off));
	});

	it('merges the features argument into *-terrain variants (keeps terrain, adds the feature)', async () => {
		const style = await build({ buildings: 'extruded' }, 'colorful-terrain/style');
		// terrain still present …
		expect(style.terrain).toBeDefined();
		// … and the extra feature applied.
		expect(layerIds(style)).toContain('building-3d');
	});

	it('lets the features argument override a terrain-variant default (hillshade off)', async () => {
		const style = await build({ hillshade: false }, 'colorful-terrain/style');
		expect(layerIds(style)).not.toContain('hillshade');
	});
});
