import { describe, expect, it } from 'vitest';
import { resolveUrl } from './resolve-url.js';

describe('resolveUrl', () => {
	it('resolves a relative URL with a base URL', () => {
		expect(resolveUrl('http://example.com/', 'path/page')).toBe('http://example.com/path/page');
	});

	it('returns the same URL if the base URL is empty', () => {
		expect(resolveUrl('', 'http://example.com/path/page')).toBe('http://example.com/path/page');
	});

	it('returns the correct URL if an absolute URL is used', () => {
		expect(resolveUrl('http://example1.com', 'http://example.com/path/page')).toBe('http://example.com/path/page');
	});

	it('handles URLs with special characters', () => {
		expect(resolveUrl('http://example.com/', 'path/{param}')).toBe('http://example.com/path/{param}');
	});

	it('handles URLs already containing encoded special characters', () => {
		expect(resolveUrl('http://example.com/', 'path/%7Bparam%7D')).toBe('http://example.com/path/{param}');
	});

	it('throws an error naming urls.base for an invalid base', () => {
		// A bare "Invalid URL" from the URL constructor names neither value; the message must
		// point at the option that is actually wrong (issue #127).
		expect(() => resolveUrl('invalid-base', 'path/page')).toThrow(/urls\.base/);
		expect(() => resolveUrl('invalid-base', 'path/page')).toThrow(/invalid-base/);
	});

	it('throws a useful error for the srcdoc "null" origin', () => {
		// In a srcdoc/sandboxed iframe, a data: document or a file:// page, location.origin is the
		// *string* "null" — the exact case that used to reach `new URL(path, "null")`.
		expect(() => resolveUrl('null', '/tiles/osm/tiles.json')).toThrow(/urls\.base/);
	});
});
