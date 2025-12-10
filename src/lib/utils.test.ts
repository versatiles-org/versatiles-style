import { describe, expect, it } from 'vitest';
import { Color } from '../color/index.js';
import { deepClone, isSimpleObject, isBasicType, deepMerge, resolveUrl, basename } from './utils.js';

describe('deepClone', () => {
	it('clones primitive types correctly', () => {
		expect(deepClone(10)).toBe(10);
		expect(deepClone(true)).toBe(true);
		expect(deepClone('string')).toBe('string');
	});

	it('clones an array correctly', () => {
		const array = [1, 2, { a: 'b' }];
		const clonedArray = deepClone(array);
		expect(clonedArray).toEqual(array);
		expect(clonedArray).not.toBe(array);
		expect(clonedArray[2]).not.toBe(array[2]);
	});

	it('clones a simple object correctly', () => {
		const obj = { a: 'b', c: 1, d: true };
		const clonedObj = deepClone(obj);
		expect(clonedObj).toEqual(obj);
		expect(clonedObj).not.toBe(obj);
	});

	it('clones a Color instance correctly', () => {
		const color = Color.parse('#FF5733');
		const clonedColor = deepClone(color);
		expect(clonedColor.asHex()).toBe(color.asHex());
		expect(clonedColor).not.toBe(color);
	});

	it('throws an error for non-implemented types', () => {
		const func = (): boolean => true;
		expect(() => deepClone(func)).toThrow('Not implemented yet: "function" case');
	});

	it('throws an error for unexpected cases', () => {
		const obj = Object.create(null); // No prototype
		expect(() => deepClone(obj)).toThrow();
	});
});

describe('isSimpleObject', () => {
	it('identifies simple objects correctly', () => {
		expect(isSimpleObject({ a: 1 })).toBe(true);
		expect(isSimpleObject({})).toBe(true);
	});

	it('rejects non-objects', () => {
		expect(isSimpleObject(1)).toBe(false);
		expect(isSimpleObject('a')).toBe(false);
		expect(isSimpleObject(true)).toBe(false);
	});

	it('rejects arrays', () => {
		expect(isSimpleObject([1, 2, 3])).toBe(false);
	});

	it('rejects objects with prototype properties', () => {
		class MyClass {
			readonly property = true;
		}
		expect(isSimpleObject(new MyClass())).toBe(false);
	});

	it('rejects null objects', () => {
		expect(isSimpleObject(null)).toBe(false);
	});
});

describe('isBasicType', () => {
	it('returns true for basic types', () => {
		expect(isBasicType(1)).toBe(true);
		expect(isBasicType('string')).toBe(true);
		expect(isBasicType(true)).toBe(true);
		expect(isBasicType(undefined)).toBe(true);
	});

	it('returns false for objects', () => {
		expect(isBasicType({})).toBe(false);
		expect(isBasicType([])).toBe(false);
		expect(isBasicType(Color.parse('#FF5733'))).toBe(false);
	});

	it('throws an error for unsupported types like functions', () => {
		expect(() => isBasicType(() => true)).toThrow('unknown type: function');
	});
});

describe('deepMerge', () => {
	it('merges simple objects correctly', () => {
		const target = { a: 1, b: 2, c: 3 };
		const source = { b: 3, c: 4 };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: 1, b: 3, c: 4 });
	});

	it('merges nested objects correctly', () => {
		const target = { a: { d: 4, e: 3 }, b: 2 } as { a: { d?: number; e: number }; b: number };
		const source = { a: { e: 5 }, b: 3 };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: { d: 4, e: 5 }, b: 3 });
	});

	it('overrides primitives with objects', () => {
		const target = { a: 1, b: 2 } as { a: object | number; b: object | number };
		const source = { a: { d: 4 }, b: { e: 5 } };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: { d: 4 }, b: { e: 5 } });
	});

	it('merges Color instances correctly', () => {
		const target = { color: Color.parse('#FF5733') };
		const source = { color: Color.parse('#33FF57') };
		const result = deepMerge(target, source);
		expect(result.color.asHex()).toBe('#33FF57');
	});

	it('throws error for unsupported cases', () => {
		const target = { a: (): boolean => false } as { a: (() => boolean) | object };
		const source = { a: { b: 1 } };
		expect(() => deepMerge(target, source)).toThrow('Not implemented yet: "function" case');
	});
});

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

	it('throws an error for invalid base URLs', () => {
		expect(() => resolveUrl('invalid-base', 'path/page')).toThrow('Invalid URL');
	});
});

describe('basename', () => {
	it('returns the last segment of a URL-like string', () => {
		expect(basename('http://example.com/path/to/resource')).toBe('resource');
		expect(basename('/path/to/file.txt')).toBe('file.txt');
		expect(basename('folder/subfolder/item')).toBe('item');
	});

	it('removes trailing slashes before extracting basename', () => {
		expect(basename('http://example.com/path/to/resource/')).toBe('resource');
		expect(basename('/path/to/folder/')).toBe('folder');
		expect(basename('directory/')).toBe('directory');
	});

	it('returns an empty string for root paths or URLs ending with a slash', () => {
		expect(basename('http://example.com/')).toBe('');
		expect(basename('/')).toBe('');
		expect(basename('////')).toBe('');
	});

	it('returns the full string if no slashes are present', () => {
		expect(basename('file')).toBe('file');
		expect(basename('filename.txt')).toBe('filename.txt');
		expect(basename('no/slash')).toBe('slash');
	});

	it('handles empty and null inputs gracefully', () => {
		expect(basename('')).toBe('');
		expect(basename(null as unknown as string)).toBe('');
		expect(basename(undefined as unknown as string)).toBe('');
	});

	it('handles URLs with query strings or fragments', () => {
		expect(basename('http://example.com/path/to/resource?query=param')).toBe('resource');
		expect(basename('http://example.com/path/to/resource#section')).toBe('resource');
		expect(basename('/path/to/resource?query=param')).toBe('resource');
		expect(basename('/path/to/resource#section')).toBe('resource');
	});

	it('handles URLs with special characters', () => {
		expect(basename('http://example.com/path/to/resource%20name')).toBe('resource%20name');
		expect(basename('/path/to/resource-name')).toBe('resource-name');
		expect(basename('http://example.com/resource_name/')).toBe('resource_name');
		expect(basename('/path/to/resource+name')).toBe('resource+name');
	});
});
