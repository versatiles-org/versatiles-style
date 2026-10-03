import { chromium, type Browser, type Page } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { resolveResource, type RenderResult, type RenderView } from './native-render.js';
import { explain, type CacheOptions } from './tile-cache.js';

/**
 * Headless MapLibre GL JS rendering, in Chromium, with every resource served from the tile cache.
 *
 * `native-render.ts` is the renderer for everything both engines draw alike. This one exists for what
 * only GL JS draws: `line-layer-opacity`, which MapLibre Native does not implement and drops the layer
 * over (maplibre-native#4298). It loads the `maplibre-gl` this repo declares, from `node_modules`, so
 * the engine is the one the dev page and the type checks use.
 *
 * Resources go through the same resolver as the native renderer (`resolveResource`): the page rewrites
 * every request to a local proxy, which reads tiles from the tile cache, sprites from
 * `release/sprites/` and everything else through `readAsset`. A style built with `tileTemplate` works
 * here unchanged, and the two engines draw from the same bytes.
 *
 * WebGL runs on SwiftShader, Chromium's CPU rasteriser, so a render does not depend on the machine's GPU
 * and a pixel count means the same thing on every machine. It is slow — about a second per view — which
 * is the price of that.
 *
 * Chromium itself is not an npm dependency but a download: `npx playwright install chromium`.
 * {@link GlMap.available} says whether it is there.
 */

const DIST = resolve(import.meta.dirname, '../../node_modules/maplibre-gl/dist');

const CONTENT_TYPES: Record<string, string> = {
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
};

type PageWindow = {
	maplibregl: { getVersion(): string };
	ready?: boolean;
	renderView(args: { style: unknown; view: RenderView }): Promise<{ pixels: string; errors: string[] }>;
};

/** A Chromium page with MapLibre GL JS loaded, rendering any number of styles, one at a time. */
export class GlMap {
	private queue: Promise<unknown> = Promise.resolve();

	private constructor(
		/** Where the server and the page report failures: the collector of the render in flight. */
		private readonly sink: { failures: string[] },
		private readonly browser: Browser,
		private readonly page: Page,
		private readonly server: Server,
		/** The `maplibre-gl` version on the page. */
		readonly version: string
	) {}

	/** Whether the Chromium build Playwright drives is installed. */
	static available(): boolean {
		return existsSync(chromium.executablePath());
	}

	static async launch(options: CacheOptions = {}): Promise<GlMap> {
		if (!GlMap.available()) {
			throw new Error('Chromium for Playwright is not installed — run `npx playwright install chromium`');
		}
		const sink = { failures: [] as string[] };
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? '/', 'http://localhost');
			if (url.pathname === '/') {
				res.setHeader('content-type', 'text/html');
				res.end(PAGE);
				return;
			}
			if (url.pathname === '/proxy') {
				const target = url.searchParams.get('url') ?? '';
				resolveResource(target, options).then(
					(data) => {
						if (!data) {
							res.statusCode = 404;
							res.end();
							return;
						}
						const type = CONTENT_TYPES[extname(new URL(target).pathname)];
						if (type) res.setHeader('content-type', type);
						res.end(data);
					},
					(error: unknown) => {
						sink.failures.push(`${target}: ${explain(error)}`);
						res.statusCode = 502;
						res.end();
					}
				);
				return;
			}
			// The library's own files: the module, its worker (loaded relative to the module) and the CSS.
			const file = resolve(DIST, `.${url.pathname}`);
			if (!file.startsWith(DIST + '/') || !existsSync(file)) {
				res.statusCode = 404;
				res.end();
				return;
			}
			res.setHeader('content-type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
			res.end(readFileSync(file));
		});
		await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
		const { port } = server.address() as { port: number };

		const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
		const page = await browser.newPage({ deviceScaleFactor: 1 });
		page.on('pageerror', (error) => sink.failures.push(`page: ${error.message}`));
		page.on('console', (message) => {
			// SwiftShader reports every `readPixels` as a GPU stall; that is the readback, not a fault.
			if (message.type() === 'error' && !/GPU stall/.test(message.text())) {
				sink.failures.push(`console: ${message.text()}`);
			}
		});
		await page.goto(`http://127.0.0.1:${port}/`);
		await page.waitForFunction(() => (window as unknown as PageWindow).ready === true);
		const version = await page.evaluate(() => (window as unknown as PageWindow).maplibregl.getVersion());
		return new GlMap(sink, browser, page, server, version);
	}

	/** Render one view. Calls are serialised: there is one page. */
	render(style: StyleSpecification, view: RenderView): Promise<RenderResult> {
		const run = async (): Promise<RenderResult> => {
			const failures: string[] = [];
			this.sink.failures = failures;
			await this.page.setViewportSize({ width: view.width, height: view.height });
			// The style crosses as `unknown`: Playwright's serialisable-type check recurses into
			// `StyleSpecification` until the compiler gives up.
			const result = await this.page.evaluate((args) => (window as unknown as PageWindow).renderView(args), {
				style: style as unknown,
				view,
			});
			failures.push(...result.errors);
			const pixels = Uint8Array.from(Buffer.from(result.pixels, 'base64'));
			return { pixels, failures };
		};
		const result = this.queue.then(run, run);
		this.queue = result.catch(() => undefined);
		return result;
	}

	async close(): Promise<void> {
		await this.browser.close();
		await new Promise((done) => this.server.close(done));
	}
}

/**
 * The page. `renderView` lives in its own script, as plain JavaScript, rather than being passed to
 * `page.evaluate` as a function: tsx compiles functions with name-keeping helpers (`__name(…)`) that
 * do not exist on the page, so a serialised function breaks as soon as it declares one of its own.
 *
 * It builds a fresh map per render rather than calling `setStyle` on one: tiles parsed for an earlier
 * style keep the buckets they were built with (see the note in `dev/main.ts`), and a stale bucket is
 * exactly the kind of difference a comparison must not invent. The frame is read back with
 * `readPixels`, flipped to top-down rows, as base64 — a million-element array does not cross the page
 * boundary in reasonable time.
 */
const PAGE = `<!doctype html>
<meta charset="utf-8">
<link rel="stylesheet" href="/maplibre-gl.css">
<style>html, body { margin: 0; background: #000 } #map { width: 256px; height: 256px }</style>
<div id="map"></div>
<script type="module">
	import * as maplibregl from '/maplibre-gl.mjs';
	let current;
	window.maplibregl = maplibregl;
	window.renderView = async ({ style, view }) => {
		const container = document.getElementById('map');
		container.style.width = view.width + 'px';
		container.style.height = view.height + 'px';
		current?.remove();
		const errors = [];
		const map = (current = new maplibregl.Map({
			container,
			style,
			center: view.center,
			zoom: view.zoom,
			interactive: false,
			attributionControl: false,
			fadeDuration: 0,
			pixelRatio: 1,
			canvasContextAttributes: { preserveDrawingBuffer: true },
			transformRequest: (url) =>
				url.startsWith(location.origin) ? { url } : { url: location.origin + '/proxy?url=' + encodeURIComponent(url) },
		}));
		map.on('error', (event) => errors.push('map: ' + (event.error?.message ?? 'unknown error')));
		await new Promise((done) => map.once('idle', done));

		const canvas = map.getCanvas();
		const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
		const w = gl.drawingBufferWidth;
		const h = gl.drawingBufferHeight;
		const raw = new Uint8Array(w * h * 4);
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
		const rows = new Uint8Array(w * h * 4);
		for (let y = 0; y < h; y++) rows.set(raw.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
		let binary = '';
		for (let i = 0; i < rows.length; i += 0x8000) binary += String.fromCharCode(...rows.subarray(i, i + 0x8000));
		return { pixels: btoa(binary), errors };
	};
	window.ready = true;
</script>`;
