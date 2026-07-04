import { beforeAll, describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import spriteConfig from '../../scripts/config-sprites.js';
import type { StyleSpecification } from '../types/index.js';

// Guards the `basics` sprite against drift in both directions:
//   • every icon packed into `basics` is actually referenced by a layer (no dead weight),
//   • every `basics:` reference in the generated style resolves to a packed icon (no broken ref).
//
// References are read from the *generated* style (icon-image / *-pattern values, nested inside
// match/interpolate expressions), not by grepping source — so it tracks real usage.
//
// The `markers` sprite is intentionally NOT checked: the style only ever loads `basics` (see the
// url defaults asserted below); `markers` is a standalone sprite shipped for downstream marker use.

// Recursively collect every `basics:<group>-<name>` sprite reference in a layer's paint & layout.
function collectBasicsRefs(style: StyleSpecification): Set<string> {
	const refs = new Set<string>();
	const walk = (value: unknown): void => {
		if (typeof value === 'string') {
			if (/^basics:[a-z0-9_]+-[a-z0-9_]+$/.test(value)) refs.add(value);
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

// Every icon packed into the `basics` sprite sheet, as `basics:<group>-<name>`.
const packedBasics = new Set<string>();
for (const [group, set] of Object.entries(spriteConfig.spritesheets.basics)) {
	for (const name of set.names) packedBasics.add(`basics:${group}-${name}`);
}

describe('basics sprite usage', () => {
	// Collect references from a couple of option variants so the set is comprehensive and stable.
	// (Uses the global fetch stub from vitest.setup.ts.)
	let referenced: Set<string>;
	beforeAll(async () => {
		const styles = await Promise.all([osm(), osm({ features: { buildings: 'extruded' } })]);
		referenced = new Set(styles.flatMap((s) => [...collectBasicsRefs(s)]));
	});

	it('references at least one basics icon', () => {
		expect(referenced.size).toBeGreaterThan(0);
	});

	it('only loads the basics sprite (so markers is intentionally exempt)', () => {
		const sprite = osm.defaults.urls.sprite as { id: string }[];
		expect(sprite.map((s) => s.id)).toStrictEqual(['basics']);
	});

	it('has no unused icons — every packed basics icon is referenced', () => {
		const unused = [...packedBasics].filter((p) => !referenced.has(p)).sort();
		expect(unused, `unused basics icons:\n${unused.join('\n')}`).toStrictEqual([]);
	});

	it('has no broken references — every basics: reference is packed', () => {
		const broken = [...referenced].filter((r) => !packedBasics.has(r)).sort();
		expect(broken, `broken sprite references:\n${broken.join('\n')}`).toStrictEqual([]);
	});
});
