/**
 * The composition of the browser bundle as treemap data, for the README.
 *
 *   npm run doc-bundle              # regenerate the SVG and the section in README.md
 *   tsx scripts/bundle-treemap.ts   # print the JSON
 *
 * Every byte of `release/versatiles-style/versatiles-style.js` is attributed to the source file it came
 * from, by walking the sourcemap the build already emits — no bundler plugin, no extra dependency. The
 * same attribution backs `scripts/browser-bundle.e2e.test.ts`, which asserts that the modules serving
 * tooling rather than pages contribute nothing.
 *
 * The output is the JSON input of `vrt treemap`, which renders it as SVG and prints a linked image with
 * the caption. An SVG shows on GitHub and on npmjs.com alike, unlike Mermaid's `treemap-beta`, which
 * npm does not render at all and GitHub only with a recent enough Mermaid version.
 *
 * The chart is two levels deep on purpose. A README wants the shape of the bundle — which directory
 * costs what, and which few files dominate it — not 85 leaves, which at this size would be unreadable
 * rectangles with no room for a label.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BUNDLE = resolve(ROOT, 'release/versatiles-style/versatiles-style.js');

/** Files smaller than this are folded into their directory's "other" entry. */
const LEAF_MIN_BYTES = 1400;

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DIGITS = new Map([...CHARS].map((char, index) => [char, index]));

function decodeVLQ(segment: string): number[] {
	const values: number[] = [];
	let shift = 0;
	let value = 0;
	for (const char of segment) {
		const digit = DIGITS.get(char);
		if (digit === undefined) throw new Error(`bad VLQ character ${JSON.stringify(char)}`);
		value += (digit & 31) << shift;
		if (digit & 32) {
			shift += 5;
			continue;
		}
		values.push(value & 1 ? -(value >> 1) : value >> 1);
		shift = 0;
		value = 0;
	}
	return values;
}

function bytesPerSource(code: string, map: { mappings: string; sources: string[] }): Map<string, number> {
	const lines = code.split('\n');
	const bytes = new Map<string, number>();
	let source = 0;
	map.mappings.split(';').forEach((lineMappings, lineNumber) => {
		if (!lineMappings) return;
		const line = lines[lineNumber] ?? '';
		let column = 0;
		const segments: { column: number; source: number | null }[] = [];
		for (const segment of lineMappings.split(',')) {
			if (!segment) continue;
			const fields = decodeVLQ(segment);
			column += fields[0];
			if (fields.length > 1) source += fields[1];
			segments.push({ column, source: fields.length > 1 ? source : null });
		}
		segments.sort((a, b) => a.column - b.column);
		segments.forEach((segment, index) => {
			if (segment.source === null) return;
			const end = index + 1 < segments.length ? segments[index + 1].column : line.length;
			const name = (map.sources[segment.source] ?? '?').replace(/^(\.\.\/)+/, '');
			bytes.set(name, (bytes.get(name) ?? 0) + Buffer.byteLength(line.slice(segment.column, end)));
		});
	});
	return bytes;
}

if (!existsSync(BUNDLE)) {
	throw new Error(`${BUNDLE} does not exist — run \`npm run build-browser\` first`);
}
const code = readFileSync(BUNDLE, 'utf8');
const map = JSON.parse(readFileSync(`${BUNDLE}.map`, 'utf8')) as { mappings: string; sources: string[] };
const bytes = bytesPerSource(code, map);

/** `src/shortbread/layers/pois.ts` → `shortbread`; the entry and its neighbours group as `src`. */
const areaOf = (file: string): string => {
	const parts = file.replace(/^src\//, '').split('/');
	return parts.length > 1 ? parts[0] : 'src';
};

const areas = new Map<string, [string, number][]>();
for (const [file, size] of bytes) {
	const area = areaOf(file);
	const leaves = areas.get(area) ?? [];
	leaves.push([file.replace(/^src\//, '').replace(`${area}/`, ''), size]);
	areas.set(area, leaves);
}

/** A treemap node as `vrt treemap` expects it: a leaf with `size` or a group with `children`. */
interface TreemapNode {
	name: string;
	size?: number;
	children?: TreemapNode[];
}

const children: TreemapNode[] = [...areas].map(([area, leaves]) => {
	const nodes: TreemapNode[] = leaves
		.filter(([, size]) => size >= LEAF_MIN_BYTES)
		.map(([name, size]) => ({ name, size }));
	const small = leaves.filter(([, size]) => size < LEAF_MIN_BYTES);
	if (small.length > 0) {
		nodes.push({ name: `other (${small.length} files)`, size: small.reduce((sum, [, size]) => sum + size, 0) });
	}
	return { name: area, children: nodes };
});

const kb = (n: number) => Math.round((n / 1024) * 10) / 10;
const gzip = (await import('node:zlib')).gzipSync(code, { level: 9 }).length;

console.log(
	JSON.stringify({
		title: 'Bundle composition',
		caption:
			`Sized by the bundle's own sourcemap: **${kb(Buffer.byteLength(code))} KB** raw, **${kb(gzip)} KB** gzipped, ` +
			`across ${bytes.size} modules.`,
		unit: 'bytes',
		children,
	})
);
