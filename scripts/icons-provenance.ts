import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';

/**
 * Checks that every icon sits in the source folder it claims.
 *
 * Icons under `icons/<source>/` assert where they came from, and nothing enforced that until this
 * script: a borrowed icon could sit in `versatiles/`, or a redrawn one under an upstream filename
 * in `maki/`, and the sheet would build either way.
 *
 * The test is the raw path data. Two icons that share a run of 40 characters of `d` attribute are
 * the same artwork — that is far too long to collide by chance — so this indexes every 40-character
 * window of every upstream icon, then asks of each of ours whether any window is a hit. Where one
 * is, the exact longest shared run is measured.
 *
 * Exact equality is deliberately NOT the test. It gives false negatives the moment somebody edits
 * an imported icon: `bus` and `tram` were Temaki icons with a single detail redrawn, shared 192 and
 * 363 characters respectively, and matched nothing under equality.
 *
 * Upstream releases are fetched with `npm pack` into a gitignored cache on first run.
 */

const K = 40;
/**
 * A 40-char window is only a CANDIDATE: common syntax like a repeated rounded-corner arc can collide
 * on its own. Confirmation is the exact longest shared run. Real derivations measured here were 192
 * and 363 characters (and verbatim copies run to 100%), while the worst coincidence was 57 — between
 * a caravan and an app terminal — so the bar sits between them.
 */
const MIN_SHARED = 100;
const dirIcons = new URL('../icons', import.meta.url).pathname;
const cache = resolve(dirIcons, '../.icon-sources');

/** Releases to compare against. Extend when a source folder starts tracking a newer version. */
const UPSTREAM = [
	['@mapbox/maki', '6.1.0'],
	['@mapbox/maki', '7.2.0'],
	['@mapbox/maki', '8.0.0'],
	['@mapbox/maki', '8.2.0'],
	['@rapideditor/temaki', '5.3.0'],
	['@rapideditor/temaki', '5.6.0'],
	['@rapideditor/temaki', '5.9.0'],
	['@rapideditor/temaki', '5.11.0'],
	['@rapideditor/temaki', '5.12.0'],
	['@rapideditor/temaki', '5.13.0'],
];

/** Which local folder a given upstream package counts as. */
const folderOf = (pkg: string): string => (pkg.includes('temaki') ? 'temaki' : 'maki');

function ensureUpstream(): { id: string; folder: string; dir: string }[] {
	mkdirSync(cache, { recursive: true });
	const sets: { id: string; folder: string; dir: string }[] = [];
	for (const [pkg, version] of UPSTREAM) {
		const id = `${folderOf(pkg)}-${version}`;
		const dir = resolve(cache, id, 'icons');
		if (!existsSync(dir)) {
			console.log(`  fetching ${pkg}@${version}`);
			const tgz = execFileSync('npm', ['pack', `${pkg}@${version}`, '--silent'], { cwd: cache })
				.toString()
				.trim();
			execFileSync('tar', ['xzf', tgz], { cwd: cache });
			execFileSync('mv', ['package', id], { cwd: cache });
			rmSync(resolve(cache, tgz), { force: true });
		}
		if (existsSync(dir)) sets.push({ id, folder: folderOf(pkg), dir });
	}
	return sets;
}

/** Every `d` attribute of an SVG, concatenated — the artwork with none of the packaging. */
function pathData(file: string): string {
	return [...readFileSync(file, 'utf8').matchAll(/\sd="([^"]+)"/g)].map((m) => m[1].trim()).join(' ');
}

/** Length of the longest run of characters the two strings share. */
function longestShared(a: string, b: string): number {
	let best = 0;
	let prev = new Uint16Array(b.length + 1);
	let cur = new Uint16Array(b.length + 1);
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : 0;
			if (cur[j] > best) best = cur[j];
		}
		[prev, cur] = [cur, prev];
		cur.fill(0);
	}
	return best;
}

const sets = ensureUpstream();
const windows = new Map<string, string>();
const upstreamText = new Map<string, { text: string; folder: string }>();
for (const set of sets) {
	for (const file of readdirSync(set.dir)) {
		if (!file.endsWith('.svg')) continue;
		const id = `${set.id}/${file.slice(0, -4)}`;
		const text = pathData(resolve(set.dir, file));
		upstreamText.set(id, { text, folder: set.folder });
		for (let i = 0; i + K <= text.length; i++) {
			const w = text.slice(i, i + K);
			if (!windows.has(w)) windows.set(w, id);
		}
	}
}
console.log(
	`indexed ${windows.size} ${K}-char windows from ${upstreamText.size} upstream icons across ${sets.length} releases\n`
);

const misfiled: string[] = [];
const unclaimed: string[] = [];
let matched = 0;
let ours = 0;

for (const folder of readdirSync(dirIcons, { withFileTypes: true }).filter((e) => e.isDirectory())) {
	for (const file of readdirSync(resolve(dirIcons, folder.name))) {
		if (!file.endsWith('.svg')) continue;
		ours++;
		const name = file.slice(0, -4);
		const text = pathData(resolve(dirIcons, folder.name, file));

		const votes = new Map<string, number>();
		for (let i = 0; i + K <= text.length; i++) {
			const id = windows.get(text.slice(i, i + K));
			if (id) votes.set(id, (votes.get(id) ?? 0) + 1);
		}
		const hit = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

		const shared = hit ? longestShared(text, upstreamText.get(hit)!.text) : 0;
		// Confirmed when the shared run is long in absolute terms, or when it accounts for most of
		// our own path — short icons (a windowed rectangle) never reach 100 characters in total.
		const real = hit !== undefined && (shared >= MIN_SHARED || shared >= 0.5 * text.length);

		if (real) {
			matched++;
			const up = upstreamText.get(hit!)!;
			// found upstream artwork sitting in a folder that claims we drew it
			if (folder.name !== up.folder) {
				unclaimed.push(`${folder.name}/${name} shares ${shared} chars with ${hit} — belongs in ${up.folder}/`);
			}
		} else if (folder.name === 'maki' || folder.name === 'temaki') {
			// claims an upstream origin but shares no run with any release of it
			misfiled.push(`${folder.name}/${name} matches no upstream release — it is not that source's artwork`);
		}
	}
}

console.log(`${matched} of ${ours} local icons trace to an upstream release`);

let failed = false;
const report = (label: string, lines: string[]): void => {
	if (!lines.length) return;
	failed = true;
	console.log(`\n${label} (${lines.length}):`);
	for (const l of lines) console.log('  ' + l);
};
report('filed under an upstream source but not found there', misfiled);
report('upstream artwork filed as our own', unclaimed);

if (!failed) console.log('\nevery icon sits in the source folder it claims');
if (failed) process.exitCode = 1;
