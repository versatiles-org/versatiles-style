import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from './config/sprites.js';
import { spriteName } from './lib/icons.js';

// `extras` and `icons` are documented, add-only public APIs (see SPRITES.md). This test keeps the
// doc and the sprite config in lockstep so they can never silently drift:
//   • every icon packed into a public sheet must be documented (nothing published without a doc entry),
//   • every icon documented must still be packed (an add-only guarantee — a removal/rename shows
//     up here as a failing test, forcing it to be a deliberate, reviewed breaking change).

const SPRITES_MD = new URL('../SPRITES.md', import.meta.url).pathname;
const PUBLIC_SHEETS = ['extras', 'icons'] as const;

/** Every icon of the public sheets as `[sheet, id, bare name]`, e.g. `['icons', 'icons:bicycle', 'bicycle']`. */
const publicIcons = PUBLIC_SHEETS.flatMap((sheet) =>
	Object.entries(config.spritesheets[sheet]).flatMap(([group, set]) =>
		Object.keys(set.icons).map((name) => [sheet, `${sheet}:${spriteName(group, name, set)}`, name] as const)
	)
);
const packed = new Set<string>(publicIcons.map(([, id]) => id));

// Every public id documented in SPRITES.md: `extras:<group>-<name>` and `icons:<name>`.
const documented = new Set<string>(
	readFileSync(SPRITES_MD, 'utf8').match(/\bextras:[a-z0-9]+-[a-z0-9_]+|\bicons:[a-z0-9_]+/g) ?? []
);

describe('public sprite sheets ↔ SPRITES.md', () => {
	it('documents every packed public icon (nothing published undocumented)', () => {
		const undocumented = [...packed].filter((p) => !documented.has(p)).sort();
		expect(undocumented, `packed but missing from SPRITES.md:\n${undocumented.join('\n')}`).toStrictEqual([]);
	});

	it('every documented public icon is still packed (add-only guarantee)', () => {
		const removed = [...documented].filter((d) => !packed.has(d)).sort();
		expect(
			removed,
			`documented in SPRITES.md but no longer packed — removing/renaming a public icon is a breaking change:\n${removed.join(
				'\n'
			)}`
		).toStrictEqual([]);
	});

	// `base` is what the style draws for you; the public sheets are what you place yourself.
	// Duplicating a name across them wastes bytes in an opt-in sheet and makes `base:icon-x` vs
	// `icons:x` a coin flip for the reader. Names are add-only, so a collision that ships is
	// permanent — catch it here rather than in review.
	// No exceptions: the pictogram `information` was dropped (base already draws an "i") and
	// `base:marking-arrow` became `base:marking-oneway` (which is what it actually marks), so the
	// two names that used to collide are gone. Keep it that way — an exception list here would
	// quietly become the place duplicates go.
	it('never duplicates a name that already exists in base', () => {
		const inBase = new Set<string>();
		for (const set of Object.values(config.spritesheets.base)) {
			for (const name of Object.keys(set.icons)) inBase.add(name);
		}
		const collisions = publicIcons.filter(([, , name]) => inBase.has(name)).map(([, id]) => id);
		expect(collisions.sort(), `already drawn by base — do not duplicate it:\n${collisions.join('\n')}`).toStrictEqual(
			[]
		);
	});

	// `icons` ids carry no group, so `icons:star` next to `extras:shape-star` would read as the same
	// icon in two places. Keep every name unique across the two public sheets.
	it('never uses one name in both extras and icons', () => {
		const bySheet = (sheet: string) => new Set(publicIcons.filter(([s]) => s === sheet).map(([, , name]) => name));
		const inExtras = bySheet('extras');
		const shared = [...bySheet('icons')].filter((name) => inExtras.has(name)).sort();
		expect(shared, `names used in both public sheets:\n${shared.join('\n')}`).toStrictEqual([]);
	});
});
