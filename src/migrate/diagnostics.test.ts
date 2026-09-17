import { describe, expect, it } from 'vitest';
import { byCode, byOption, diagnostic, is, sortDiagnostics, worst, type Diagnostic } from './diagnostics.js';
import { isCovered } from './provenance.js';

describe('diagnostic()', () => {
	// Severity belongs to the code, not to the call site: the same code reported as a warning in one
	// place and an info in another is exactly what a consumer cannot filter on.
	it('takes its severity from the code', () => {
		expect(diagnostic('input.notAStyle', 'x', { received: 'array' }).severity).toBe('error');
		expect(diagnostic('language.unavailable', 'x', { requested: 'ja' }).severity).toBe('warning');
		expect(diagnostic('icons.replaced', 'x', { sprite: 'u' }).severity).toBe('info');
	});

	it('omits the optional fields rather than carrying undefined, so the report stays plain JSON', () => {
		expect(Object.keys(diagnostic('schema.none', 'x', { vectorSources: 0 }))).toEqual([
			'code',
			'severity',
			'message',
			'data',
		]);
		const full = diagnostic(
			'font.unavailable',
			'x',
			{ requested: ['Metropolis'], reason: 'not-published' },
			{ optionPath: 'text.font', origin: { layers: ['a'] } }
		);
		expect(JSON.parse(JSON.stringify(full))).toEqual(full);
	});
});

describe('sortDiagnostics()', () => {
	it('orders by severity, then code, then option', () => {
		const sorted = sortDiagnostics([
			diagnostic('icons.replaced', 'i', { sprite: 'u' }),
			diagnostic('projection.unsupported', 'w', { requested: 'x' }, { optionPath: 'projection' }),
			diagnostic('schema.none', 'e', { vectorSources: 0 }),
			diagnostic('font.unavailable', 'w', { requested: [], reason: 'no-font-list' }, { optionPath: 'text.font' }),
		]);
		expect(sorted.map((d) => d.code)).toEqual([
			'schema.none',
			'font.unavailable',
			'projection.unsupported',
			'icons.replaced',
		]);
	});

	it('does not mutate its argument', () => {
		const input = [
			diagnostic('icons.replaced', 'i', { sprite: 'u' }),
			diagnostic('schema.none', 'e', { vectorSources: 0 }),
		];
		sortDiagnostics(input);
		expect(input.map((d) => d.code)).toEqual(['icons.replaced', 'schema.none']);
	});
});

describe('worst()', () => {
	it('reports the most severe level present, or nothing at all', () => {
		expect(worst([])).toBeUndefined();
		const info = diagnostic('icons.replaced', 'i', { sprite: 'u' });
		const warning = diagnostic('language.unavailable', 'w', { requested: 'ja' });
		const error = diagnostic('schema.none', 'e', { vectorSources: 0 });
		expect(worst([info])).toBe('info');
		expect(worst([info, warning])).toBe('warning');
		expect(worst([info, error])).toBe('error');
	});
});

describe('byOption()', () => {
	const list: Diagnostic[] = [
		diagnostic('font.unavailable', 'a', { requested: [], reason: 'no-font-list' }, { optionPath: 'text.places.font' }),
		diagnostic('language.unavailable', 'b', { requested: 'ja' }, { optionPath: 'text.language' }),
		diagnostic('projection.unsupported', 'c', { requested: 'x' }, { optionPath: 'projection' }),
		diagnostic('icons.replaced', 'd', { sprite: 'u' }),
	];

	it('matches an option and everything under it', () => {
		expect(byOption(list, 'text').map((d) => d.message)).toEqual(['a', 'b']);
		expect(byOption(list, 'text.places').map((d) => d.message)).toEqual(['a']);
		expect(byOption(list, 'projection').map((d) => d.message)).toEqual(['c']);
	});

	it('does not match a prefix that is not a path segment', () => {
		// 'text' must not match 'textScale'
		const odd = diagnostic(
			'font.unavailable',
			'x',
			{ requested: [], reason: 'no-font-list' },
			{ optionPath: 'textScale' }
		);
		expect(byOption([odd], 'text')).toEqual([]);
	});

	it('byCode selects exactly one code', () => {
		expect(byCode(list, 'font.unavailable').map((d) => d.message)).toEqual(['a']);
		expect(byCode(list, 'schema.none')).toEqual([]);
	});
});

// The payload is typed per code so that a consumer reading it does not have to cast at exactly the
// point the payload matters. These assertions are as much about the types compiling as the values.
describe('narrowing a payload', () => {
	const list: Diagnostic[] = [
		diagnostic('input.fetchFailed', 'a', { url: 'https://x/', status: 404 }),
		diagnostic('layer.unread', 'b', { count: 3 }),
	];

	it('is() narrows to the code payload', () => {
		const found = list.find((d) => is(d, 'input.fetchFailed'));
		expect(found && is(found, 'input.fetchFailed') && found.data.status).toBe(404);
	});

	it('byCode returns the payload already narrowed', () => {
		expect(byCode(list, 'layer.unread')[0].data.count).toBe(3);
		// a switch narrows without any helper at all
		for (const d of list) {
			switch (d.code) {
				case 'input.fetchFailed':
					expect(d.data.url).toBe('https://x/');
					break;
				case 'layer.unread':
					expect(d.data.count).toBe(3);
					break;
				default:
					break;
			}
		}
	});
});

describe('isCovered()', () => {
	it('separates "nothing is known" from "this is not annotated yet"', () => {
		expect(isCovered('colors.water')).toBe(true);
		expect(isCovered('theme')).toBe(true);
		expect(isCovered('text.places.cities.font')).toBe(true);
		expect(isCovered('icon.scale')).toBe(true);
		// layer visibility and the feature flags carry no provenance yet
		expect(isCovered('layers.buildings')).toBe(false);
		expect(isCovered('features.terrain')).toBe(false);
		// a prefix must be a whole path segment
		expect(isCovered('themeish')).toBe(false);
	});
});
