
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { styles } from '../src/index.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import type { MaplibreStyle } from '../src/lib/types.js';



const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });



// load styles
Object.entries(styles).forEach(([name, build]) => {
	produce(name, build({ languageSuffix: '' }));
	produce(name + '.en', build({ languageSuffix: '_en' }));
	produce(name + '.de', build({ languageSuffix: '_de' }));
	produce(name + '.nolabel', build({ hideLabels: true }));
});

function produce(name: string, style: MaplibreStyle): void {

	// Validate the style and log errors if any	
	const errors = validateStyleMin(style);
	if (errors.length > 0) console.log(errors);

	// write
	writeFileSync(resolve(dirDst, name + '.json'), prettyStyleJSON(style));
	console.log('Saved ' + name);
}


export function prettyStyleJSON(inputData: unknown): string {
	return recursive(inputData);

	function recursive(data: unknown, prefix = '', path = ''): string {
		if (path.endsWith('.bounds')) return singleLine(data);

		//if (path.includes('.vector_layers[].')) return singleLine(data);
		if (path.startsWith('.layers[].filter')) return singleLine(data);
		if (path.startsWith('.layers[].paint.')) return singleLine(data);
		if (path.startsWith('.layers[].layout.')) return singleLine(data);

		if (typeof data === 'object') {
			if (Array.isArray(data)) {
				return '[\n\t' + prefix + data.map((value: unknown) =>
					recursive(value, prefix + '\t', path + '[]'),
				).join(',\n\t' + prefix) + '\n' + prefix + ']';
			}
			if (data) {
				return '{\n\t' + prefix + Object.entries(data).map(([key, value]) =>
					'"' + key + '": ' + recursive(value, prefix + '\t', path + '.' + key),
				).join(',\n\t' + prefix) + '\n' + prefix + '}';
			}
		}

		return singleLine(data);
	}

	function singleLine(data: unknown): string {
		return JSON.stringify(data, null, '\t').replace(/[\t\n]+/g, ' ');
	}
}
