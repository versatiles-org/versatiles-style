import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { explain, readTile, sourceMetadata } from '../scripts/lib/tile-cache.js';

/**
 * The dev server's caching tile proxy, covering all three schemas.
 *
 * The cache itself — upstreams, PMTiles reading, disk storage, in-flight deduplication — lives in
 * `scripts/lib/tile-cache.ts`, shared with the schema screenshot comparison. This is only its HTTP face:
 *
 *     /tilecache/<schema>/tiles.json      → a TileJSON pointing at the line below
 *     /tilecache/<schema>/{z}/{x}/{y}     → the tile, from disk if it has been fetched before
 *
 * The frontend therefore treats Protomaps exactly like the other two — a vector source with a TileJSON
 * URL — and needs no PMTiles support at all. That is the whole reason `pmtiles` is no longer a
 * dependency of this package.
 */

const TILE_PATH = /^\/([a-z]+)\/(\d+)\/(\d+)\/(\d+)(?:\.pbf)?$/;

/** The dev-only caching tile proxy. Mounted at `/tilecache`. */
export function tileCache(): Plugin {
	return {
		name: 'tile-cache',
		configureServer(server) {
			server.middlewares.use('/tilecache', (req: IncomingMessage, res: ServerResponse, next) => {
				void (async () => {
					const path = (req.url ?? '').split('?')[0];
					try {
						const tileJSONMatch = /^\/([a-z]+)\/tiles\.json$/.exec(path);
						if (tileJSONMatch) {
							const schema = tileJSONMatch[1];
							const source = await sourceMetadata(schema);
							// Absolute, because MapLibre does not resolve a relative `tiles` template.
							const origin = `http://${req.headers.host ?? 'localhost:8080'}`;
							res.setHeader('Content-Type', 'application/json');
							res.end(
								JSON.stringify({
									tilejson: '3.0.0',
									tiles: [`${origin}/tilecache/${schema}/{z}/{x}/{y}`],
									minzoom: source.minzoom,
									maxzoom: source.maxzoom,
									vector_layers: source.vectorLayers,
								})
							);
							return;
						}

						const tileMatch = TILE_PATH.exec(path);
						if (!tileMatch) return next();
						const [, schema, z, x, y] = tileMatch;
						const { tile, hit, ms } = await readTile(schema, Number(z), Number(x), Number(y));
						res.setHeader('Content-Type', 'application/x-protobuf');
						// The style author reloads constantly; let the browser skip the round trip too.
						res.setHeader('Cache-Control', 'max-age=3600');
						// Visible in the browser's network panel, so a slow tile can be traced without the
						// server log: which source answered, and whether it came off disk.
						res.setHeader('X-Tile-Cache', hit ? 'hit' : 'miss');
						res.setHeader('Server-Timing', `tile;dur=${ms}`);
						if (!tile) {
							res.statusCode = 204;
							res.end();
							return;
						}
						res.end(Buffer.from(tile));
					} catch (error) {
						// A failing tile is otherwise a hole in the map with no explanation, so say why in
						// three places: the response body, the browser console via a header, and the terminal.
						const reason = explain(error);
						res.statusCode = 500;
						res.setHeader('Content-Type', 'text/plain');
						res.setHeader('X-Tile-Cache', 'error');
						res.end(`tile-cache: ${reason}`);
						server.config.logger.error(`  tile-cache FAILED ${path}: ${reason}`, { timestamp: true });
					}
				})();
			});
		},
	};
}
