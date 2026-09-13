/**
 * Render the same places in all three schemas and compare the pictures.
 *
 *   npm run schema-compare                       # every view → out/index.html, judged against baseline.json
 *   npm run schema-compare -- berlin tokyo-z16   # only views whose id contains one of these
 *   npm run schema-compare -- --offline          # tiles and glyphs from the cache only
 *   npm run schema-compare -- --refresh berlin   # refetch the tiles of these views first
 *   npm run schema-compare -- --random 10 --seed 3
 *   npm run schema-compare -- --pass geometry    # only one of: geometry, full, sentinel
 *   npm run schema-compare -- --save-baseline    # accept the current results
 *   npm run schema-compare -- berlin-z16 --by-group  # also draw each layer group alone, per schema
 *
 * `osm()`, `omt()` and `protomaps()` share their cartography, so for the same place, zoom and options
 * they should draw the same map. Where they do not, either a schema mapping is wrong — a filter, a zoom
 * gate, a missing kind — or the tile data genuinely differs, and the report is there to tell which.
 *
 * Every tile and glyph comes from the shared tile cache (`scripts/lib/tile-cache.ts`, the same one the
 * dev server uses), and is fetched in a prewarm pass before anything is rendered, so a render never
 * waits on the network. A view for which something could not be loaded is marked incomplete and not
 * judged, rather than scored as a difference.
 *
 * Needs network access on the first run, and `npm run build-sprites` for the icons.
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getLayerGroupMap as shortbreadGroups, type LayerGroupMap } from '../../src/shortbread/layer-groups-map.js';
import { getLayerGroupMap as omtGroups } from '../../src/omt/layer-groups-map.js';
import { getLayerGroupMap as protomapsGroups } from '../../src/protomaps/layer-groups-map.js';
import type { OsmOptions, ResolvedColors } from '../../src/options/index.js';
import type { StyleSpecification } from '../../src/types/index.js';
import { NativeMap } from '../lib/native-render.js';
import { CACHE_DIR, explain, readTile, sourceMetadata, type SourceMetadata } from '../lib/tile-cache.js';
import {
	PAIRS,
	SCHEMAS,
	compareToBaseline,
	nextBaseline,
	pairId,
	type Finding,
	type Results,
	type Schema,
	type ViewResult,
} from './baseline.js';
import { imageName, renderReport } from './report.js';
import { classShares, colorClasses, diff, heatmap, sentinelPalette, type ColorClass } from './score.js';
import { HEIGHT, VIEWS, WIDTH, randomViews, tilesForView, type View } from './views.js';
import { coverage, differingGroups, isolateGroup, leafGroups, oddOneOut, overlap, overlayPixels } from './groups.js';
import { COMMON_OPTIONS, GEOMETRY_OPTIONS, buildStyle } from './styles.js';

const DIR = import.meta.dirname;
const OUT = resolve(DIR, 'out');
const BASELINE = resolve(DIR, 'baseline.json');

const PASSES = ['geometry', 'full', 'sentinel'] as const;
type Pass = (typeof PASSES)[number];

// ── arguments ──────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
	const args = argv.filter((a) => a !== '--');
	const value = (flag: string) => {
		const i = args.indexOf(flag);
		return i >= 0 ? args[i + 1] : undefined;
	};
	const flagsWithValue = new Set(['--random', '--seed', '--pass']);
	const known = new Set([...flagsWithValue, '--offline', '--refresh', '--save-baseline', '--by-group']);
	const unknown = args.filter((a) => a.startsWith('--') && !known.has(a));
	if (unknown.length > 0) throw new Error(`unknown flag ${unknown.join(', ')}`);
	const positional = args.filter((a, i) => !a.startsWith('--') && !flagsWithValue.has(args[i - 1]));
	const pass = value('--pass');
	if (pass !== undefined && !(PASSES as readonly string[]).includes(pass)) {
		throw new Error(`--pass must be one of ${PASSES.join(', ')}`);
	}
	return {
		filters: positional,
		offline: args.includes('--offline'),
		refresh: args.includes('--refresh'),
		saveBaseline: args.includes('--save-baseline'),
		random: Number(value('--random') ?? 0),
		seed: Number(value('--seed') ?? 1),
		passes: pass ? [pass as Pass] : [...PASSES],
		byGroup: args.includes('--by-group'),
	};
}

// ── styles ─────────────────────────────────────────────────────────────────────

/** The options of each pass; see `styles.ts` for what is held fixed. */
function optionsFor(pass: Pass, sentinel: ResolvedColors): OsmOptions {
	if (pass === 'full') return COMMON_OPTIONS;
	if (pass === 'geometry') return GEOMETRY_OPTIONS;
	return { ...GEOMETRY_OPTIONS, colors: sentinel };
}

/**
 * Layer id → its layer group path, e.g. `street-motorway` → `roads.motorways`. The three builders share
 * most ids, but each has a few of its own (Protomaps' `land-lowzoom-*`), so all three maps are merged.
 */
function layerGroups(): Map<string, string> {
	const out = new Map<string, string>();
	const visit = (node: LayerGroupMap, path: string[]) => {
		for (const [key, child] of Object.entries(node)) {
			if (path.length === 0 && key === 'icons') continue; // an alias, not a group
			if (Array.isArray(child)) child.forEach((id) => out.set(id, [...path, key].join('.')));
			else visit(child, [...path, key]);
		}
	};
	for (const map of [shortbreadGroups(), omtGroups(), protomapsGroups()]) visit(map, []);
	return out;
}

/** The colour classes of all three styles, merged by colour: a schema lacking a layer still knows it. */
function mergeClasses(lists: ColorClass[][]): ColorClass[] {
	const byColor = new Map<string, { rgb: [number, number, number]; names: Set<string> }>();
	for (const cls of lists.flat()) {
		const key = cls.rgb.join(',');
		const entry = byColor.get(key) ?? byColor.set(key, { rgb: cls.rgb, names: new Set() }).get(key)!;
		cls.name.split(' + ').forEach((name) => entry.names.add(name));
	}
	return [...byColor.values()].map(({ rgb, names }) => ({ rgb, name: [...names].sort().join(' + ') }));
}

// ── main ───────────────────────────────────────────────────────────────────────

async function png(pixels: Uint8Array): Promise<Buffer> {
	return sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
		.png()
		.toBuffer();
}

/**
 * `--by-group`: every leaf layer group drawn alone, in every schema, compared by where it draws.
 * Groups outer and views inner, so a style is loaded once per group and schema, not once per view.
 */
async function compareGroups(
	views: View[],
	results: Results,
	metadata: Record<Schema, SourceMetadata>,
	cache: { offline: boolean },
	/** Geometry renders from the regular run, the faded background of the overlays. */
	backgrounds: ReadonlyMap<string, Record<Schema, Uint8Array>>
) {
	const tree = shortbreadGroups();
	const byView = new Map(results.views.map((r) => [r.view, r]));
	const renderAll = async (layers: OsmOptions['layers']) => {
		const out = new Map<string, Partial<Record<Schema, Uint8Array>>>();
		await Promise.all(
			SCHEMAS.map(async (schema) => {
				const options: OsmOptions = { ...COMMON_OPTIONS, layers };
				const map = new NativeMap(buildStyle(schema, metadata[schema], options), cache);
				for (const view of views) {
					const rendered = await map.render({ center: view.center, zoom: view.zoom, width: WIDTH, height: HEIGHT });
					if (rendered.failures.length > 0) byView.get(view.id)!.failures.push(...rendered.failures);
					else out.set(view.id, { ...out.get(view.id), [schema]: rendered.pixels });
				}
				map.release();
			})
		);
		return out;
	};

	const empty = await renderAll(false);
	const leaves = leafGroups(tree);
	for (const [index, group] of leaves.entries()) {
		process.stdout.write(`\r  by group: ${index + 1}/${leaves.length} ${group.padEnd(30)}`);
		const drawn = await renderAll(isolateGroup(tree, group));
		for (const view of views) {
			const [pixels, base] = [drawn.get(view.id), empty.get(view.id)];
			if (!pixels || !base || SCHEMAS.some((s) => !pixels[s] || !base[s])) continue;
			const masks = Object.fromEntries(SCHEMAS.map((s) => [s, coverage(pixels[s]!, base[s]!)])) as Record<
				Schema,
				Uint8Array
			>;
			const result = byView.get(view.id)!;
			const pairs = Object.fromEntries(PAIRS.map((pair) => [pairId(pair), overlap(masks[pair[0]], masks[pair[1]])]));
			result.groups ??= {};
			result.groups[group] = pairs;

			// A picture of where the group differs: from the schema that stands apart.
			if (differingGroups({ [group]: pairs }).length > 0) {
				const odd = oddOneOut(pairs);
				const majority = SCHEMAS.find((s) => s !== odd)!;
				const background = backgrounds.get(view.id)?.[majority] ?? base[majority]!;
				const file = resolve(OUT, imageName(view.id, 'group', group));
				writeFileSync(file, await png(overlayPixels(masks, odd, background)));
			}
		}
	}
	console.log();
	for (const result of byView.values()) result.complete = result.failures.length === 0;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const views: View[] = [...VIEWS, ...randomViews(args.random, args.seed)].filter(
		(v) => args.filters.length === 0 || args.filters.some((f) => v.id.includes(f))
	);
	if (views.length === 0) throw new Error('no view matches the filters');
	const cache = { offline: args.offline };
	mkdirSync(OUT, { recursive: true });

	// 1. what each tileset is
	const metadata = {} as Record<Schema, SourceMetadata>;
	for (const schema of SCHEMAS) metadata[schema] = await sourceMetadata(schema, cache);
	const builds = Object.fromEntries(SCHEMAS.map((s) => [s, metadata[s].label])) as Results['builds'];

	// 2. prewarm: every tile every view needs, before anything renders
	const prewarmFailures = new Map<string, string[]>();
	let fetched = 0;
	let planned = 0;
	for (const view of views) {
		const failures: string[] = [];
		await Promise.all(
			SCHEMAS.flatMap((schema) =>
				tilesForView(view, metadata[schema]).map(async ({ z, x, y }) => {
					planned++;
					if (args.refresh) rmSync(resolve(CACHE_DIR, schema, String(z), String(x), `${y}.pbf`), { force: true });
					try {
						if (!(await readTile(schema, z, x, y, cache)).hit) fetched++;
					} catch (error) {
						failures.push(`${schema} ${z}/${x}/${y}: ${explain(error)}`);
					}
				})
			)
		);
		prewarmFailures.set(view.id, failures);
		process.stdout.write(
			`\r  prewarm: ${views.indexOf(view) + 1}/${views.length} views, ${fetched} of ${planned} tiles fetched`
		);
	}
	console.log();

	// 3. render and score
	const sentinel = sentinelPalette();
	const groups = layerGroups();
	const styles = {} as Record<Pass, Record<Schema, StyleSpecification>>;
	const maps = {} as Record<Pass, Record<Schema, NativeMap>>;
	for (const pass of args.passes) {
		styles[pass] = {} as Record<Schema, StyleSpecification>;
		maps[pass] = {} as Record<Schema, NativeMap>;
		for (const schema of SCHEMAS) {
			styles[pass][schema] = buildStyle(schema, metadata[schema], optionsFor(pass, sentinel));
			maps[pass][schema] = new NativeMap(styles[pass][schema], cache);
		}
	}

	const results: Results = { builds, views: [] };
	const backgrounds = new Map<string, Record<Schema, Uint8Array>>();
	for (const view of views) {
		const started = Date.now();
		const result: ViewResult = {
			view: view.id,
			complete: true,
			failures: [...(prewarmFailures.get(view.id) ?? [])],
			geometry: {},
			full: {},
			classes: {},
		};
		const renderView = { center: view.center, zoom: view.zoom, width: WIDTH, height: HEIGHT };

		for (const pass of args.passes) {
			const pixels = {} as Record<Schema, Uint8Array>;
			await Promise.all(
				SCHEMAS.map(async (schema) => {
					try {
						const rendered = await maps[pass][schema].render(renderView);
						pixels[schema] = rendered.pixels;
						result.failures.push(...rendered.failures.map((f) => `${pass} ${schema}: ${f}`));
						writeFileSync(resolve(OUT, imageName(view.id, pass, schema)), await png(rendered.pixels));
					} catch (error) {
						result.failures.push(`${pass} ${schema}: render failed: ${explain(error)}`);
					}
				})
			);
			if (SCHEMAS.some((schema) => !pixels[schema])) continue;
			if (pass === 'geometry' && args.byGroup) backgrounds.set(view.id, pixels);

			if (pass === 'sentinel') {
				const classes = mergeClasses(
					SCHEMAS.map((s) => colorClasses(styles.sentinel[s], view.zoom, (id) => groups.get(id)))
				);
				for (const schema of SCHEMAS) result.classes[schema] = classShares(pixels[schema], classes);
			} else {
				for (const pair of PAIRS) {
					const d = diff(pixels[pair[0]], pixels[pair[1]], WIDTH, HEIGHT);
					result[pass][pairId(pair)] = d.share;
					writeFileSync(
						resolve(OUT, imageName(view.id, pass, pairId(pair))),
						await png(heatmap(pixels[pair[0]], d.mask))
					);
				}
			}
		}

		result.complete = result.failures.length === 0;
		results.views.push(result);
		const scores = PAIRS.map((p) => `${pairId(p)} ${((result.geometry[pairId(p)] ?? NaN) * 100).toFixed(1)}%`).join(
			'  '
		);
		console.log(
			`  ${view.id.padEnd(28)} ${result.complete ? '' : `INCOMPLETE (${result.failures.length}) `}${scores}  ${Date.now() - started}ms`
		);
	}
	for (const pass of args.passes) for (const schema of SCHEMAS) maps[pass][schema].release();

	// 3b. each layer group alone
	if (args.byGroup) await compareGroups(views, results, metadata, cache, backgrounds);

	// 4. judge, report, save
	const baseline = existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Results) : undefined;
	let findings: Finding[] | undefined;
	if (args.saveBaseline && args.passes.length < PASSES.length) {
		throw new Error('--save-baseline needs every pass; drop --pass');
	} else if (args.saveBaseline) {
		// Views not in this run keep their accepted results.
		const kept = (baseline?.views ?? []).filter((v) => !results.views.some((r) => r.view === v.view));
		const saved = nextBaseline(
			{ builds, views: [...kept, ...results.views.filter((v) => !v.view.startsWith('random-'))] },
			baseline
		);
		writeFileSync(BASELINE, JSON.stringify(saved, null, '\t') + '\n');
		console.log(`\n  baseline saved: ${saved.views.length} views → ${BASELINE}`);
	} else if (baseline) {
		findings = compareToBaseline(results, baseline);
	}

	writeFileSync(resolve(OUT, 'results.json'), JSON.stringify(results, null, '\t'));
	writeFileSync(resolve(OUT, 'index.html'), renderReport({ results, baseline, findings, passes: args.passes }));

	for (const f of findings ?? []) console.log(`  ${f.kind === 'regression' ? '✗' : '✓'} ${f.view}: ${f.message}`);
	const regressions = (findings ?? []).filter((f) => f.kind === 'regression').length;
	const incomplete = results.views.filter((v) => !v.complete).length;
	console.log(`\n  ${results.views.length} views, ${incomplete} incomplete, ${regressions} regressions`);
	console.log(`  → ${resolve(OUT, 'index.html')}`);
	if (regressions > 0) process.exitCode = 1;
}

await main();
