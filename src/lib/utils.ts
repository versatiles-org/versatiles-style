import Color from 'color';

// Utility function to deep clone an object
export function deepClone<T>(obj: T): T {
	const type = typeof obj;
	if (type !== 'object') {
		switch (type) {
			case 'boolean':
			case 'number':
			case 'string':
				return obj;
		}
		throw Error(type);
	}

	if (isSimpleObject(obj)) {
		// @ts-ignore
		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, deepClone(value)]))
	}

	if (obj instanceof Array) {
		// @ts-ignore
		return obj.map(e => deepClone(e));
	}

	if (obj instanceof Color) {
		// @ts-ignore
		return Color(obj);
	}

	console.log('obj', obj);
	console.log('obj.prototype', Object.getPrototypeOf(obj));
	throw Error();
}

export function isSimpleObject(item: unknown): boolean {
	return (typeof item === 'object') && !Array.isArray(item) && (Object.keys(Object.getPrototypeOf(item)).length === 0);
}

export function isBasicType(item: unknown): boolean {
	switch (typeof item) {
		case 'boolean':
		case 'number':
		case 'string':
		case 'undefined':
			return true;
		case 'object':
			return false;
		default:
			throw Error('unknown type: ' + typeof item)
	}
}

export function deepMerge<T extends object>(source0: T, ...sources: T[]): T {
	const target: T = deepClone(source0);

	for (const source of sources) {
		if (typeof source !== 'object') continue;
		for (const key in source) {
			if (!Object.hasOwn(source, key)) continue;

			const sourceValue = source[key];
			if (sourceValue === undefined) continue;

			// *********
			// overwrite
			// *********
			switch (typeof sourceValue) {
				case 'number':
				case 'string':
				case 'boolean':
					target[key] = sourceValue;
					continue;
			}

			if (isBasicType(target[key])) {
				target[key] = deepClone(sourceValue);
				continue;
			}

			if (sourceValue instanceof Color) {
				// @ts-ignore
				target[key] = Color(sourceValue);
				continue;
			}

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				// @ts-ignore
				target[key] = deepMerge(target[key], sourceValue);
				continue
			}

			// *********
			// merge
			// *********

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				// @ts-ignore
				target[key] = deepMerge(target[key], sourceValue);
				continue
			}

			console.log('target[key]:', target[key]);
			console.log('source[key]:', source[key]);
			throw Error('unpredicted case');
		}
	}
	return target;
}

export function prettyStyleJSON(data: unknown): string {
	return recursive(data);

	function recursive(data: unknown, prefix: string = '', path: string = ''): string {
		if (path.endsWith('.bounds')) return singleLine(data);

		//if (path.includes('.vector_layers[].')) return singleLine(data);
		if (path.startsWith('.layers[].filter')) return singleLine(data);
		if (path.startsWith('.layers[].paint.')) return singleLine(data);
		if (path.startsWith('.layers[].layout.')) return singleLine(data);

		if (typeof data === 'object') {
			if (Array.isArray(data)) {
				return '[\n\t' + prefix + data.map((value: unknown) =>
					recursive(value, prefix + '\t', path + '[]')
				).join(',\n\t' + prefix) + '\n' + prefix + ']';
			}
			if (data) {
				return '{\n\t' + prefix + Object.entries(data).map(([key, value]) =>
					'"' + key + '": ' + recursive(value, prefix + '\t', path + '.' + key)
				).join(',\n\t' + prefix) + '\n' + prefix + '}';
			}
		}

		return singleLine(data);
	}

	function singleLine(data: unknown): string {
		return JSON.stringify(data, null, '\t').replace(/[\t\n]+/g, ' ');
	}
}
