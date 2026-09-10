import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from './config-sprites.js';

// `extras` is a documented, add-only public API (see SPRITES.md). This test keeps the doc and the
// sprite config in lockstep so they can never silently drift:
//   • every icon packed into `extras` must be documented (nothing published without a doc entry),
//   • every icon documented must still be packed (an add-only guarantee — a removal/rename shows
//     up here as a failing test, forcing it to be a deliberate, reviewed breaking change).

const SPRITES_MD = new URL('../SPRITES.md', import.meta.url).pathname;

// Icons packed into the extras sheet, as `extras:<group>-<name>`.
const packed = new Set<string>();
for (const [group, set] of Object.entries(config.spritesheets.extras)) {
	for (const name of set.names) packed.add(`extras:${group}-${name}`);
}

// Every `extras:<group>-<name>` token documented in SPRITES.md.
const documented = new Set<string>(readFileSync(SPRITES_MD, 'utf8').match(/extras:[a-z0-9]+-[a-z0-9_]+/g) ?? []);

describe('extras public API ↔ SPRITES.md', () => {
	it('documents every packed extras icon (nothing published undocumented)', () => {
		const undocumented = [...packed].filter((p) => !documented.has(p)).sort();
		expect(undocumented, `packed but missing from SPRITES.md:\n${undocumented.join('\n')}`).toStrictEqual([]);
	});

	it('every documented extras icon is still packed (add-only guarantee)', () => {
		const removed = [...documented].filter((d) => !packed.has(d)).sort();
		expect(
			removed,
			`documented in SPRITES.md but no longer packed — removing/renaming an extras icon is a breaking change:\n${removed.join(
				'\n'
			)}`
		).toStrictEqual([]);
	});

	// `base` is what the style draws for you; `extras` is what you place yourself. Duplicating a
	// name across the two sheets wastes bytes in an opt-in sheet and makes `base:icon-x` vs
	// `extras:icon-x` a coin flip for the reader. Names are add-only, so a collision that ships is
	// permanent — catch it here rather than in review.
	// No exceptions: `extras:icon-information` was dropped (base already draws an "i") and
	// `base:marking-arrow` became `base:marking-oneway` (which is what it actually marks), so the
	// two names that used to collide are gone. Keep it that way — an exception list here would
	// quietly become the place duplicates go.
	it('never duplicates a name that already exists in base', () => {
		const inBase = new Set<string>();
		for (const set of Object.values(config.spritesheets.base)) {
			for (const name of set.names) inBase.add(name);
		}

		const collisions: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const name of set.names) if (inBase.has(name)) collisions.push(`extras:${group}-${name}`);
		}

		expect(
			collisions.sort(),
			`already drawn by base — extras should not duplicate it:\n${collisions.join('\n')}`
		).toStrictEqual([]);
	});
});
