import { describe, expect, it } from 'vitest';
// `osm` and `satellite` from the npm entry, not `api/`: `validateOptions` is an authoring helper, so it
// is attached in `index.ts` alongside `minimizeOptions` and `toCode` and is deliberately absent from the
// browser bundle. `omt` and `protomaps` keep theirs on their own objects — their subpaths are npm-only
// already, so there is no second surface to keep it off.
import { osm, satellite } from './index.js';
import { omt } from './omt/index.js';
import { protomaps } from './protomaps/index.js';
import type { OptionIssue, ValidationResult } from './options/index.js';

// `validateOptions` — the non-throwing counterpart of `resolveOptions`, which reports every problem in
// an options object at once as data. See issue #133. The throwing behaviour it is built on is covered by
// `api/validate-options.test.ts`; what is tested here is the collecting, the shape, and the boundary between
// the two.

// Over any builder's result, not just `osm`'s: `satellite` resolves to a different options type, and a
// helper pinned to one of them cannot read the other.
type AnyResult = ValidationResult<unknown>;
const issuesOf = (result: AnyResult): readonly OptionIssue[] => (result.ok ? [] : result.issues);
const paths = (result: AnyResult): string[] => issuesOf(result).map((issue) => issue.path);

describe('validateOptions: the result', () => {
	it('gives the resolved options back when there is nothing wrong', () => {
		const result = osm.validateOptions({ theme: 'muted', text: { scale: 2 } });
		expect(result.ok).toBe(true);
		// the union narrows, so `options` is reachable without a cast
		if (!result.ok) throw new Error('expected ok');
		expect(result.options.theme).toBe('muted');
		expect(result.issues).toStrictEqual([]);
	});

	it('accepts no options at all, as the resolvers do', () => {
		expect(osm.validateOptions().ok).toBe(true);
		expect(satellite.validateOptions().ok).toBe(true);
	});

	it('never throws, where resolveOptions does', () => {
		const bad = { colors: { wood: '#fff' } } as never;
		expect(() => osm.resolveOptions(bad)).toThrow();
		expect(() => osm.validateOptions(bad)).not.toThrow();
		expect(osm.validateOptions(bad).ok).toBe(false);
	});

	it('leaves resolveOptions throwing on the first problem, unchanged', () => {
		// the contract the issue kept: existing callers see exactly what they saw before
		expect(() => osm.resolveOptions({ colors: { wood: '#fff' }, text: { bogus: 1 } } as never)).toThrow(
			'osm: unknown option "colors.wood" — in v6 this is "colors.natureWood"'
		);
	});
});

describe('validateOptions: collecting the whole tree', () => {
	it('reports problems in sibling subtrees that resolution would have stopped between', () => {
		// the motivating case: resolution is depth-first and `colors` is reached before `text`, so
		// throwing reports only the first of these
		const result = osm.validateOptions({ colors: { wood: '#fff' }, text: { bogus: 1 } } as never);
		expect(paths(result)).toStrictEqual(['colors.wood', 'text.bogus']);
	});

	it('reports several bad values at once', () => {
		const result = osm.validateOptions({
			sun: { altitude: NaN, direction: Infinity },
			icon: { scale: 'big' },
		} as never);
		expect(paths(result)).toStrictEqual(['sun.altitude', 'sun.direction', 'icon.scale']);
	});

	it('keeps collecting after a problem that forces a substitute value', () => {
		// an unknown palette leaves every colour below it with no table to read, so resolution can only
		// continue on the default — and the point of continuing is the second issue here
		const result = osm.validateOptions({ theme: 'graybeard', layers: { nope: true } } as never);
		expect(paths(result)).toStrictEqual(['theme', 'layers.nope']);
	});

	it('reports a subtree it cannot read, and nothing invented below it', () => {
		const result = osm.validateOptions({ text: 42 } as never);
		expect(issuesOf(result)).toStrictEqual([{ path: 'text', message: 'expected an object, got 42' }]);
	});
});

describe('validateOptions: the issues', () => {
	it('carries the v6 replacement as a suggestion, not only in the message', () => {
		const result = osm.validateOptions({ textScale: 2, colors: { streetbg: '#fff' } } as never);
		expect(issuesOf(result).map((issue) => [issue.path, issue.suggestion])).toStrictEqual([
			['textScale', 'text.scale'],
			['colors.streetbg', 'colors.roadStreetBg'],
		]);
	});

	it('leaves suggestion unset for a typo, which has no replacement to offer', () => {
		const [issue] = issuesOf(osm.validateOptions({ colors: { notAColour: '#fff' } } as never));
		expect(issue.suggestion).toBeUndefined();
		expect(issue.message).toContain('known keys here');
	});

	it('writes every path relative to the options object, with no function prefix', () => {
		// the key check strips the leading label internally and the value checks do not, so this is the
		// one place the two are reconciled — a UI marking a field must not have to handle both
		const result = osm.validateOptions({
			sun: { altitude: NaN },
			colors: { wood: '#fff' },
			theme: 'nope',
		} as never);
		for (const path of paths(result)) expect(path.startsWith('osm')).toBe(false);
		expect(paths(result)).toContain('sun.altitude');
	});

	it('reports the satellite overlay and the root in one pass, both relative to satellite()', () => {
		const result = satellite.validateOptions({
			raster: { opacity: NaN },
			osmOverlay: { colors: { wood: '#fff' } },
		} as never);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.issues.map((issue) => issue.path).sort()).toStrictEqual(['osmOverlay.colors.wood', 'raster.opacity']);
	});

	it('does not report the same problem twice', () => {
		// `satellite()` resolves colours for the overlay and for itself, so a single bad key can reach
		// the same check more than once in one pass
		const result = satellite.validateOptions({ osmOverlay: { colors: { wood: '#fff' } } } as never);
		expect(issuesOf(result)).toHaveLength(1);
	});
});

describe('validateOptions: every schema has one', () => {
	// Two shape differences are deliberate. `satellite()` has no top-level `colors` — its palette lives
	// under `osmOverlay` — so each builder is given a v5 key where its own shape puts one. And only `osm`
	// and `satellite` suggest a v6 name: the v5 hint tables are keyed to them, because OpenMapTiles and
	// Protomaps had no v5 builder for a key to have been renamed *from*.
	it.each([
		['osm', osm, { colors: { wood: '#fff' } }, 'colors.wood', 'colors.natureWood'],
		[
			'satellite',
			satellite,
			{ osmOverlay: { colors: { wood: '#fff' } } },
			'osmOverlay.colors.wood',
			'osmOverlay.colors.natureWood',
		],
		['omt', omt, { colors: { wood: '#fff' } }, 'colors.wood', undefined],
		['protomaps', protomaps, { colors: { wood: '#fff' } }, 'colors.wood', undefined],
	] as const)('%s.validateOptions collects instead of throwing', (_name, builder, options, path, suggestion) => {
		expect(() => builder.resolveOptions(options as never)).toThrow();
		const result = builder.validateOptions(options as never);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0].path).toBe(path);
		expect(result.issues[0].suggestion).toBe(suggestion);
	});

	it('rejects a top-level colors on satellite, whose palette is under osmOverlay', () => {
		// the shape difference above, asserted rather than left as a comment
		const result = satellite.validateOptions({ colors: { wood: '#fff' } } as never);
		expect(paths(result)).toStrictEqual(['colors']);
	});
});
