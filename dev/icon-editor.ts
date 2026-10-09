import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The server half of the icon editor (`dev/icons.html`): lists the SVGs under `icons/` and writes
 * an adjusted position back to a file.
 *
 * An icon lands on the map where its ink sits on its canvas — there is no offset in the sprite
 * config — so a position is adjusted in the SVG itself. The editor does that through the origin of
 * the `viewBox` alone: `viewBox="-0.5 0 15 15"` shows the ink half a unit further right. The path
 * data stays untouched, which keeps an upstream icon comparable with its source
 * (`npm run icons-provenance`), and makes the adjustment visible and revertible in one attribute.
 *
 *   GET  /icon-api/icons   → [{ src: 'maki/globe', svg: '<svg …' }, …]
 *   POST /icon-api/shift   ← { src, x, y }: the ink's shift in viewBox units, right and down
 */

const dirIcons = resolve(import.meta.dirname, '../icons');

const VIEWBOX = /(<svg[^>]*\sviewBox=")\s*[-\d.eE]+[,\s]+[-\d.eE]+[,\s]+([-\d.eE]+)[,\s]+([-\d.eE]+)\s*(")/;

// Four decimals are far below a pixel of any sheet, and keep float noise out of the file.
const fmt = (v: number): string => String(Math.round(v * 1e4) / 1e4 || 0);

function listIcons(): { src: string; svg: string }[] {
	return readdirSync(dirIcons)
		.filter((source) => statSync(resolve(dirIcons, source)).isDirectory())
		.flatMap((source) =>
			readdirSync(resolve(dirIcons, source))
				.filter((file) => file.endsWith('.svg'))
				.sort()
				.map((file) => ({
					src: `${source}/${file.slice(0, -4)}`,
					svg: readFileSync(resolve(dirIcons, source, file), 'utf8'),
				}))
		);
}

function shiftIcon(src: string, x: number, y: number): void {
	// `src` names a file to overwrite, so it may only be `<source>/<name>` of an existing icon.
	if (!/^[\w-]+\/[\w-]+$/.test(src)) throw Error(`invalid icon "${src}"`);
	const file = resolve(dirIcons, `${src}.svg`);
	if (!existsSync(file)) throw Error(`no such icon "${src}"`);
	if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error('x and y must be numbers');

	const svg = readFileSync(file, 'utf8');
	if (!VIEWBOX.test(svg)) throw Error(`"${src}" has no viewBox to shift`);
	// The ink moves right when the viewBox moves left, hence the negated origin.
	writeFileSync(
		file,
		svg.replace(VIEWBOX, (_, before: string, w: string, h: string, after: string) => {
			return `${before}${fmt(-x)} ${fmt(-y)} ${w} ${h}${after}`;
		})
	);
}

async function readBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks).toString('utf8');
}

export function iconEditor(): Plugin {
	return {
		name: 'icon-editor',
		configureServer(server) {
			server.middlewares.use('/icon-api', (req: IncomingMessage, res: ServerResponse, next) => {
				void (async () => {
					const path = (req.url ?? '').split('?')[0];
					try {
						if (req.method === 'GET' && path === '/icons') {
							res.setHeader('Content-Type', 'application/json');
							res.end(JSON.stringify(listIcons()));
						} else if (req.method === 'POST' && path === '/shift') {
							const { src, x, y } = JSON.parse(await readBody(req)) as { src: string; x: number; y: number };
							shiftIcon(src, x, y);
							res.end('ok');
						} else {
							next();
						}
					} catch (error) {
						res.statusCode = 400;
						res.end(error instanceof Error ? error.message : String(error));
					}
				})();
			});
		},
	};
}
