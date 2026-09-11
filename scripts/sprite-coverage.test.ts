import { describe, expect, it } from 'vitest';
import config from './config/sprites.js';
import { spriteName } from './lib/icons.js';
import { getStyleVariants } from '../src/variants.js';

// Sprite ids are `<sheet>:<group>-<name>` (e.g. `base:icon-cafe`), or `icons:<name>` for the ungrouped
// `icons` sheet; see SPRITES.md.
//
// Two failure modes this guards against:
//  1. a layer references an icon the sheet does not contain — MapLibre renders nothing, silently;
//  2. an icon is built into `base` that no style ever uses — dead weight in every download (#20).
//
// `extras` and `icons` are exempt from (2): they are opt-in public sheets of icons for users to place
// themselves, so they are expected to be unreferenced by the built-in styles.

const SHEET_ID_RE = /^[a-z0-9_-]+:[a-z0-9_-]+$/i;

/** Every id the sprite sheets actually contain. */
function availableIds(): Set<string> {
	const ids = new Set<string>();
	for (const [sheet, groups] of Object.entries(config.spritesheets)) {
		for (const [group, set] of Object.entries(groups)) {
			for (const name of Object.keys(set.icons)) ids.add(`${sheet}:${spriteName(group, name, set)}`);
		}
	}
	return ids;
}

/** Every sprite id referenced by any published style, mapped to the layers that use it. */
function referencedIds(): Map<string, string[]> {
	const refs = new Map<string, string[]>();
	const walk = (value: unknown, layerId: string): void => {
		if (typeof value === 'string') {
			// Font stacks live in the same expressions but are not sprites.
			if (SHEET_ID_RE.test(value) && !value.startsWith('noto_')) {
				refs.set(value, [...(refs.get(value) ?? []), layerId]);
			}
			return;
		}
		if (Array.isArray(value)) for (const item of value) walk(item, layerId);
	};

	for (const variant of getStyleVariants()) {
		for (const layer of variant.build().layers) {
			const l = layer as { id: string; layout?: Record<string, unknown>; paint?: Record<string, unknown> };
			walk(l.layout?.['icon-image'], l.id);
			walk(l.paint?.['fill-pattern'], l.id);
		}
	}
	return refs;
}

describe('sprite coverage', () => {
	it('every referenced sprite exists in the sheets', () => {
		const available = availableIds();
		const missing = [...referencedIds()].filter(([id]) => !available.has(id));
		expect(
			missing.map(([id, layers]) => `${id} (used by ${layers[0]})`),
			'layers reference sprites the sheets do not contain — they would render nothing'
		).toEqual([]);
	});

	it('nothing references the old `basics:` sheet prefix', () => {
		// The sheet was renamed basics → base in v6 (B3).
		const stale = [...referencedIds().keys()].filter((id) => id.startsWith('basics:'));
		expect(stale).toEqual([]);
	});

	it('no icon in the `base` sheet is unused', () => {
		const referenced = referencedIds();
		const unused = [...availableIds()].filter((id) => id.startsWith('base:') && !referenced.has(id));
		expect(unused, 'unused icons ship in every download — drop them or use them (#20)').toEqual([]);
	});

	it('`extras` and `icons` are user-facing sheets, so the built-in styles do not reference them', () => {
		const used = [...referencedIds().keys()].filter((id) => id.startsWith('extras:') || id.startsWith('icons:'));
		expect(used, 'the public sheets are opt-in for users; built-in styles should not depend on them').toEqual([]);
	});
});
