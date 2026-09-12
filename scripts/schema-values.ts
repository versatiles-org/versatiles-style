/**
 * What values does a tileset's fields actually carry? Sampled from real tiles.
 *
 *   npm run schema-values -- omt                 # every sampled layer's field values
 *   npm run schema-values -- omt landcover park  # just these source-layers
 *   npm run schema-values -- omt --refresh       # re-download the sample instead of using the cache
 *
 * ── The gap this closes ───────────────────────────────────────────────────────
 *
 * A vendored schema record states a tileset's source-layers, zooms and *field names* — everything
 * TileJSON knows. Cartography needs more than that: `['==', ['get', 'class'], 'lake']` is a claim about
 * a **value**, and a filter on a value the tiles never use renders nothing, silently, exactly like the
 * missing-field bug the conformance suite exists to catch. `npm run schema-gate` cannot see it and no
 * offline test can, so the filters in `src/omt/layers/*` were written from the published OpenMapTiles
 * schema — prose, not evidence. This script is the evidence.
 *
 * ── Why it is a script, never a test ──────────────────────────────────────────
 *
 * It needs live tiles, so it can never be a CI gate (SCHEMA-SUPPORT-PLAN.md §8.2, risk 15). Two further
 * reasons to keep it manual: OpenFreeMap's tile URL embeds a build timestamp and rotates daily, so the
 * TileJSON has to be resolved each run; and the sample is a dozen tiles of a planet, so an absent value
 * is weak evidence — it may just not occur in the areas sampled. A value that *is* present is strong
 * evidence, and that asymmetry is what the output is for.
 *
 * Tiles are cached under `scripts/tiles/` (gitignored) so repeat runs cost nothing.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import process from 'node:process';
import { decodeTile, type MvtValue } from './lib/mvt.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, 'scripts/tiles');

/** TileJSON per schema name, matching `npm run vendor-schema`. */
const SOURCES: Record<string, string> = {
	omt: 'https://tiles.openfreemap.org/planet',
};

/**
 * The sample: twelve tiles chosen to exercise different class vocabularies rather than to be
 * representative of anything. Low zooms for the classes that only exist there, cities for the built
 * environment, and deliberate extremes (ice, desert, polder) for the natural classes a European city
 * tile will never contain.
 */
const SAMPLE: { name: string; z: number; lon: number; lat: number }[] = [
	{ name: 'world', z: 2, lon: 10, lat: 50 },
	{ name: 'europe', z: 5, lon: 10, lat: 50 },
	{ name: 'greenland-ice', z: 6, lon: -45, lat: 72 },
	{ name: 'alps', z: 10, lon: 7.7, lat: 45.9 },
	{ name: 'nevada-desert', z: 10, lon: -115.5, lat: 37.0 },
	{ name: 'berlin', z: 14, lon: 13.4, lat: 52.52 },
	{ name: 'amsterdam', z: 14, lon: 4.9, lat: 52.37 },
	{ name: 'london', z: 14, lon: -0.12, lat: 51.5 },
	{ name: 'new-york', z: 14, lon: -74.0, lat: 40.71 },
	{ name: 'tokyo', z: 14, lon: 139.7, lat: 35.69 },
	{ name: 'black-forest', z: 13, lon: 8.2, lat: 48.5 },
	{ name: 'dutch-polder', z: 13, lon: 5.5, lat: 52.6 },
	// Feature-specific spots, added because the twelve above covered their layers too thinly to write a
	// filter from — `aeroway` had seven features in total, none of them a taxiway. A sample is only
	// evidence for what it contains, so when a module's layer comes up thin, extend this list rather than
	// fall back to the published schema.
	{ name: 'schiphol-airport', z: 13, lon: 4.76, lat: 52.31 },
	{ name: 'jfk-airport', z: 13, lon: -73.78, lat: 40.64 },
	{ name: 'rotterdam-port', z: 13, lon: 4.36, lat: 51.91 },
	{ name: 'hoover-dam', z: 14, lon: -114.737, lat: 36.016 },
	// A ski resort: the only place aerialways and funiculars occur in any number.
	{ name: 'zermatt-lifts', z: 13, lon: 7.748, lat: 46.02 },
];

/** Slippy-map tile containing a coordinate. */
function tileOf(z: number, lon: number, lat: number): { z: number; x: number; y: number } {
	const n = 2 ** z;
	const x = Math.floor(((lon + 180) / 360) * n);
	const rad = (lat * Math.PI) / 180;
	const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
	return { z, x, y };
}

async function fetchTile(template: string, name: string, z: number, x: number, y: number, refresh: boolean) {
	const file = resolve(CACHE, `${name}-${z}-${x}-${y}.pbf`);
	if (!refresh && existsSync(file)) return readFileSync(file);
	const url = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
	let body = new Uint8Array(await response.arrayBuffer());
	// Some tile servers return raw gzip with no Content-Encoding for fetch to undo.
	if (body[0] === 0x1f && body[1] === 0x8b) body = gunzipSync(body);
	mkdirSync(CACHE, { recursive: true });
	writeFileSync(file, body);
	return body;
}

/** Fields whose values are worth enumerating: low-cardinality, and what filters actually test. */
const INTERESTING =
	/^(class|subclass|brunnel|kind|type|category|intermittent|surface|service|network|capital|ramp|oneway|expressway|access|bicycle|foot|toll|indoor|layer|level|admin_level|disputed|maritime|rank|hide_3d)$/;
/** Above this many distinct values a field is an identifier or a name, not a vocabulary. */
const MAX_DISTINCT = 60;

async function main(): Promise<void> {
	const args = process.argv.slice(2).filter((a) => a !== '--');
	const refresh = args.includes('--refresh');
	const positional = args.filter((a) => !a.startsWith('--'));
	const name = positional[0];
	const only = new Set(positional.slice(1));
	const tileJSONUrl = name ? SOURCES[name] : undefined;
	if (!tileJSONUrl) {
		console.error(`Usage: npm run schema-values -- <${Object.keys(SOURCES).join('|')}> [source-layer…] [--refresh]`);
		process.exit(1);
	}

	const response = await fetch(tileJSONUrl);
	if (!response.ok) throw new Error(`${tileJSONUrl} → HTTP ${response.status}`);
	const tileJSON = (await response.json()) as { tiles?: string[]; version?: string };
	const template = tileJSON.tiles?.[0];
	if (!template) throw new Error(`${tileJSONUrl} carries no tiles template`);
	console.log(`${name} ${tileJSON.version ?? ''} — ${template}\n`);

	// layer → field → value → { count, tiles, geometry }
	//
	// Geometry type is tracked per value because it is load-bearing and nothing else reports it: one
	// OpenMapTiles source-layer routinely carries lines *and* polygons under the same class, so
	// `transportation` class `pier`, `path` and `bridge` are the counterparts of Shortbread's separate
	// `pier_polygons`, `street_polygons` and `bridges` layers. Reading the schema prose as "transportation
	// is lines only" sent three of the gate's verdicts the wrong way until a tile said otherwise.
	type Observed = { count: number; tiles: Set<string>; geometry: Map<string, number> };
	const seen = new Map<string, Map<string, Map<string, Observed>>>();
	const GEOMETRY = ['unknown', 'point', 'line', 'polygon'];
	const featureCount = new Map<string, number>();
	const tilesWithLayer = new Map<string, Set<string>>();

	for (const spot of SAMPLE) {
		const { z, x, y } = tileOf(spot.z, spot.lon, spot.lat);
		const buf = await fetchTile(template, spot.name, z, x, y, refresh);
		const layers = decodeTile(buf);
		const label = `${spot.name}/z${z}`;
		console.log(
			`  ${label.padEnd(22)} ${String(buf.length).padStart(7)} bytes, ${String(layers.length).padStart(2)} layers, ` +
				`${layers.reduce((n, l) => n + l.features.length, 0)} features`
		);
		for (const layer of layers) {
			if (only.size > 0 && !only.has(layer.name)) continue;
			featureCount.set(layer.name, (featureCount.get(layer.name) ?? 0) + layer.features.length);
			(tilesWithLayer.get(layer.name) ?? tilesWithLayer.set(layer.name, new Set()).get(layer.name)!).add(label);
			const fields = seen.get(layer.name) ?? seen.set(layer.name, new Map()).get(layer.name)!;
			for (const feature of layer.features) {
				for (const [key, value] of Object.entries(feature.properties)) {
					if (!INTERESTING.test(key)) continue;
					const values = fields.get(key) ?? fields.set(key, new Map()).get(key)!;
					const k = String(value as MvtValue);
					const entry = values.get(k) ?? values.set(k, { count: 0, tiles: new Set(), geometry: new Map() }).get(k)!;
					entry.count++;
					entry.tiles.add(label);
					const geometry = GEOMETRY[feature.type] ?? String(feature.type);
					entry.geometry.set(geometry, (entry.geometry.get(geometry) ?? 0) + 1);
				}
			}
		}
	}

	console.log(`\n── observed values ──\n`);
	for (const layerName of [...seen.keys()].sort()) {
		const fields = seen.get(layerName)!;
		console.log(
			`${layerName}  (${featureCount.get(layerName)} features across ${tilesWithLayer.get(layerName)?.size ?? 0} tiles)`
		);
		for (const field of [...fields.keys()].sort()) {
			const values = fields.get(field)!;
			const sorted = [...values.entries()].sort((a, b) => b[1].count - a[1].count);
			if (sorted.length > MAX_DISTINCT) {
				console.log(`  ${field}: ${sorted.length} distinct values — not a vocabulary, skipped`);
				continue;
			}
			console.log(`  ${field}:`);
			for (const [value, { count, tiles, geometry }] of sorted) {
				const geom = [...geometry.entries()].sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g}:${n}`);
				console.log(
					`    ${value.padEnd(26)} ${String(count).padStart(6)}×  ${geom.join(' ').padEnd(22)} ${[...tiles].slice(0, 2).join(' ')}`
				);
			}
		}
		console.log('');
	}

	console.log(
		'Absence is weak evidence: a value missing here may simply not occur in these twelve tiles.\n' +
			'Presence is strong — a value listed above is one a filter can rely on.'
	);
}

await main();
