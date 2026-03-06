import { createWriteStream, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getStyleVariants } from '../src/styles/variants.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import tar from 'tar-stream';
import { createGzip } from 'zlib';

const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });

const pack = tar.pack();

const variants = getStyleVariants();
for (const { name, build } of variants) {
	produce(name, await build());
}

pack.finalize();
pack.pipe(createGzip({ level: 9 })).pipe(createWriteStream(resolve(dirDst, 'styles.tar.gz')));

function produce(name: string, style: StyleSpecification): void {
	// Validate the style and log errors if any
	const errors = validateStyleMin(style);
	if (errors.length > 0) console.log(errors);

	// write
	pack.entry({ name: name + '.json' }, prettyStyleJSON(style));
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
				return (
					'[\n\t' +
					prefix +
					data.map((value: unknown) => recursive(value, prefix + '\t', path + '[]')).join(',\n\t' + prefix) +
					'\n' +
					prefix +
					']'
				);
			}
			if (data) {
				return (
					'{\n\t' +
					prefix +
					Object.entries(data)
						.map(([key, value]) => '"' + key + '": ' + recursive(value, prefix + '\t', path + '.' + key))
						.join(',\n\t' + prefix) +
					'\n' +
					prefix +
					'}'
				);
			}
		}

		return singleLine(data);
	}

	function singleLine(data: unknown): string {
		return JSON.stringify(data, null, '\t').replace(/[\t\n]+/g, ' ');
	}
}
