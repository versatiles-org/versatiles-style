import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:https';
import { getMimeType } from './lib/mime.js';
import { rollup } from 'rollup';

const PORT = 8080;

type StyleName = 'colorful' | 'eclipse' | 'graybeard' | 'neutrino';

const config: { reg: RegExp, type: 'mem' | 'local' | 'proxy', res: string | (() => Promise<string>) }[] = [
	{ reg: /^\/$/, type: 'mem', res: getIndexPage() },
	{ reg: /^\/\?colorful$/, type: 'mem', res: () => getStylePage('colorful') },
	{ reg: /^\/\?eclipse$/, type: 'mem', res: () => getStylePage('eclipse') },
	{ reg: /^\/\?graybeard$/, type: 'mem', res: () => getStylePage('graybeard') },
	{ reg: /^\/\?shadow$/, type: 'mem', res: () => getStylePage('shadow') },	
	{ reg: /^\/\?neutrino$/, type: 'mem', res: () => getStylePage('neutrino') },
	{ reg: /^\/assets\/lib\/versatiles-style\/versatiles-style.js/, type: 'mem', res: () => getStyles() },
	{ reg: /^\/assets\/sprites\//, type: 'local', res: '../../release/sprites/' },
	{ reg: /^\/assets\/glyphs\//, type: 'proxy', res: 'https://tiles.versatiles.org/assets/glyphs/' },
	{ reg: /^\/assets\/lib\/maplibre-gl\//, type: 'proxy', res: 'https://tiles.versatiles.org/assets/lib/maplibre-gl/' },
	{ reg: /^\//, type: 'proxy', res: 'https://tiles.versatiles.org/' },
];

const DIR = new URL(import.meta.url).pathname;

export const server = http.createServer(async (req, response) => {
	const { url } = req;

	if (!url) return error('Bad Request: Missing URL');

	for (const entry of config) {
		const { reg, type, res } = entry;
		const match = reg.exec(url);
		if (match) {
			const content = typeof res === 'function' ? await res() : res;
			const relPath = url.slice(match[0].length);
			switch (type) {
				case 'mem': return respond('html', content);
				case 'local': { // Serve files from the local folder
					const filename = join(DIR, content, relPath);
					try {
						respond(relPath, readFileSync(filename));
					} catch (err) {
						console.error({ relPath, filename });
						error('Error reading local file: ' + err);
					}
					return
				}
				case 'proxy': { // Proxy the request to the remote tiles server
					const remoteBase = content;
					const remoteUrl = (new URL(relPath, remoteBase)).href;
					if (!remoteUrl.startsWith(remoteBase)) {
						return error(`Forbidden: Proxy requests path "${remoteUrl}" that does not start with "${remoteBase}"`);
					}
					const proxyRequest = request(remoteUrl, (remoteRes) => {
						response.writeHead(remoteRes.statusCode || 500, remoteRes.headers);
						remoteRes.pipe(response, { end: true });
					});
					proxyRequest.on('error', (err) => error('Error in proxying request:' + err));
					return proxyRequest.end();
				}
			}
		}
	}

	return error(`Not Found "${url}"`);

	function error(content: string) {
		console.error('Error: ' + content);
		response.writeHead(500, { 'Content-Type': 'text/plain' });
		response.end(content);
	}

	function respond(filename: string, content: string | Buffer) {
		response.writeHead(200, { 'Content-Type': getMimeType(filename) });
		response.end(content);
	}
});

server.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});


async function getStyles() {
	console.time('Building styles');
	const bundle = await rollup({
		input: './src/index.ts',
		plugins: [
			typescript({
				compilerOptions: {
					lib: ['ESNext'],
					module: 'NodeNext',
					moduleResolution: 'bundler',
					target: 'ES2022',
					strict: true,
					esModuleInterop: true,
					skipLibCheck: true,
					forceConsistentCasingInFileNames: true,
					declaration: false,
					allowJs: true,
					allowImportingTsExtensions: false,
					noEmit: true,
					sourceMap: false,
				},
				include: ['src/**/*.ts'],
				exclude: ['**/*.test.ts']
			}),
			nodeResolve(),
		],
		onLog(level, log, handler) {
			if (log.code === 'CIRCULAR_DEPENDENCY') return;
			handler(level, log);
		}
	});

	const result = await bundle.generate({
		format: 'umd',
		name: 'VersaTilesStyle',
		file: 'style.js'
	});

	console.timeEnd('Building styles');

	return result.output[0].code;
}


function getPage(content: string) {
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
	<link rel="icon" type="image/png" href="/assets/images/versatiles-logo.png">
	<script src="/assets/lib/maplibre-gl/maplibre-gl.js"></script>
	<script src="/assets/lib/versatiles-style/versatiles-style.js"></script>
	<link href="/assets/lib/maplibre-gl/maplibre-gl.css" rel="stylesheet">

	<style>
		body { margin: 0; padding: 0; }
		#map { position: absolute; top: 0; bottom: 0; width: 100%; }
	</style>
</head>

<body>
	${content}
</body>

</html>`
};

function getIndexPage() {
	return getPage(`<ul>
		<li><a href="/?colorful">colorful</a></li>
		<li><a href="/?eclipse">eclipse</a></li>
		<li><a href="/?graybeard">graybeard</a></li>
		<li><a href="/?neutrino">neutrino</a></li>
	</ul>`);
};

async function getStylePage(styleName: StyleName) {
	return getPage(`
	<div id="map"></div>
	<script>
		const style = VersaTilesStyle.${styleName}();
		console.log(style);
		new maplibregl.Map({ container: 'map', style, maxZoom: 20, hash: true });
	</script>`);
};