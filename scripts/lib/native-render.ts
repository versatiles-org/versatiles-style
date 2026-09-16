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
 *
 * The engine's own complaints are recorded the same way. mbgl does not throw on a style it half
 * understands: give it a colour its C++ parser cannot read — `oklch(…)`, or the space-separated
 * `rgb(128 0 0)` that the JS parser accepts — and it logs `ParseStyle: value must be a valid color`,
 * draws that layer fully transparent, and reports success. Every screenshot then silently loses a layer.
 * Routing those warnings into `failures` is what turns that into a visible failure.
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
	/** Resources that could not be loaded, and warnings the engine logged, while rendering. */
	failures: string[];
};

type NativeMessage = { class: string; severity: string; text: string };

/**
 * Collectors for the renders currently in flight.
 *
 * mbgl logs through one process-wide emitter rather than per map, so a warning cannot be attributed to
 * a particular map when several render at once (`scripts/schema-compare/compare.ts` renders three).
 * It is therefore recorded against every render in flight: over-reporting makes a caller look at a
 * render that was fine, while under-reporting would let a transparent layer through unnoticed.
 */
const collectors = new Set<string[]>();
let listening = false;

function listen(): void {
	if (listening) return;
	listening = true;
	(mbgl as unknown as { on(event: string, handler: (message: NativeMessage) => void): void }).on(
		'message',
		(message) => {
			if (message.severity === 'DEBUG' || message.severity === 'INFO') return;
			for (const collector of collectors) collector.push(`${message.severity} ${message.class}: ${message.text}`);
		}
	);
}

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
	private readonly loadWarnings: string[] = [];
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
		listen();
		this.map = new mbgl.Map({ request, ratio: 1 } as unknown as NativeMapOptions);
		// A style the engine dislikes is usually reported when it is first drawn rather than here, but
		// collect anything it says at load time too, and repeat it on every render: the style stays broken.
		collectors.add(this.loadWarnings);
		this.map.load(style);
		collectors.delete(this.loadWarnings);
	}

	/** Render one view. Calls are serialised: the engine renders one frame per map at a time. */
	render(view: RenderView): Promise<RenderResult> {
		const run = () =>
			new Promise<RenderResult>((resolve, reject) => {
				const failures = [...this.loadWarnings];
				this.failures = failures;
				collectors.add(failures);
				this.map.render(
					{ center: view.center, zoom: view.zoom, width: view.width, height: view.height },
					(error, pixels) => {
						collectors.delete(failures);
						if (error) return reject(error);
						resolve({ pixels: pixels!, failures });
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
