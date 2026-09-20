import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { getStyleVariants } from './lib/variants.js';
import { inlineSources } from '../src/lib/index.js';
import { StyleSpecification, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { writeTarball, type TarEntry } from './lib/tarball.js';

const dirDst = new URL('../release', import.meta.url).pathname;
mkdirSync(dirDst, { recursive: true });

/**
 * Well under the real figure (~950 KB for 107 styles), so adding a variant never trips it. The entry
 * count below is the check that actually catches a lost style; this is the backstop for entries that
 * are present but empty, which a count cannot see.
 */
const MIN_BYTES = 200_000;

const variants = getStyleVariants();
const validationIssues: { name: string; errors: ReturnType<typeof validateStyleMin> }[] = [];
const entries: TarEntry[] = [];
const bar = makeProgressBar(variants.length);

for (let i = 0; i < variants.length; i++) {
	const { name, build } = variants[i];
	bar.update(i, name);
	// Published styles must stand on their own: resolve every source reference up front so a
	// map does not pay a TileJSON round-trip before its first tile request.
	produce(name, await inlineSources(build()));
}
bar.update(variants.length, 'done');
bar.done();

// Report every invalid style — after the progress bar, so it stays intact — and then stop.
//
// These used to be printed as "warnings" and the script exited 0 regardless, so `release/styles.tar.gz`
// could be built, uploaded to a GitHub release and served to maps while holding styles MapLibre
// rejects. `validateStyleMin` returns *errors*; there is no such thing as a style that is worth
// publishing and does not load. Nothing is written when any style fails, so a failed run cannot leave
// a half-valid archive behind for the next step to upload.
if (validationIssues.length > 0) {
	for (const { name, errors } of validationIssues) {
		console.error(`Validation errors in ${name}:`, errors);
	}
	throw new Error(
		`build-styles: ${validationIssues.length} of ${variants.length} styles are invalid (${validationIssues
			.map(({ name }) => name)
			.join(', ')}) — not writing styles.tar.gz`
	);
}

// Awaited, and verified against the number of styles that went in: the write used to be a bare
// `pack.pipe(...).pipe(...)`, which returns before any of it has happened, so a write error surfaced as
// an unhandled stream error rather than a non-zero exit.
const size = await writeTarball(resolve(dirDst, 'styles.tar.gz'), entries, {
	entries: variants.length,
	minBytes: MIN_BYTES,
});
console.log(`Saved ${variants.length} styles into styles.tar.gz (${(size / 1024).toFixed(0)} KB).`);

function produce(name: string, style: StyleSpecification): void {
	// Validate the style; collect errors to report once the progress bar finishes.
	const errors = validateStyleMin(style);
	if (errors.length > 0) validationIssues.push({ name, errors });

	entries.push({ name: name + '.json', body: prettyStyleJSON(style) });
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
