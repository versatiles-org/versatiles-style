import Color from 'color';

// Utility function to deep clone an object
export function deepClone<T>(obj: T): T {
	const type = typeof obj;
	if (type !== 'object') {
		switch (type) {
			case 'boolean':
			case 'number':
			case 'string':
			case 'undefined':
				return obj;
			default: throw new Error(`Not implemented yet: "${type}" case`);
		}
	}

	if (isSimpleObject(obj)) {
		// @ts-expect-error: Too complicated to handle
		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, deepClone(value)]));
	}

	if (obj instanceof Array) {
		// @ts-expect-error: Too complicated to handle
		return obj.map((e: unknown) => deepClone(e));
	}

	if (obj instanceof Color) {
		// @ts-expect-error: Too complicated to handle
		return Color(obj);
	}

	if (obj == null) return obj;

	console.log('obj', obj);
	console.log('obj.prototype', Object.getPrototypeOf(obj));
	throw Error();
}

export function isSimpleObject(item: unknown): item is object {
	if (item === null) return false;
	if (typeof item !== 'object') return false;
	if (Array.isArray(item)) return false;
	const prototypeKeyCount: number = Object.keys(Object.getPrototypeOf(item) as object).length;
	if (prototypeKeyCount !== 0) return false;
	if (item.constructor.name !== 'Object') return false;
	return true;
}

export function isBasicType(item: unknown): item is boolean | number | string | undefined {
	switch (typeof item) {
		case 'boolean':
		case 'number':
		case 'string':
		case 'undefined':
			return true;
		case 'object':
			return false;
		default:
			throw Error('unknown type: ' + typeof item);
	}
}

export function deepMerge<T extends object>(source0: T, ...sources: Partial<T>[]): T {
	const target: T = deepClone(source0);

	for (const source of sources) {
		if (typeof source !== 'object') continue;
		for (const key in source) {
			if (!(key in source)) continue;

			const sourceValue = source[key] as T[typeof key];

			// *********
			// overwrite
			// *********
			switch (typeof sourceValue) {
				case 'number':
				case 'string':
				case 'boolean':
					target[key] = sourceValue;
					continue;
				default:
			}

			if (isBasicType(target[key])) {
				target[key] = deepClone(sourceValue);
				continue;
			}

			if (sourceValue instanceof Color) {
				// @ts-expect-error: Too complicated to handle
				target[key] = Color(sourceValue);
				continue;
			}

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				target[key] = deepMerge(target[key], sourceValue);
				continue;
			}

			// *********
			// merge
			// *********

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				target[key] = deepMerge(target[key], sourceValue);
				continue;
			}

			console.log('target[key]:', target[key]);
			console.log('source[key]:', source[key]);
			throw Error('unpredicted case');
		}
	}
	return target;
}

export function resolveUrl(base: string, url: string): string {
	if (!base) return url;
	url = new URL(url, base).href;
	url = url.replace(/%7B/gi, '{');
	url = url.replace(/%7D/gi, '}');
	return url;
}

export function basename(url: string): string {
	if (!url) return '';
	try {
		url = new URL(url, 'http://example.org').pathname;
	} catch (_) {
		// ignore
	}
	url = url.replace(/\/+$/, '');
	return url.split('/').pop() ?? '';
}
