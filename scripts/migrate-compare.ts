/**
 * Render foreign styles next to the VersaTiles style `guessOptions` derives for them.
 *
 *   npm run migrate-compare                              # the default styles below
 *   npm run migrate-compare -- https://example.org/style.json …
 *
 * `deriveOptions` is tested against the package's own builders, where the right answer is known. How
 * close it gets for a style written by someone else can only be judged by looking, so this renders
 * each style and its migration side by side at a few places and writes
 * `scripts/migrate-compare/out/index.html`.
 *
 * Rendering goes through the shared tile cache (`scripts/lib/native-render.ts`): the VersaTiles side
 * reads Shortbread from it, and a foreign style on OpenFreeMap's OpenMapTiles tiles is pointed at the
 * cached OpenMapTiles tiles, so repeated runs are fast and a slow upstream leaves no holes. Any other
 * source, sprite or font of a foreign style is fetched once and cached as an asset. Needs network access
 * on the first run.
 */

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { inlineSources, osm, satellite, type TileJSONSpecification } from '../src/index.js';
import { guessOptions } from '../src/migrate/index.js';
import { NativeMap, tileTemplate } from './lib/native-render.js';
import { sourceMetadata, type TileSchema } from './lib/tile-cache.js';

const OUT = resolve(import.meta.dirname, 'migrate-compare/out');

/** Styles for OpenMapTiles tiles that need no API key. */
const DEFAULT_STYLES = [
	'https://tiles.openfreemap.org/styles/positron',
	'https://tiles.openfreemap.org/styles/bright',
	'https://tiles.openfreemap.org/styles/liberty',
];

/** Tile sources the cache holds, by the TileJSON URL a style names them with. */
const CACHED_SOURCES: Record<string, TileSchema> = {
	'https://tiles.openfreemap.org/planet': 'omt',
	'https://tiles.versatiles.org/tiles/osm/tiles.json': 'shortbread',
};

const VIEWS: { name: string; center: [number, number]; zoom: number }[] = [
	{ name: 'europe', center: [10, 50], zoom: 4 },
	{ name: 'berlin', center: [13.4, 52.51], zoom: 10 },
	{ name: 'paris', center: [2.3417, 48.8575], zoom: 14 },
	{ name: 'alps', center: [7.66, 45.97], zoom: 12 },
];

const WIDTH = 512;
const HEIGHT = 384;

async function cachedTileJSON(schema: TileSchema): Promise<TileJSONSpecification> {
	const { minzoom, maxzoom, vectorLayers } = await sourceMetadata(schema);
	return {
		tilejson: '3.0.0',
		tiles: [tileTemplate(schema)],
		minzoom,
		maxzoom,
		vector_layers: vectorLayers,
	} as TileJSONSpecification;
}

/** The style with every source the cache holds pointed at the cache. */
async function viaCache(style: StyleSpecification): Promise<StyleSpecification> {
	const sources = { ...style.sources };
	for (const [id, source] of Object.entries(sources)) {
		const url = 'url' in source ? source.url : undefined;
		const schema = url ? CACHED_SOURCES[url] : undefined;
		if (!schema) continue;
		const { tiles, minzoom, maxzoom } = await cachedTileJSON(schema);
		sources[id] = { type: 'vector', tiles, minzoom, maxzoom };
	}
	return { ...style, sources };
}

async function sideBySide(left: Uint8Array, right: Uint8Array): Promise<Buffer> {
	const raw = { width: WIDTH, height: HEIGHT, channels: 4 } as const;
	return sharp({ create: { width: WIDTH * 2 + 4, height: HEIGHT, channels: 4, background: '#ffffff' } })
		.composite([
			{ input: await sharp(left, { raw }).png().toBuffer(), left: 0, top: 0 },
			{ input: await sharp(right, { raw }).png().toBuffer(), left: WIDTH + 4, top: 0 },
		])
		.png()
		.toBuffer();
}

const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

async function main() {
	const urls = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
	mkdirSync(OUT, { recursive: true });
	let html =
		'<!doctype html><meta charset="utf-8"><title>migrate compare</title>' +
		'<style>body{font:14px system-ui;margin:2em}img{max-width:100%}pre{background:#f4f4f4;padding:1em;white-space:pre-wrap}</style>' +
		'<h1>Original (left) — derived VersaTiles style (right)</h1>';

	for (const [index, url] of (urls.length > 0 ? urls : DEFAULT_STYLES).entries()) {
		console.log(`\n${url}`);
		const response = await fetch(url);
		const original = (await response.json()) as StyleSpecification;
		const guess = await guessOptions(original);
		console.log(guess.kind, JSON.stringify('options' in guess ? guess.options : undefined));
		guess.report.warnings.forEach((warning) => console.log('  ⚠', warning));

		html += `<h2>${escape(url)}</h2><pre>${escape(JSON.stringify({ kind: guess.kind, ...('options' in guess && { options: guess.options }) }, null, 2))}</pre>`;
		html += `<ul>${guess.report.warnings.map((w) => `<li>${escape(w)}</li>`).join('')}</ul>`;
		if (guess.kind === 'unknown') continue;

		const derived =
			guess.kind === 'osm'
				? osm({ ...guess.options, urls: { ...guess.options.urls, osm: await cachedTileJSON('shortbread') } })
				: await inlineSources(satellite(guess.options));
		const left = new NativeMap(await viaCache(original));
		const right = new NativeMap(derived);
		for (const view of VIEWS) {
			const renderView = { ...view, width: WIDTH, height: HEIGHT };
			const [a, b] = await Promise.all([left.render(renderView), right.render(renderView)]);
			const file = `${index}-${view.name}.png`;
			writeFileSync(resolve(OUT, file), await sideBySide(a.pixels, b.pixels));
			const failures = [...a.failures, ...b.failures];
			html += `<h3>${view.name}, z${view.zoom}</h3><img src="${file}">`;
			if (failures.length > 0) {
				html += `<details><summary>${failures.length} resources failed</summary><pre>${escape(failures.join('\n'))}</pre></details>`;
			}
			console.log('  rendered', view.name, failures.length > 0 ? `(${failures.length} resources failed)` : '');
		}
		left.release();
		right.release();
	}

	writeFileSync(resolve(OUT, 'index.html'), html);
	console.log(`\n→ ${resolve(OUT, 'index.html')}`);
}

await main();
