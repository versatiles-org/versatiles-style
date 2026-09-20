import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { omt } from '../omt/index.js';
import { protomaps } from '../protomaps/index.js';

/**
 * A built style is assembled largely out of module-level constants, attached by reference rather than
 * copied — two `osm()` calls hand out the same filter and sort-key objects, and so do two layers of a
 * single style. That sharing is deliberate (copying every expression on every build would cost more
 * than it saves), but it is only safe while nothing can write through the reference.
 *
 * So the rule is not "nothing is shared", it is **"anything shared is frozen"**: a mutation then throws
 * at the point of the mutation instead of silently corrupting a later, unrelated build. These tests are
 * what stop a constant added tomorrow from quietly reintroducing the hazard — they need no update when
 * a new shared constant appears, only when it appears *unfrozen*.
 */

const build = (): [string, () => StyleSpecification][] => [
	['osm', () => osm()],
	['satellite', () => satellite()],
	['omt', () => omt()],
	['protomaps', () => protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } })],
];

/** Every path at which `a` and `b` hold the *same* object, paired with whether it is frozen. */
function sharedObjects(a: unknown, b: unknown): { path: string; frozen: boolean }[] {
	const found: { path: string; frozen: boolean }[] = [];
	const seen = new WeakSet<object>();

	const walk = (x: unknown, y: unknown, path: string): void => {
		if (x === null || typeof x !== 'object') return;
		if (x === y) {
			found.push({ path, frozen: Object.isFrozen(x) });
			return;
		}
		if (seen.has(x)) return;
		seen.add(x);
		if (y === null || typeof y !== 'object') return;
		for (const key of Object.keys(x)) {
			walk((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key], `${path}.${key}`);
		}
	};

	walk(a, b, 'style');
	return found;
}

describe.each(build())('%s: state shared between builds', (_, make) => {
	it('is frozen wherever it is shared', () => {
		const unfrozen = sharedObjects(make(), make())
			.filter((entry) => !entry.frozen)
			.map((entry) => entry.path);

		expect(unfrozen).toEqual([]);
	});

	// Guards the guard: if the walk ever stopped finding anything, the test above would pass
	// vacuously and the whole invariant would go unchecked.
	it('is actually being found by the walk', () => {
		expect(sharedObjects(make(), make()).length).toBeGreaterThan(5);
	});

	// `metadata` is the exception to the freezing rule, and has to stay one: annotating a style you
	// were handed is legitimate, and the documented `styleMetadata` pattern replaces it wholesale.
	// It must therefore be *copied* per build rather than frozen.
	it('never shares `metadata`, which callers are expected to write to', () => {
		const first = make();
		const second = make();
		expect(first.metadata).not.toBe(second.metadata);
		expect(first.metadata).toStrictEqual(second.metadata);

		(first.metadata as Record<string, unknown>).author = 'a caller annotating their own style';
		expect(make().metadata).toStrictEqual(second.metadata);
	});
});

it('does not share metadata across builders', () => {
	const a = osm() as { metadata?: Record<string, unknown> };
	(a.metadata as Record<string, unknown>).author = 'mutated';
	for (const [name, make] of build()) {
		expect(make().metadata, name).not.toHaveProperty('author');
	}
});
