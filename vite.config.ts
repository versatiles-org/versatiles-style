import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

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
			'@versatiles/style': new URL('./src/index.ts', import.meta.url).pathname,
		},
	},
});
