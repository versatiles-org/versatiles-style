import { deepClone, isSimpleObject, isBasicType, deepMerge, resolveUrl } from './utils';
import Color from 'color';

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
	});

	it('clones a simple object correctly', () => {
		const obj = { a: 'b', c: 1, d: true };
		const clonedObj = deepClone(obj);
		expect(clonedObj).toEqual(obj);
		expect(clonedObj).not.toBe(obj);
	});

	it('clones a Color instance correctly', () => {
		const color = new Color('#FF5733');
		const clonedColor = deepClone(color);
		expect(clonedColor.hex()).toBe(color.hex());
	});

	it('throws an error for non-implemented types', () => {
		const func = (): boolean => true;
		expect(() => deepClone(func)).toThrow('Not implemented yet: "function" case');
	});
});

describe('isSimpleObject', () => {
	it('identifies simple objects correctly', () => {
		expect(isSimpleObject({ a: 1 })).toBe(true);
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
			readonly #property = true;
		}
		expect(isSimpleObject(new MyClass())).toBe(false);
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
	});

	it('throws error for functions', () => {
		expect(() => isBasicType(() => true)).toThrow();
	});
});

describe('deepMerge', () => {
	it('merges simple objects correctly', () => {
		const target: object = { a: 1, b: 2 };
		const source: object = { b: 3, c: 4 };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: 1, b: 3, c: 4 });
	});

	it('merges nested objects correctly', () => {
		const target: object = { a: { d: 4 }, b: 2 };
		const source: object = { a: { e: 5 }, b: 3 };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: { d: 4, e: 5 }, b: 3 });
	});

	it('overrides primitives with object types', () => {
		const target: object = { a: 1, b: 2 };
		const source: object = { a: { d: 4 }, b: { e: 5 } };
		const result = deepMerge(target, source);
		expect(result).toEqual({ a: { d: 4 }, b: { e: 5 } });
	});

	it('merges Color instances correctly', () => {
		const target = { color: new Color('#FF5733') };
		const source = { color: new Color('#33FF57') };
		const result = deepMerge(target, source);
		expect(result.color.hex()).toBe(source.color.hex());
	});

	it('throws error for unpredicted cases', () => {
		const target: object = { a: (): boolean => false };
		const source: object = { a: { b: 1 } };
		expect(() => deepMerge(target, source)).toThrow('Not implemented yet: "function" case');
	});
});

describe('resolveUrl', () => {
	test('should correctly resolve a relative URL with a base URL', () => {
		expect(resolveUrl('http://example.com/', 'path/page')).toBe('http://example.com/path/page');
	});

	test('should return the same URL if base URL is empty', () => {
		expect(resolveUrl('', 'http://example.com/path/page')).toBe('http://example.com/path/page');
	});

	test('should return the correct URL if absolute URL is used', () => {
		expect(resolveUrl('http://example1.com', 'http://example.com/path/page')).toBe('http://example.com/path/page');
	});

	test('should handle URLs with special characters', () => {
		expect(resolveUrl('http://example.com/', 'path/{param}')).toBe('http://example.com/path/{param}');
	});

	test('should handle URLs already containing encoded special characters', () => {
		expect(resolveUrl('http://example.com/', 'path/%7Bparam%7D')).toBe('http://example.com/path/{param}');
	});

	test('should throw error for invalid base URL', () => {
		expect(() => resolveUrl('invalid-base', 'path/page')).toThrow('Invalid URL');
	});
});
