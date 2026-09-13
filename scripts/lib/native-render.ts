import mbgl from '@maplibre/maplibre-gl-native';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { explain, readAsset, readTile, type CacheOptions, type TileSchema } from './tile-cache.js';

/**
 * Headless MapLibre rendering with every resource served from the tile cache.
 *
 * The engine never touches the network itself. Tiles are addressed as
 * `https://tilecache.invalid/<schema>/{z}/{x}/{y}` — a host that cannot resolve, so a request that
 * escaped this callback would fail loudly rather than silently fetch — and read with `readTile`.
 * Glyphs go through `readAsset`, and sprites are read from `release/sprites/`, where
 * `npm run build-sprites` puts the sprite this working tree builds: the published one may be older.
 *
 * A resource that cannot be had does not fail the render — MapLibre would draw the rest of the map
 * anyway — but it is recorded, so a caller can tell a hole in the picture from a difference in the data.
 */

export const TILE_HOST = 'tilecache.invalid';

/** A tile template for `schema` that this renderer serves from the cache. */
export const tileTemplate = (schema: TileSchema) => `https://${TILE_HOST}/${schema}/{z}/{x}/{y}`;

const SPRITE_DIR = resolve(import.meta.dirname, '../../release/sprites');

type NativeRequest = (
	req: { url: string; kind: number },
	cb: (err?: Error, response?: { data: Uint8Array }) => void
) => void;
type NativeMapOptions = ConstructorParameters<typeof mbgl.Map>[0];

export type RenderView = { center: [number, number]; zoom: number; width: number; height: number };

export type RenderResult = {
	/** Raw RGBA, `width × height × 4` bytes. */
	pixels: Uint8Array;
	/** Resources that could not be loaded while rendering. */
	failures: string[];
};

async function resolveResource(url: string, options: CacheOptions): Promise<Uint8Array | undefined> {
	const parsed = new URL(url);
	if (parsed.host === TILE_HOST) {
		const [, schema, z, x, y] = parsed.pathname.split('/');
		return (await readTile(schema, Number(z), Number(x), Number(y), options)).tile;
	}
	const sprite = /\/assets\/sprites\/([^/]+)$/.exec(parsed.pathname);
	if (sprite) {
		const file = resolve(SPRITE_DIR, sprite[1]);
		if (!existsSync(file)) throw new Error(`${file} does not exist — run \`npm run build-sprites\``);
		return readFileSync(file);
	}
	return readAsset(url, options);
}

/** A map with one style loaded, rendering any number of views of it, one at a time. */
export class NativeMap {
	private readonly map: InstanceType<typeof mbgl.Map>;
	private failures: string[] = [];
	private queue: Promise<unknown> = Promise.resolve();

	constructor(style: StyleSpecification, options: CacheOptions = {}) {
		const request: NativeRequest = (req, cb) => {
			resolveResource(req.url, options).then(
				(data) => (data ? cb(undefined, { data }) : cb()),
				(error: unknown) => {
					this.failures.push(`${req.url}: ${explain(error)}`);
					cb();
				}
			);
		};
		this.map = new mbgl.Map({ request, ratio: 1 } as unknown as NativeMapOptions);
		this.map.load(style);
	}

	/** Render one view. Calls are serialised: the engine renders one frame per map at a time. */
	render(view: RenderView): Promise<RenderResult> {
		const run = () =>
			new Promise<RenderResult>((resolve, reject) => {
				this.failures = [];
				this.map.render(
					{ center: view.center, zoom: view.zoom, width: view.width, height: view.height },
					(error, pixels) => {
						if (error) return reject(error);
						resolve({ pixels: pixels!, failures: this.failures });
					}
				);
			});
		const result = this.queue.then(run, run);
		this.queue = result.catch(() => undefined);
		return result;
	}

	release(): void {
		this.map.release();
	}
}
