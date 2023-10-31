
// Utility function to deep clone an object
export function deepClone(obj: any): any {
	return JSON.parse(JSON.stringify(obj));
}

export function isObject(item: any): boolean {
	return (typeof item === 'object') && !Array.isArray(item);
}

export function deepMerge(...sources: any[]): any {
	let target: any = {};

	for (let source of sources) {
		if (!isObject(source)) continue;
		for (const key in source) {
			if (!source.hasOwnProperty(key)) return;
			if (isObject(target[key]) && isObject(source[key])) {
				deepMerge(target[key], source[key]);
			} else {
				target[key] = deepClone(source[key]);
			}
		}
	}
	return target;
}

export function prettyStyleJSON(data: any): string {
	return recursive(data);

	function recursive(data: any, prefix: string = '', path: string = ''): string {
		let type: string = typeof data;
		if ((type === 'object') && Array.isArray(data)) type = 'array';

		if (path.endsWith('.bounds')) return singleLine(data);
		//if (path.includes('.vector_layers[].')) return singleLine(data);
		if (path.startsWith('.layers[].filter')) return singleLine(data);
		if (path.startsWith('.layers[].paint.')) return singleLine(data);
		if (path.startsWith('.layers[].layout.')) return singleLine(data);

		switch (type) {
			case 'number':
			case 'string':
			case 'boolean':
				return singleLine(data);
			case 'object':
				return '{\n\t' + prefix + Object.entries(data).map(([key, value]) =>
					'"' + key + '": ' + recursive(value, prefix + '\t', path + '.' + key)
				).join(',\n\t' + prefix) + '\n' + prefix + '}';
			case 'array':
				return '[\n\t' + prefix + data.map((value: any) =>
					recursive(value, prefix + '\t', path + '[]')
				).join(',\n\t' + prefix) + '\n' + prefix + ']';
			default: throw new Error('unknown type: ' + type);
		}
	}

	function singleLine(data: any): string {
		return JSON.stringify(data, null, '\t').replace(/[\t\n]+/g, ' ');
	}
}
