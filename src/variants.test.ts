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
	// A1: `satellite/style` shipped byte-identical to `satellite/nooverlay` because it was built
	// with a bare `satellite()`, whose `osmOverlay` defaults to false. Nothing caught it, because
	// the satellite tests only ever passed `osmOverlay` explicitly.
	it('every published variant that is not */nooverlay renders vector layers', () => {
		for (const { name, build } of getStyleVariants()) {
			if (name.endsWith('/nooverlay')) continue;
			// `empty` is the v5 blank canvas: source and glyphs wired up, no data layers at all.
			if (name.startsWith('empty/')) continue;
			const style = build();
			const symbols = style.layers.filter((l) => l.type === 'symbol');
			expect(Object.keys(style.sources), `${name} has no vector source`).toContain('versatiles-shortbread');
			expect(symbols.length, `${name} renders no labels`).toBeGreaterThan(0);
		}
	});

	it('*/nooverlay variants really have no overlay, and differ from their default sibling', () => {
		const byName = new Map(getStyleVariants().map((v) => [v.name, v]));
		for (const base of ['satellite', 'terrain']) {
			const withOverlay = byName.get(`${base}/style`)!.build();
			const without = byName.get(`${base}/nooverlay`)!.build();
			expect(Object.keys(without.sources), `${base}/nooverlay has a vector source`).not.toContain(
				'versatiles-shortbread'
			);
			expect(
				JSON.stringify(withOverlay) === JSON.stringify(without),
				`${base}/style is identical to ${base}/nooverlay`
			).toBe(false);
		}
	});

	// ── Structure ─────────────────────────────────────────────────────────────

	it('returns the expected set of variant names', () => {
		const names = getStyleVariants().map((v) => v.name);
		// 5 palettes × 7 osm variants + 8 satellite variants
		// + 4 legacy v5 palettes × 7 + `empty/style` (see the deprecation block below)
		expect(names).toHaveLength(5 * 7 + 8 + 4 * 7 + 1);
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

// tiles.versatiles.org serves these v5 URLs today. v6 removed the palettes, so without aliases
// every one of them would 404 for anyone pointing MapLibre at a URL instead of installing the
// package (B1). Deprecated — drop in 7.0, not before.
describe('v5 style names are still published', () => {
	const LEGACY_SIBLINGS = ['style', 'en', 'de', 'nolabel'];
	const LEGACY_PALETTES = ['eclipse', 'graybeard', 'neutrino', 'shadow'];

	it('publishes every legacy URL that is currently served', () => {
		const names = new Set(getStyleVariants().map((v) => v.name));
		const expected: string[] = [];
		for (const p of LEGACY_PALETTES) {
			for (const s of LEGACY_SIBLINGS) expected.push(`${p}/${s}`);
			for (const s of ['style', 'en', 'de']) expected.push(`${p}-terrain/${s}`);
		}
		// v5 published `empty` as a single style, with no language or terrain siblings.
		expected.push('empty/style');
		expect(expected.filter((n) => !names.has(n))).toEqual([]);
	});

	it('each legacy alias renders a real style', () => {
		for (const p of LEGACY_PALETTES) {
			const style = byName(getStyleVariants(), `${p}/style`).build();
			expect(style.layers.length, `${p} layer count`).toBeGreaterThan(300);
			expect(Object.keys(style.sources)).toContain('versatiles-shortbread');
		}
	});

	it('the aliases are visually distinct from each other', () => {
		const seen = new Map<string, string>();
		for (const p of LEGACY_PALETTES) {
			const json = JSON.stringify(byName(getStyleVariants(), `${p}/style`).build());
			const clash = [...seen.entries()].find(([, v]) => v === json);
			expect(clash?.[0], `${p} is identical to ${clash?.[0]}`).toBeUndefined();
			seen.set(p, json);
		}
	});

	it('empty/style has no data layers, matching v5', () => {
		const style = byName(getStyleVariants(), 'empty/style').build();
		expect(style.layers.every((l) => l.type === 'background')).toBe(true);
		expect(Object.keys(style.sources)).toContain('versatiles-shortbread');
	});
});
