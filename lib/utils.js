
// Utility function to deep clone an object
export function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

export function isObject(item) {
	return (typeof item === 'object') && !Array.isArray(item);
}

export function deepMerge(...sources) {
	let target = {};

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
