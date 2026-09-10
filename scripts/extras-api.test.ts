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

	// Metadata is what makes 200+ icons findable in a picker, so it is part of the contract rather
	// than a nicety: an icon added without tags is an icon nobody will search up.
	it('gives every extras icon a description and search tags', () => {
		const thin: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const [name, spec] of Object.entries(set.icons)) {
				const id = `extras:${group}-${name}`;
				if (typeof spec === 'string') thin.push(`${id} — no metadata at all`);
				else if (!spec.description) thin.push(`${id} — no description`);
				else if (!spec.tags?.length) thin.push(`${id} — no tags`);
			}
		}
		expect(thin.sort(), `extras icons missing picker metadata:\n${thin.join('\n')}`).toStrictEqual([]);
	});

	// Tags exist to be searched, so a tag that merely repeats the icon's own name is dead weight.
	it('never uses a tag that just repeats the icon name', () => {
		const echoes: string[] = [];
		for (const [group, set] of Object.entries(config.spritesheets.extras)) {
			for (const [name, spec] of Object.entries(set.icons)) {
				if (typeof spec === 'string') continue;
				const own = name.replace(/_/g, ' ');
				for (const t of spec.tags ?? []) {
					if (t.toLowerCase() === own || t.toLowerCase() === name) echoes.push(`extras:${group}-${name} → "${t}"`);
				}
			}
		}
		expect(echoes.sort(), `tags that repeat the icon name:\n${echoes.join('\n')}`).toStrictEqual([]);
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
