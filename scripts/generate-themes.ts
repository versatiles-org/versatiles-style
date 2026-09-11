/**
 * Regenerate the nine derived themes in src/themes from `colorful` — see scripts/lib/theme-generator.ts.
 *
 *   npm run generate-themes               # write the tables, listing what changed
 *   npm run generate-themes -- --dry-run  # only list what would change
 *   npm run generate-themes -- --report   # also print key contrasts for all ten themes
 *
 * Only the colour values inside each `light`/`dark` table are rewritten; comments stay. Tune a derived
 * theme through its settings or OVERRIDES in the generator, not in the tables: a unit test fails when
 * the two disagree.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Palette } from '../src/options/index.js';
import { getPaletteColors } from '../src/themes/index.js';
import { contrast, generateThemes, oklabDistance, over, parse, THEMES } from './lib/theme-generator.js';

const DIR = resolve(fileURLToPath(import.meta.url), '../../src/themes');
const args = process.argv.slice(2);
const generated = generateThemes();

let changes = 0;
for (const [name, colors] of Object.entries(generated)) {
	const current = getPaletteColors(name as Palette) as Record<string, string>;
	const changed = Object.entries(colors).filter(([key, value]) => current[key] !== value);
	if (changed.length === 0) continue;
	changes += changed.length;
	const largest = Math.max(...changed.map(([key, value]) => oklabDistance(current[key], value)));
	console.log(`${name}: ${changed.length} colour(s) change, largest OKLab distance ${largest.toFixed(3)}`);
}
if (changes === 0) console.log('All derived themes are up to date.');

if (changes > 0 && !args.includes('--dry-run')) {
	for (const palette of Object.keys(THEMES)) {
		const file = resolve(DIR, `${palette}.ts`);
		let source = readFileSync(file, 'utf8');
		for (const [block, name] of [
			['light', palette],
			['dark', `${palette}-dark`],
		] as const) {
			const colors = generated[name as Palette];
			if (colors) source = replaceTable(source, block, colors, file);
		}
		writeFileSync(file, source);
	}
	console.log('Wrote src/themes. Review the effect with `npm run compare -- --baseline`.');
}

if (args.includes('--report')) report();

/** Replace the values of one `const light|dark: ResolvedColors = { … }` table, keeping everything else. */
function replaceTable(source: string, block: 'light' | 'dark', colors: object, file: string): string {
	const match = new RegExp(`^const ${block}: ResolvedColors = \\{\\n([\\s\\S]*?)^\\};`, 'm').exec(source);
	if (!match) throw new Error(`${file}: no \`const ${block}: ResolvedColors\` table`);
	let body = match[1];
	for (const [key, value] of Object.entries(colors)) {
		const line = new RegExp(`^(\\t${key}: )'[^']*'`, 'm');
		if (!line.test(body)) throw new Error(`${file}: \`${key}\` missing from the ${block} table`);
		body = body.replace(line, `$1'${String(value)}'`);
	}
	const start = match.index + match[0].indexOf(match[1]);
	return source.slice(0, start) + body + source.slice(start + match[1].length);
}

function report(): void {
	const pairs: [string, string, string][] = [
		['label/land', 'label', 'land'],
		['labelWater/water', 'labelWater', 'water'],
		['street/land', 'roadStreet', 'land'],
		['streetBg/land', 'roadStreetBg', 'land'],
		['street/streetBg', 'roadStreet', 'roadStreetBg'],
		['motorway/land', 'roadMotorway', 'land'],
		['rail/land', 'transitRail', 'land'],
		['water/land', 'water', 'land'],
		['building/land', 'building', 'land'],
		['wood/land', 'natureWood', 'land'],
		['glacier/land', 'glacier', 'land'],
		['boundary/land', 'boundary', 'land'],
	];
	const themes = Object.keys(THEMES).flatMap((p) => [p, `${p}-dark`]) as Palette[];
	console.log('\nSigned contrast: above 1 lighter than the background, below 1 darker.\n');
	console.log('pair'.padEnd(18) + themes.map((t) => t.padEnd(15)).join(''));
	for (const [label, fg, bg] of pairs) {
		const cells = themes.map((theme) => {
			const colors = (generated[theme] ?? getPaletteColors(theme)) as Record<string, string>;
			const land = parse(colors.land);
			const background = bg === 'land' ? land : over(parse(colors[bg]), land);
			return contrast(parse(colors[fg]), background).toFixed(2).padEnd(15);
		});
		console.log(label.padEnd(18) + cells.join(''));
	}
}
