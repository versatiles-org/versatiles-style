import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from './config/sprites.js';

// `extras` is a documented, add-only public API (see SPRITES.md). This test keeps the doc and the
// sprite config in lockstep so they can never silently drift:
//   • every icon packed into `extras` must be documented (nothing published without a doc entry),
//   • every icon documented must still be packed (an add-only guarantee — a removal/rename shows
//     up here as a failing test, forcing it to be a deliberate, reviewed breaking change).

const SPRITES_MD = new URL('../SPRITES.md', import.meta.url).pathname;

// Icons packed into the extras sheet, as `extras:<group>-<name>`.
const packed = new Set<string>();
for (const [group, set] of Object.entries(config.spritesheets.extras)) {
	for (const name of Object.keys(set.icons)) packed.add(`extras:${group}-${name}`);
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

	// A picker shows titles, so an icon without one is an icon nobody can identify. Published
	// inside the sprite JSON, which is why this is part of the contract rather than a nicety.
	it('gives every extras icon a title', () => {
		const untitled: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const [name, spec] of Object.entries(set.icons)) {
				if (typeof spec === 'string' || !spec.title) untitled.push(`extras:${group}-${name}`);
			}
		}
		expect(untitled.sort(), `extras icons with no title:\n${untitled.join('\n')}`).toStrictEqual([]);
	});

	// Aliases exist to be searched, so one that merely repeats the name or the title is dead weight.
	it('never uses an alias that repeats the icon name or its title', () => {
		const echoes: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const [name, spec] of Object.entries(set.icons)) {
				if (typeof spec === 'string') continue;
				const own = new Set([name, name.replace(/_/g, ' '), (spec.title ?? '').toLowerCase()]);
				for (const a of spec.aliases ?? []) {
					if (own.has(a.toLowerCase())) echoes.push(`extras:${group}-${name} → "${a}"`);
				}
			}
		}
		expect(echoes.sort(), `aliases that repeat the name or title:\n${echoes.join('\n')}`).toStrictEqual([]);
	});

	// `center` is a fraction of the icon's own box, so it stays valid at every pixel ratio.
	it('keeps every center inside the icon box', () => {
		const bad: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const [name, spec] of Object.entries(set.icons)) {
				if (typeof spec === 'string' || !spec.center) continue;
				const [x, y] = spec.center;
				if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) bad.push(`extras:${group}-${name} → [${x}, ${y}]`);
			}
		}
		expect(bad.sort(), `centers outside 0..1:\n${bad.join('\n')}`).toStrictEqual([]);
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
			for (const name of Object.keys(set.icons)) inBase.add(name);
		}

		const collisions: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const name of Object.keys(set.icons)) if (inBase.has(name)) collisions.push(`extras:${group}-${name}`);
		}

		expect(
			collisions.sort(),
			`already drawn by base — extras should not duplicate it:\n${collisions.join('\n')}`
		).toStrictEqual([]);
	});
});
