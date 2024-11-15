import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:https';

const PORT = 8080;

const INDEX = `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
	<script src="assets/lib/maplibre-gl/maplibre-gl.js"></script>
	<link href="assets/lib/maplibre-gl/maplibre-gl.css" rel="stylesheet">
	<script src="assets/lib/versatiles-style/versatiles-style.js"></script>

	<style>
		body { margin: 0; padding: 0; }
		#map { position: absolute; top: 0; bottom: 0; width: 100%; }
	</style>
</head>

<body>
	<div id="map"></div>
	<script>
		const style = VersaTilesStyle.colorful({});
		console.log(style);
		new maplibregl.Map({ container: 'map', style, maxZoom: 20, hash: true });
	</script>
</body>

</html>`;

const config: { reg: RegExp, type: 'mem' | 'local' | 'proxy', res: string }[] = [
	{ reg: /^\/(index\.html?)?$/, type: 'mem', res: INDEX },
	{ reg: /^\/assets\/sprites\//, type: 'local', res: '../release/sprites/' },
	{ reg: /^\/assets\/lib\/versatiles-style\//, type: 'local', res: '../release/versatiles-style/' },
	{ reg: /^\/assets\/lib\/maplibre-gl\//, type: 'proxy', res: 'https://tiles.versatiles.org/assets/maplibre-gl/' },
	{ reg: /^\//, type: 'proxy', res: 'https://tiles.versatiles.org/' },
];

const DIR = new URL(import.meta.url).pathname;

export const server = http.createServer((req, res) => {
	const { url } = req;

	if (!url) return error('Bad Request: Missing URL');

	for (const entry of config) {
		const match = entry.reg.exec(url);
		if (match) {
			const relPath = url.slice(match[0].length);
			switch (entry.type) {
				case 'mem': return respond('html', entry.res);
				case 'local': { // Serve files from the local folder
					const filename = join(DIR, entry.res, relPath);
					try {
						respond(relPath, readFileSync(filename));
					} catch (err) {
						console.error({ relPath, filename });
						error('Error reading local file: ' + err);
					}
					return
				}
				case 'proxy': { // Proxy the request to the remote tiles server
					const remoteUrl = new URL(relPath, entry.res);
					const proxyRequest = request(remoteUrl, (remoteRes) => {
						res.writeHead(remoteRes.statusCode || 500, remoteRes.headers);
						remoteRes.pipe(res, { end: true });
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
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end(content);
	}

	function respond(filename: string, content: string | Buffer) {
		res.writeHead(200, { 'Content-Type': getMimeType(filename) });
		res.end(content);
	}
});

/**
 * Utility function to determine MIME type based on file extension.
 * @param filePath - Path of the file
 * @returns MIME type string
 */
function getMimeType(filePath: string): string {
	const extension = filePath.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'html':
			return 'text/html';
		case 'css':
			return 'text/css';
		case 'js':
			return 'application/javascript';
		case 'json':
			return 'application/json';
		case 'png':
			return 'image/png';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'svg':
			return 'image/svg+xml';
		default:
			return 'application/octet-stream';
	}
}

server.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
