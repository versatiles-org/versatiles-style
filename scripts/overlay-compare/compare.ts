/**
 * Render the satellite overlay in MapLibre GL JS with `osmOverlay.layerOpacity` off and on, and measure
 * what the option changes.
 *
 *   npm run overlay-compare               # → .cache/overlay-compare/index.html
 *   npm run overlay-compare -- --quick    # two places per layer instead of all of them
 *   npm run overlay-compare -- --offline  # tiles, imagery and glyphs from the cache only
 *
 * The option moves a few layers from `line-opacity` to `line-layer-opacity` (`LAYER_OPACITY_IDS` in
 * `src/features/satellite-overlay.ts`). Composited once, a layer loses the weight its self-overlap
 * used to add, and the factors there are tuned so that it does not look lighter for it. This is the
 * instrument for that tuning:
 *
 * - **Weight per zoom** — each listed layer alone, white on black, at every zoom over a set of places:
 *   summed brightness off and on. `off / on` near 1 means the option keeps the layer's weight. Also the
 *   share of pixels the layer draws more than once with the option off — the overlap it removes.
 * - **Views** — the whole overlay over imagery, off against on, with a diff.
 *
 * The listed layers are read off the built style (every layer that carries `line-layer-opacity`), so
 * the tool follows the list rather than repeating it. GL JS only: MapLibre Native drops those layers,
 * which is why this does not use `scripts/lib/native-render.ts`.
 *
 * Needs Chromium for Playwright (`npx playwright install chromium`), network access on the first run,
 * and `npm run build-sprites` for the icons.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { satellite } from '../../src/index.js';
import type { SatelliteOptions } from '../../src/options/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../../src/types/index.js';
import { GlMap } from '../lib/gljs-render.js';
import { tileTemplate, type RenderView } from '../lib/native-render.js';
import { cacheDir } from '../lib/paths.js';
import { sourceMetadata } from '../lib/tile-cache.js';
import { brightness, diff, isolate, maxValue, overlap } from './measure.js';
import { renderReport, viewImage, type LayerTable, type ViewRow, type ZoomRow } from './report.js';

const WIDTH = 512;
const HEIGHT = 512;
const SATELLITE_TILES = 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}';

type Place = { name: string; center: [number, number] };

/** Where country borders are measured: borders that wind, along rivers and ridges. */
const COUNTRY_PLACES: Place[] = [
	{ name: 'de-cz-vogtland', center: [12.3, 50.25] },
	{ name: 'de-cz-erzgebirge', center: [13.5, 50.5] },
	{ name: 'de-pl-neisse', center: [14.75, 51.5] },
	{ name: 'de-be-nl-aachen', center: [6.1, 50.75] },
	{ name: 'de-ch-rhine', center: [8.6, 47.65] },
];

/** Where state borders are measured: German state borders running in a river, so they stay in frame at z12. */
const STATE_PLACES: Place[] = [
	{ name: 'he-rp-rhine-mainz', center: [8.28, 50.01] },
	{ name: 'bw-rp-rhine-speyer', center: [8.45, 49.32] },
	{ name: 'ni-sh-elbe-lauenburg', center: [10.57, 53.37] },
];

/** Where roads are measured: interchanges and city rings. */
const ROAD_PLACES: Place[] = [
	{ name: 'frankfurt', center: [8.598, 50.054] },
	{ name: 'berlin', center: [13.3, 52.45] },
	{ name: 'hamburg', center: [10.05, 53.5] },
	{ name: 'munich', center: [11.6, 48.2] },
	{ name: 'ruhr', center: [7.2, 51.5] },
];

/** Places and zooms per listed layer, chosen by what the layer draws. */
function plan(id: string, quick: boolean): { places: Place[]; zooms: number[] } {
	const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
	const [places, zooms] =
		id === 'boundary-state'
			? [STATE_PLACES, range(8, 12)]
			: id.startsWith('boundary-')
				? [COUNTRY_PLACES, range(4, 12)]
				: [ROAD_PLACES, range(6, 15)];
	return { places: quick ? places.slice(0, 2) : places, zooms };
}

const VIEWS: { id: string; center: [number, number]; zoom: number }[] = [
	{ id: 'europe-z5', center: [10, 50], zoom: 5 },
	{ id: 'de-cz-z7', center: [13.5, 50.5], zoom: 7 },
	{ id: 'de-cz-z9', center: [12.3, 50.25], zoom: 9 },
	{ id: 'frankfurt-z9', center: [8.598, 50.054], zoom: 9 },
	{ id: 'frankfurt-z11', center: [8.598, 50.054], zoom: 11 },
	{ id: 'frankfurt-z13', center: [8.598, 50.054], zoom: 13 },
	{ id: 'berlin-z14', center: [13.4, 52.52], zoom: 14 },
];

function parseArgs(argv: string[]) {
	const args = argv.filter((a) => a !== '--');
	const known = new Set(['--quick', '--offline']);
	const unknown = args.filter((a) => !known.has(a));
	if (unknown.length > 0) throw new Error(`unknown argument ${unknown.join(', ')}`);
	return { quick: args.includes('--quick'), offline: args.includes('--offline') };
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const out = cacheDir('overlay-compare');

	const metadata = await sourceMetadata('shortbread', { offline: args.offline });
	const options: SatelliteOptions = {
		projection: 'mercator',
		sky: false,
		urls: {
			osm: {
				tilejson: '3.0.0',
				tiles: [tileTemplate('shortbread')],
				minzoom: metadata.minzoom,
				maxzoom: metadata.maxzoom,
				vector_layers: metadata.vectorLayers,
			} as TileJSONSpecification,
			satellite: { tilejson: '3.0.0', tiles: [SATELLITE_TILES], minzoom: 0, maxzoom: 17 },
		},
	};
	const off = satellite(options);
	const on = satellite({ ...options, osmOverlay: { layerOpacity: true } });
	const listed = on.layers
		.filter((layer) => (layer as { paint?: Record<string, unknown> }).paint?.['line-layer-opacity'] !== undefined)
		.map((layer) => layer.id);
	if (listed.length === 0) throw new Error('no layer carries line-layer-opacity with the option on');

	const map = await GlMap.launch({ offline: args.offline });
	const failures: string[] = [];
	const render = async (style: StyleSpecification, view: RenderView, label: string) => {
		const result = await map.render(style, view);
		failures.push(...result.failures.map((f) => `${label}: ${f}`));
		return result.pixels;
	};
	const png = (pixels: Uint8Array) =>
		sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
			.png()
			.toBuffer();

	try {
		console.log(`MapLibre GL JS ${map.version}; listed layers: ${listed.join(', ')}`);

		const layers: LayerTable[] = [];
		for (const id of listed) {
			const { places, zooms } = plan(id, args.quick);
			const isoOff = isolate(off, [id]);
			const isoOn = isolate(on, [id]);
			const rows: ZoomRow[] = [];
			for (const zoom of zooms) {
				const row: ZoomRow = { zoom, off: 0, on: 0, covered: 0, over: 0, maxOff: 0, maxOn: 0 };
				for (const place of places) {
					const view = { center: place.center, zoom, width: WIDTH, height: HEIGHT };
					const label = `${id} ${place.name} z${zoom}`;
					const a = await render(isoOff, view, `${label} off`);
					const b = await render(isoOn, view, `${label} on`);
					const ceiling = maxValue(b);
					const o = overlap(a, ceiling);
					row.off += brightness(a);
					row.on += brightness(b);
					row.covered += o.covered;
					row.over += o.over;
					row.maxOff = Math.max(row.maxOff, o.max);
					row.maxOn = Math.max(row.maxOn, ceiling);
				}
				rows.push(row);
				console.log(`${id} z${zoom}: off/on ${row.on ? (row.off / row.on).toFixed(3) : '–'}`);
			}
			layers.push({ id, places: places.map((p) => p.name), rows });
		}

		const views: ViewRow[] = [];
		for (const v of VIEWS) {
			const view = { center: v.center, zoom: v.zoom, width: WIDTH, height: HEIGHT };
			const fullOff = await render(off, view, `${v.id} full off`);
			const fullOn = await render(on, view, `${v.id} full on`);
			const isoOff = await render(isolate(off, listed), view, `${v.id} isolated off`);
			const isoOn = await render(isolate(on, listed), view, `${v.id} isolated on`);
			const d = diff(fullOff, fullOn);
			const o = overlap(isoOff, maxValue(isoOn));
			writeFileSync(resolve(out, viewImage(v.id, 'full', 'off')), await png(fullOff));
			writeFileSync(resolve(out, viewImage(v.id, 'full', 'on')), await png(fullOn));
			writeFileSync(resolve(out, viewImage(v.id, 'full', 'diff')), await png(d.heat));
			writeFileSync(resolve(out, viewImage(v.id, 'iso', 'off')), await png(isoOff));
			writeFileSync(resolve(out, viewImage(v.id, 'iso', 'on')), await png(isoOn));
			views.push({ id: v.id, layers: listed, share: d.share, max: d.max, covered: o.covered, over: o.over });
			console.log(`${v.id}: ${(d.share * 100).toFixed(2)}% changed`);
		}

		const data = { version: map.version, width: WIDTH, height: HEIGHT, layers, views, failures };
		writeFileSync(resolve(out, 'results.json'), JSON.stringify(data, null, '\t'));
		writeFileSync(resolve(out, 'index.html'), renderReport(data));
		if (failures.length > 0) console.warn(`${failures.length} render failures — see results.json`);
		console.log(resolve(out, 'index.html'));
	} finally {
		await map.close();
	}
}

await main();
