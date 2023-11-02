
// Utility function to deep clone an object
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

export function isObject(item: unknown): boolean {
	return (typeof item === 'object') && !Array.isArray(item);
}

export function deepMerge<T extends object>(source0: T, ...sources: T[]): T {
	const target: T = deepClone(source0);

	for (const source of sources) {
		if (typeof source !== 'object') continue;
		for (const key in source) {
			if (!Object.hasOwn(source, key)) continue;
			const sourceValue = source[key];
			const targetValue = target[key];
			if (sourceValue && (typeof sourceValue === 'object')) {
				if (targetValue && (typeof targetValue === 'object')) {
					target[key] = deepMerge(targetValue, sourceValue);
				} else {
					target[key] = deepClone(sourceValue);
				}
			} else {
				target[key] = deepClone(sourceValue);
			}
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
