import { createWriteStream, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getStyleVariants } from '../src/variants.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import tar from 'tar-stream';
import { createGzip } from 'zlib';

const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });

const pack = tar.pack();

const variants = getStyleVariants();
const validationIssues: { name: string; errors: ReturnType<typeof validateStyleMin> }[] = [];
const bar = makeProgressBar(variants.length);

for (let i = 0; i < variants.length; i++) {
	const { name, build } = variants[i];
	bar.update(i, name);
	produce(name, await build());
}
bar.update(variants.length, 'done');
bar.done();

// Report any validation problems after the progress bar, so it stays intact.
for (const { name, errors } of validationIssues) {
	console.log(`Validation errors in ${name}:`, errors);
}
console.log(
	`Saved ${variants.length} styles${validationIssues.length ? ` (${validationIssues.length} with warnings)` : ''}.`
);

pack.finalize();
pack.pipe(createGzip({ level: 9 })).pipe(createWriteStream(resolve(dirDst, 'styles.tar.gz')));

function produce(name: string, style: StyleSpecification): void {
	// Validate the style; collect errors to report once the progress bar finishes.
	const errors = validateStyleMin(style);
	if (errors.length > 0) validationIssues.push({ name, errors });

	// write
	pack.entry({ name: name + '.json' }, prettyStyleJSON(style));
}

function makeProgressBar(total: number, width = 30) {
	const isTTY = process.stdout.isTTY ?? false;
	return {
		update(current: number, label = ''): void {
			if (!isTTY) return;
			const ratio = total === 0 ? 1 : current / total;
			const filled = Math.round(ratio * width);
			const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
			const pct = String(Math.round(ratio * 100)).padStart(3);
			// `\x1b[K` clears the rest of the line so shorter labels don't leave leftovers.
			process.stdout.write(`\r[${bar}] ${pct}% ${current}/${total} ${label}\x1b[K`);
		},
		done(): void {
			if (isTTY) process.stdout.write('\n');
		},
	};
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
