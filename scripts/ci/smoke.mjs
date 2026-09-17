// Does the *published package* run on the Node version `engines` claims to support?
//
// Plain `.mjs`, run with bare `node` against an installed tarball — no tsx, no vitest, no devDeps of
// any kind. That is the point: the dev toolchain needs Node 22.12+ (vitest's own floor), so the unit
// suite can never answer this question. `engines: { node: '>=20' }` is a promise to consumers about
// `dist/`, and this is the only thing that checks it.
//
// Imports all four published subpaths through the package name, so the `exports` map is exercised the
// way a consumer exercises it rather than by path.

import { createRequire } from 'node:module';

import { osm, satellite, guessSchema, guessStyle, inlineSources, Color } from '@versatiles/style';
import { omt } from '@versatiles/style/omt';
import { protomaps } from '@versatiles/style/protomaps';
import { guessOptions, deriveOptions } from '@versatiles/style/migrate';

// Prove we are testing an *installed* copy before testing anything about it.
//
// Node resolves a bare import from the importing file's own directory upward, and a package can
// self-reference by its own name once it has an `exports` map. Run this file from inside the repo and
// `@versatiles/style` resolves to the repo's own `dist/` — every check below then passes while
// testing the working tree instead of the tarball, which is exactly the failure this job exists to
// rule out. So the script must be copied next to the install; this refuses to run if it was not.
const resolved = createRequire(import.meta.url).resolve('@versatiles/style');
if (!resolved.includes('node_modules')) {
	console.error(
		`✗ resolved @versatiles/style to ${resolved}\n` +
			'  That is not an installed copy. Copy this script into the directory where the packed\n' +
			'  tarball was installed and run it from there.'
	);
	process.exit(1);
}
console.log(`testing ${resolved}\n`);

const checks = [
	['osm() builds a full style', () => osm({ theme: 'colorful' }).layers.length > 100],
	['satellite() builds a style', () => satellite().layers.length > 0],
	['omt() builds a full style', () => omt().layers.length > 100],
	[
		'protomaps() builds a full style',
		() => protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } }).layers.length > 100,
	],
	[
		'protomaps() demands its archive',
		() => {
			try {
				protomaps();
				return false;
			} catch (e) {
				return /urls\.protomaps is required/.test(e.message);
			}
		},
	],
	[
		'guessSchema() recognises Shortbread',
		() => guessSchema({ tiles: [], vector_layers: [{ id: 'water_polygons' }, { id: 'streets' }] }).type === 'vector',
	],
	['guessStyle() is async', () => guessStyle('https://example.org/t.json') instanceof Promise],
	['migrate subpath resolves', () => typeof guessOptions === 'function' && typeof deriveOptions === 'function'],
	['inlineSources is exported', () => typeof inlineSources === 'function'],
	['Color parses and serialises', () => Color.parse('#f00').asString() === 'rgb(255,0,0)'],
	[
		'unknown options throw',
		() => {
			try {
				osm({ textScale: 2 });
				return false;
			} catch (e) {
				return /textScale/.test(e.message);
			}
		},
	],
];

let failed = 0;
for (const [name, check] of checks) {
	let ok = false;
	let detail = '';
	try {
		ok = check() === true;
	} catch (e) {
		detail = ` — ${e.message}`;
	}
	if (!ok) failed++;
	console.log(`${ok ? '✓' : '✗'} ${name}${detail}`);
}

console.log(`\n${checks.length - failed}/${checks.length} passed on node ${process.version}`);
process.exit(failed === 0 ? 0 : 1);
