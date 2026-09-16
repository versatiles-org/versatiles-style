/**
 * A Mermaid treemap of the browser bundle, for the README.
 *
 *   npm run doc-bundle        # regenerate the section in README.md
 *   tsx scripts/bundle-treemap.ts   # print the block
 *
 * Every byte of `release/versatiles-style/versatiles-style.js` is attributed to the source file it came
 * from, by walking the sourcemap the build already emits — no bundler plugin, no extra dependency. The
 * same attribution backs `scripts/browser-bundle.e2e.test.ts`, which asserts that the modules serving
 * tooling rather than pages contribute nothing.
 *
 * `treemap-beta` needs Mermaid 11.6 or newer, and it is still beta, so its syntax may move. GitHub does
 * not publish which Mermaid version it renders with; to check, push a fenced `mermaid` block whose only
 * content is `info` and read the version it draws. If it is too old the block shows an error box, and
 * the fallback is a `pie` chart of the directory totals, which every Mermaid version has.
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

const areas = new Map<string, { total: number; leaves: [string, number][] }>();
for (const [file, size] of bytes) {
	const area = areaOf(file);
	const entry = areas.get(area) ?? { total: 0, leaves: [] };
	entry.total += size;
	entry.leaves.push([file.replace(/^src\//, '').replace(`${area}/`, ''), size]);
	areas.set(area, entry);
}

const kb = (n: number) => Math.round((n / 1024) * 10) / 10;
const lines = ['```mermaid', 'treemap-beta'];
for (const [area, { total, leaves }] of [...areas].sort((a, b) => b[1].total - a[1].total)) {
	lines.push(`"${area} — ${kb(total)} KB"`);
	const big = leaves.filter(([, size]) => size >= LEAF_MIN_BYTES).sort((a, b) => b[1] - a[1]);
	const rest = leaves.filter(([, size]) => size < LEAF_MIN_BYTES).reduce((sum, [, size]) => sum + size, 0);
	for (const [name, size] of big) lines.push(`    "${name}": ${kb(size)}`);
	if (rest > 0) lines.push(`    "other (${leaves.length - big.length} files)": ${kb(rest)}`);
}
lines.push('```');

const gzip = (await import('node:zlib')).gzipSync(code, { level: 9 }).length;
lines.push(
	'',
	`Sized by the bundle's own sourcemap: **${kb(Buffer.byteLength(code))} KB** raw, **${kb(gzip)} KB** gzipped, ` +
		`across ${bytes.size} modules and nothing from \`node_modules\`. Regenerate with \`npm run doc-bundle\`.`
);

console.log(lines.join('\n'));
