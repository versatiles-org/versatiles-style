import { defineConfig } from 'vite';

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
	resolve: {
		alias: {
			'@versatiles/style': new URL('./src/index.ts', import.meta.url).pathname,
		},
	},
});
