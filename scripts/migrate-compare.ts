/**
 * Render foreign styles next to the VersaTiles style `guessOptions` derives for them.
 *
 *   npm run migrate-compare                              # the default styles below
 *   npm run migrate-compare -- https://example.org/style.json …
 *
 * `deriveOptions` is tested against the package's own builders, where the right answer is known. How
 * close it gets for a style written by someone else can only be judged by looking, so this renders
 * each style and its migration side by side at a few places, with live tiles on both sides, and writes
 * `scripts/migrate-compare/out/index.html`. Needs network access.
 */

import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { inlineSources, osm, satellite } from '../src/index.js';
import { guessOptions } from '../src/migrate/index.js';
import { createLimiter } from './lib/limit.js';

const OUT = resolve(new URL('.', import.meta.url).pathname, 'migrate-compare/out');

/** Styles for OpenMapTiles tiles that need no API key. */
const DEFAULT_STYLES = [
	'https://tiles.openfreemap.org/styles/positron',
	'https://tiles.openfreemap.org/styles/bright',
	'https://tiles.openfreemap.org/styles/liberty',
];

const VIEWS: { name: string; center: [number, number]; zoom: number }[] = [
	{ name: 'europe', center: [10, 50], zoom: 4 },
	{ name: 'berlin', center: [13.4, 52.51], zoom: 10 },
	{ name: 'paris', center: [2.3417, 48.8575], zoom: 14 },
	{ name: 'alps', center: [7.66, 45.97], zoom: 12 },
];

const WIDTH = 512;
const HEIGHT = 384;

// The bundled types do not describe the resource-request callback; see scripts/render.e2e.test.ts.
type NativeRequest = (req: { url: string }, cb: (err?: Error | null, response?: { data: Buffer }) => void) => void;
type NativeMapOptions = ConstructorParameters<typeof mbgl.Map>[0];

const verbose = process.argv.includes('--verbose');

/** A transparent 1×1 PNG, served for a sprite image that does not exist. */
const EMPTY_PNG = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#0000' } })
	.png()
	.toBuffer();

/**
 * Resources are fetched here rather than by the engine: a missing glyph range or tile is empty instead
 * of fatal, and a missing sprite — the v6 sprite may not be published yet — is an empty one.
 */
const limiter = createLimiter(6);

async function download(url: string): Promise<Response> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await limiter.run(() => fetch(url, { signal: AbortSignal.timeout(30000) }));
		} catch (error) {
			if (attempt >= 3) throw error;
		}
	}
}

const request: NativeRequest = (req, cb) => {
	download(req.url)
		.then(async (response) => {
			if (response.ok) return cb(null, { data: Buffer.from(await response.arrayBuffer()) });
			if (verbose) console.log('   ', response.status, req.url);
			if (/sprite/.test(req.url)) return cb(null, { data: req.url.endsWith('.json') ? Buffer.from('{}') : EMPTY_PNG });
			cb();
		})
		.catch((error: Error) => {
			// a resource that cannot be had is left out of the picture rather than failing it
			if (verbose) console.log('   ', error.message, req.url);
			cb();
		});
};

function render(style: StyleSpecification, view: (typeof VIEWS)[number]): Promise<Buffer> {
	const map = new mbgl.Map({ ratio: 1, request } as unknown as NativeMapOptions);
	map.load(style);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('render timed out')), 90000);
		map.render({ center: view.center, zoom: view.zoom, width: WIDTH, height: HEIGHT }, (err, buffer) => {
			clearTimeout(timer);
			map.release();
			if (err) return reject(err);
			sharp(buffer, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
				.png()
				.toBuffer()
				.then(resolve, reject);
		});
	});
}

async function sideBySide(left: Buffer, right: Buffer): Promise<Buffer> {
	return sharp({ create: { width: WIDTH * 2 + 4, height: HEIGHT, channels: 4, background: '#ffffff' } })
		.composite([
			{ input: left, left: 0, top: 0 },
			{ input: right, left: WIDTH + 4, top: 0 },
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

		const derived = await inlineSources(guess.kind === 'osm' ? osm(guess.options) : satellite(guess.options));
		for (const view of VIEWS) {
			try {
				const image = await sideBySide(await render(original, view), await render(derived, view));
				const file = `${index}-${view.name}.png`;
				writeFileSync(resolve(OUT, file), image);
				html += `<h3>${view.name}, z${view.zoom}</h3><img src="${file}">`;
				console.log('  rendered', view.name);
			} catch (error) {
				console.log('  failed', view.name, error instanceof Error ? error.message : error);
			}
		}
	}

	writeFileSync(resolve(OUT, 'index.html'), html);
	console.log(`\n→ ${resolve(OUT, 'index.html')}`);
}

await main();
