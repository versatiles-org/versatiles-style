
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { styles } from '../src/index.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import tar from 'tar-stream';
import { createGzip } from 'node:zlib';



const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });



const pack = tar.pack();
const { colorful, eclipse, empty, graybeard, neutrino } = styles;

[
	{ name: 'colorful', builder: colorful },
	{ name: 'eclipse', builder: eclipse },
	{ name: 'empty', builder: empty },
	{ name: 'graybeard', builder: graybeard },
	{ name: 'neutrino', builder: neutrino },
].forEach(({ name, builder }) => {
	produce(name + '/style', builder({ language: undefined }));
	if (name === 'empty') return;
	produce(name + '/en', builder({ language: 'en' }));
	produce(name + '/de', builder({ language: 'de' }));
	produce(name + '/nolabel', builder({ hideLabels: true }));
});

pack.finalize();
pack
	.pipe(createGzip({ level: 9 }))
	.pipe(createWriteStream(resolve(dirDst, 'styles.tar.gz')));


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
