import { describe, expect, it } from 'vitest';
import { normalizeAttribution } from './utils.js';

describe('normalizeAttribution', () => {
	it('returns canonical strings unchanged', () => {
		expect(normalizeAttribution('<a href="https://example.com">Example</a>')).toBe(
			'<a href="https://example.com">Example</a>'
		);
	});

	it('rewrites single-quoted attributes to double-quoted', () => {
		expect(normalizeAttribution("<a href='https://example.com'>Example</a>")).toBe(
			'<a href="https://example.com">Example</a>'
		);
	});

	it('trims leading and trailing whitespace', () => {
		expect(normalizeAttribution('  Example  ')).toBe('Example');
	});

	it('collapses internal whitespace runs', () => {
		expect(normalizeAttribution('a   b\tc\nd')).toBe('a b c d');
	});

	it('produces byte-identical output for cosmetically equivalent inputs', () => {
		const a = normalizeAttribution("<a href='https://versatiles.org/sources/'>VersaTiles sources</a>");
		const b = normalizeAttribution('<a href="https://versatiles.org/sources/">VersaTiles sources</a>');
		expect(a).toBe(b);
	});

	it('rewrites every single-quoted attribute in a tag', () => {
		expect(normalizeAttribution("<a href='x' target='_blank' data-foo='a b'>OSM</a>")).toBe(
			'<a href="x" target="_blank" data-foo="a b">OSM</a>'
		);
	});

	it('runs in linear time on long runs of word characters', () => {
		// The attribution of a fetched TileJSON is not under our control, so the rewrite must not
		// be quadratic. With the old `(\w+)='...'` pattern this input took over ten seconds.
		const hostile = 'a'.repeat(200_000);
		const started = performance.now();
		expect(normalizeAttribution(hostile)).toBe(hostile);
		expect(performance.now() - started).toBeLessThan(1000);
	});
});
