import { beforeAll, describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import spriteConfig from '../../scripts/config-sprites.js';
import type { StyleSpecification } from '../types/index.js';

// Guards the `base` sprite against drift in both directions:
//   • every icon packed into `base` is actually referenced by a layer (no dead weight),
//   • every `base:` reference in the generated style resolves to a packed icon (no broken ref).
//
// References are read from the *generated* style (icon-image / *-pattern values, nested inside
// match/interpolate expressions), not by grepping source — so it tracks real usage.
//
// The `extras` sprite is intentionally NOT checked: the style only ever loads `base` (see the
// url defaults asserted below); `extras` is a standalone sprite shipped for downstream marker use.

// Recursively collect every `base:<group>-<name>` sprite reference in a layer's paint & layout.
function collectBaseRefs(style: StyleSpecification): Set<string> {
	const refs = new Set<string>();
	const walk = (value: unknown): void => {
		if (typeof value === 'string') {
			if (/^base:[a-z0-9_]+-[a-z0-9_]+$/.test(value)) refs.add(value);
		} else if (Array.isArray(value)) {
			value.forEach(walk);
		} else if (value && typeof value === 'object') {
			Object.values(value).forEach(walk);
		}
	};
	for (const layer of style.layers) {
		walk((layer as { paint?: unknown }).paint);
		walk((layer as { layout?: unknown }).layout);
	}
	return refs;
}

// Every icon packed into the `base` sprite sheet, as `base:<group>-<name>`.
const packedBase = new Set<string>();
for (const [group, set] of Object.entries(spriteConfig.spritesheets.base)) {
	for (const name of set.names) packedBase.add(`base:${group}-${name}`);
}

describe('base sprite usage', () => {
	// Collect references from a couple of option variants so the set is comprehensive and stable.
	// (Uses the global fetch stub from vitest.setup.ts.)
	let referenced: Set<string>;
	beforeAll(async () => {
		const styles = await Promise.all([osm(), osm({ features: { buildings: 'extruded' } })]);
		referenced = new Set(styles.flatMap((s) => [...collectBaseRefs(s)]));
	});

	it('references at least one base icon', () => {
		expect(referenced.size).toBeGreaterThan(0);
	});

	it('only loads the base sprite (so extras is intentionally exempt)', () => {
		const sprite = osm.defaults.urls.sprite as { id: string }[];
		expect(sprite.map((s) => s.id)).toStrictEqual(['base']);
	});

	it('has no unused icons — every packed base icon is referenced', () => {
		const unused = [...packedBase].filter((p) => !referenced.has(p)).sort();
		expect(unused, `unused base icons:\n${unused.join('\n')}`).toStrictEqual([]);
	});

	it('has no broken references — every base: reference is packed', () => {
		const broken = [...referenced].filter((r) => !packedBase.has(r)).sort();
		expect(broken, `broken sprite references:\n${broken.join('\n')}`).toStrictEqual([]);
	});
});
