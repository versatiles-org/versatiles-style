/**
 * Render fixed views just below and at every integer zoom in MapLibre GL JS, and measure what changes
 * across the boundary. A map at z10.999 and one at z11 should look nearly identical (issue #146).
 *
 *   npm run zoom-compare                      # → .cache/zoom-compare/index.html
 *   npm run zoom-compare -- --quick           # two places, no dark theme, no per-layer renders
 *   npm run zoom-compare -- --offline         # tiles and glyphs from the cache only
 *   npm run zoom-compare -- --globe           # globe, 3D buildings, visible atmosphere → .cache/zoom-compare/globe/
 *   npm run zoom-compare -- --landcover       # `features.landcover` on → .cache/zoom-compare/landcover/
 *   npm run zoom-compare -- --save-baseline   # keep this run; later runs show it next to theirs
 *
 * What is measured, so that a jump can be traced to what causes it:
 *
 * - **Control** — any two zooms differ a little, because edges move by a fraction of a pixel. So each
 *   boundary `z − ε` → `z` comes with `z − 2ε` → `z − ε`, the same step with no boundary in between.
 * - **Without symbols** — takes labels and icons, and their placement, out of the picture.
 * - **Same tiles** — the sources end at `z − 1`, so both sides overzoom the same tiles, and what is left
 *   comes from the style alone.
 * - **Layers with a hard bound** — each layer `hardBounds` lists, alone over the background, across that
 *   bound. The boundary sets cannot show a layer whose data starts exactly there in "same tiles".
 * - **The land cover alone** — with `--landcover`, its fills over the background, with OSM out of the way.
 *
 * `--globe` also turns on what reads `style.light`, because without 3D buildings or a visible atmosphere a
 * style has no light, and so none of the step it takes at `BUILDINGS_APPEAR_ZOOM` on a globe.
 *
 * Symbol fade is off in the renderer: the frames show where placement ends up, not the animation a user
 * sees on the way. Needs Chromium for Playwright (`npx playwright install chromium`), network access on
 * the first run, and `npm run build-sprites` for the icons.
 */
import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { osm } from '../../src/index.js';
import type { OsmOptions } from '../../src/options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../../src/types/index.js';
import { GlMap } from '../lib/gljs-render.js';
import { tileTemplate } from '../lib/native-render.js';
import { cacheDir } from '../lib/paths.js';
import { sourceMetadata, type TileSchema } from '../lib/tile-cache.js';
import { CHANGED, diff } from '../overlay-compare/measure.js';
import { hardBounds, isolateLayer, landcoverAlone, withoutSymbols, withSameTiles } from './measure.js';
import { boundaryImage, renderReport, type BoundaryRow, type BoundRow, type Pair, type ReportData } from './report.js';

const SIZE = 512;
const EPSILON = 0.001;
const ZOOMS = Array.from({ length: 18 }, (_, i) => i + 1);
const LIGHT_THEME = 'colorful';
const DARK_THEME = 'colorful-dark';

type Place = { name: string; center: [number, number] };

const PLACES: Place[] = [
	{ name: 'city', center: [13.4, 52.52] }, // Berlin
	{ name: 'coast', center: [-4.49, 48.38] }, // Brest
	{ name: 'rural', center: [9.3, 50.6] }, // Vogelsberg, Hesse
	{ name: 'mountain', center: [11.4, 47.27] }, // Innsbruck
];

function parseArgs(argv: string[]) {
	const args = argv.filter((a) => a !== '--');
	const known = new Set(['--quick', '--offline', '--globe', '--landcover', '--save-baseline']);
	const unknown = args.filter((a) => !known.has(a));
	if (unknown.length > 0) throw new Error(`unknown argument ${unknown.join(', ')}`);
	return {
		quick: args.includes('--quick'),
		offline: args.includes('--offline'),
		globe: args.includes('--globe'),
		landcover: args.includes('--landcover'),
		saveBaseline: args.includes('--save-baseline'),
	};
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const out = cacheDir('zoom-compare', ...(args.globe ? ['globe'] : []), ...(args.landcover ? ['landcover'] : []));
	const projection = args.globe ? 'globe' : 'mercator';
	const projectionLabel = args.globe ? 'globe, with 3D buildings and a visible atmosphere' : 'mercator';
	const places = args.quick ? PLACES.slice(0, 2) : PLACES;

	const tileSource = async (schema: TileSchema) => {
		const metadata = await sourceMetadata(schema, { offline: args.offline });
		return {
			tilejson: '3.0.0',
			tiles: [tileTemplate(schema)],
			minzoom: metadata.minzoom,
			maxzoom: metadata.maxzoom,
			vector_layers: metadata.vectorLayers,
		} as TileJSONSpecification;
	};
	const options: OsmOptions = {
		projection,
		sky: args.globe ? { atmosphereBlend: 1 } : false,
		features: {
			...(args.globe && { buildings: 'extruded' as const }),
			...(args.landcover && { landcover: true }),
		},
		urls: {
			osm: await tileSource('shortbread'),
			...(args.landcover && { landcover: await tileSource('landcover') }),
		},
	};
	const light = osm({ ...options, theme: LIGHT_THEME });
	const dark = osm({ ...options, theme: DARK_THEME });
	// The land cover's fills have no zoom bounds, and it changes no other layer's.
	const bounds = args.quick || args.landcover ? [] : hardBounds(light);

	const sets = (args.quick ? 3 : 4) + (args.landcover ? 1 : 0);
	const total = places.length * ZOOMS.length * sets * 3 + bounds.length * places.length * 2;
	const started = Date.now();
	let rendered = 0;

	const map = await GlMap.launch({ offline: args.offline });
	const failures: string[] = [];
	const render = async (style: StyleSpecification, center: [number, number], zoom: number, label: string) => {
		const result = await map.render(style, { center, zoom, width: SIZE, height: SIZE });
		failures.push(...result.failures.map((f) => `${label}: ${f}`));
		rendered++;
		if (rendered % 25 === 0) {
			const eta = ((Date.now() - started) / rendered) * (total - rendered);
			console.log(`${rendered}/${total} renders, about ${Math.ceil(eta / 60_000)} min left`);
		}
		return result.pixels;
	};
	const png = (pixels: Uint8Array) =>
		sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
			.png()
			.toBuffer();

	/** One style across the boundary at `zoom`, with its control, and the frames to keep. */
	const across = async (style: StyleSpecification, place: Place, zoom: number, label: string) => {
		const name = `${place.name} z${zoom} ${label}`;
		const below = await render(style, place.center, zoom - 2 * EPSILON, `${name} −2ε`);
		const before = await render(style, place.center, zoom - EPSILON, `${name} −ε`);
		const after = await render(style, place.center, zoom, name);
		const boundary = diff(before, after);
		const control = diff(below, before);
		const pair: Pair = {
			share: boundary.share,
			max: boundary.max,
			controlShare: control.share,
			controlMax: control.max,
		};
		return { pair, before, after, heat: boundary.heat };
	};

	try {
		console.log(`MapLibre GL JS ${map.version}; ${total} renders`);

		const boundaries: BoundaryRow[] = [];
		for (const place of places) {
			for (const zoom of ZOOMS) {
				const all = await across(light, place, zoom, 'all');
				const noSymbols = await across(withoutSymbols(light), place, zoom, 'no symbols');
				const sameTiles = await across(withSameTiles(withoutSymbols(light), zoom), place, zoom, 'same tiles');
				const darkPair = args.quick ? undefined : (await across(dark, place, zoom, 'dark')).pair;
				const alone = args.landcover ? await across(landcoverAlone(light), place, zoom, 'land cover') : undefined;
				boundaries.push({
					place: place.name,
					zoom,
					sets: {
						all: all.pair,
						noSymbols: noSymbols.pair,
						sameTiles: sameTiles.pair,
						...(alone && { landcoverAlone: alone.pair }),
						...(darkPair && { dark: darkPair }),
					},
				});
				if (alone) {
					writeFileSync(resolve(out, boundaryImage(place.name, zoom, 'landcover-before')), await png(alone.before));
					writeFileSync(resolve(out, boundaryImage(place.name, zoom, 'landcover-after')), await png(alone.after));
				}
				writeFileSync(resolve(out, boundaryImage(place.name, zoom, 'before')), await png(all.before));
				writeFileSync(resolve(out, boundaryImage(place.name, zoom, 'after')), await png(all.after));
				writeFileSync(resolve(out, boundaryImage(place.name, zoom, 'diff')), await png(all.heat));
			}
		}

		const boundRows: BoundRow[] = [];
		for (const bound of bounds) {
			const style = isolateLayer(light, bound.id);
			let row: BoundRow | undefined;
			for (const place of places) {
				const label = `${bound.id} ${place.name} ${bound.bound} z${bound.zoom}`;
				const before = await render(style, place.center, bound.zoom - EPSILON, `${label} −ε`);
				const after = await render(style, place.center, bound.zoom, label);
				const { share, max } = diff(before, after);
				if (!row || share > row.share) row = { ...bound, place: place.name, share, max };
			}
			if (row) boundRows.push(row);
		}

		const data: ReportData = {
			version: map.version,
			width: SIZE,
			height: SIZE,
			epsilon: EPSILON,
			changedAbove: CHANGED,
			projection: projectionLabel,
			landcover: args.landcover,
			themes: { light: LIGHT_THEME, ...(!args.quick && { dark: DARK_THEME }) },
			places,
			boundaries,
			bounds: boundRows,
			failures,
		};

		const baselineFile = resolve(out, 'baseline.json');
		const baseline = existsSync(baselineFile)
			? (JSON.parse(readFileSync(baselineFile, 'utf8')) as ReportData).boundaries
			: undefined;
		writeFileSync(resolve(out, 'results.json'), JSON.stringify(data, null, '\t'));
		if (args.saveBaseline) writeFileSync(baselineFile, JSON.stringify(data, null, '\t'));
		writeFileSync(resolve(out, 'index.html'), renderReport(data, baseline));
		if (failures.length > 0) console.warn(`${failures.length} render failures — see results.json`);
		console.log(resolve(out, 'index.html'));
	} finally {
		await map.close();
	}
}

await main();
