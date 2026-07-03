import { describe, expect, it } from 'vitest';
import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { osm, satellite } from '../src/index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

// Smoke test for the native MapLibre engine (`@maplibre/maplibre-gl-native`), the renderer
// used by scripts/screenshots.ts and otherwise never exercised by the test suite. It confirms
// the C++ engine can parse AND rasterize a style produced by osm()/satellite() without error —
// a much stronger guarantee than validateStyleMin, which only checks the JSON against the spec.
//
// Everything is served offline through the map's request callback, so no network is touched:
//   - TileJSON (`*.json`)   → a minimal valid TileJSON
//   - sprite JSON           → `{}` (no icons needed)
//   - sprite / raster tiles → a valid PNG
//   - vector tiles          → an empty (but valid) MVT buffer
//
// The osm() case renders the vector style (labels/icons disabled so no glyphs are required);
// the satellite() case renders the raster style (no overlay, so tiles are images).

const WIDTH = 64;
const HEIGHT = 64;

// A `fetch` that keeps osm()/satellite() offline while resolving the default TileJSON sources.
const cannedFetch = (async () =>
	new Response(JSON.stringify({ tiles: ['{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 }), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	})) as typeof fetch;

const MIN_TILEJSON = Buffer.from(
	JSON.stringify({ tilejson: '2.2.0', tiles: ['http://localhost/{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 })
);

// The bundled @maplibre/maplibre-gl-native types don't describe the resource-request callback,
// so we declare the minimal shape we rely on and cast the constructor options through it.
type NativeRequest = (
	req: { url: string; kind: number },
	cb: (err: Error | null, response?: { data: Buffer }) => void
) => void;
type NativeMapOptions = ConstructorParameters<typeof mbgl.Map>[0];

async function onePixelPng(): Promise<Buffer> {
	const out = await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.png()
		.toBuffer();
	return Buffer.from(out);
}

// Render a style headlessly and resolve to the raw RGBA buffer (throws on any resource/render error).
function render(style: StyleSpecification, tile: Buffer, png: Buffer): Promise<Uint8Array> {
	const request: NativeRequest = (req, cb) => {
		const url = String(req.url);
		if (url.includes('sprite') && url.endsWith('.json')) return cb(null, { data: Buffer.from('{}') });
		if (url.includes('sprite')) return cb(null, { data: png });
		if (url.endsWith('.json')) return cb(null, { data: MIN_TILEJSON });
		return cb(null, { data: tile });
	};

	const map = new mbgl.Map({ request } as unknown as NativeMapOptions);
	map.load(style);
	return new Promise<Uint8Array>((resolve, reject) => {
		const timer = setTimeout(() => {
			map.release();
			reject(new Error('render timed out'));
		}, 20000);
		map.render({ center: [13.4, 52.5], zoom: 4, width: WIDTH, height: HEIGHT }, (err, buffer) => {
			clearTimeout(timer);
			map.release();
			if (err) reject(err);
			else resolve(buffer);
		});
	});
}

describe('native MapLibre rendering', () => {
	it('renders an osm() vector style to a full RGBA buffer', async () => {
		const style = (await osm({
			theme: 'colorful',
			urls: { fetch: cannedFetch },
			layers: { labels: false, icons: false },
		})) as unknown as StyleSpecification;
		// empty buffer = a valid, empty vector tile
		const buffer = await render(style, Buffer.alloc(0), await onePixelPng());
		expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
	}, 30000);

	it('renders a satellite() raster style to a full RGBA buffer', async () => {
		const style = (await satellite({
			urls: { fetch: cannedFetch },
			osmOverlay: false,
		})) as unknown as StyleSpecification;
		const png = await onePixelPng();
		// raster tiles must decode as images → serve a PNG
		const buffer = await render(style, png, png);
		expect(buffer.length).toBe(WIDTH * HEIGHT * 4);
	}, 30000);
});
