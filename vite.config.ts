import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { tileCache } from './dev/tile-cache.js';

export default defineConfig({
	root: 'dev',
	server: {
		port: 8080,
		proxy: {
			'/tiles': {
				target: 'https://tiles.versatiles.org',
				changeOrigin: true,
			},
			'/assets': {
				target: 'https://tiles.versatiles.org',
				changeOrigin: true,
			},
		},
	},
	plugins: [
		// Serves all three schemas as plain XYZ endpoints, cached on disk. See dev/tile-cache.ts.
		tileCache(),
		{
			name: 'local-sprites',
			configureServer(server) {
				server.middlewares.use('/assets/sprites', (req, res, next) => {
					const filePath = resolve('release/sprites', req.url?.slice(1) ?? '');
					try {
						const data = readFileSync(filePath);
						if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
						else if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
						res.end(data);
					} catch {
						next();
					}
				});
			},
		},
	],
	resolve: {
		alias: {
			// The subpath entries first: an alias map is matched in order, and a bare
			// '@versatiles/style' rule would otherwise swallow '@versatiles/style/omt'.
			'@versatiles/style/omt': new URL('./src/omt/index.ts', import.meta.url).pathname,
			'@versatiles/style/protomaps': new URL('./src/protomaps/index.ts', import.meta.url).pathname,
			'@versatiles/style': new URL('./src/index.ts', import.meta.url).pathname,
		},
	},
});
