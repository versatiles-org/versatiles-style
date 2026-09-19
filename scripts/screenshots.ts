import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { osm, satellite } from '../src/index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DEFAULT_BASE } from '../src/options/index.js';

mkdirSync('docs', { recursive: true });

/** Where `npm run build-sprites` puts the sheets this working tree builds. */
const SPRITE_DIR = new URL('../release/sprites', import.meta.url).pathname;

/**
 * Every resource the engine asks for. Sprites are served from `release/sprites/`; everything else —
 * tiles, glyphs — goes to the network.
 *
 * Sprites cannot come from the CDN, because the sheet a style names is only published *by* a release.
 * v6 renamed `basics` to `base`, so the v6.0.0 docs job asked for `/assets/sprites/base`, got a 404
 * from a CDN still serving `basics`, and the release failed on a resource the release itself ships.
 * Reading them locally also means the previews show the icons of the version being documented.
 *
 * Resolved against {@link DEFAULT_BASE}, because a TileJSON may declare its tiles root-relative — the
 * published one does, as `/tiles/osm/{z}/{x}/{y}` — and those arrive here unresolved. Without a
 * `request` callback the engine resolves them itself, so this only became necessary once we supplied
 * one.
 */
const request = (
	req: { url: string; kind: number },
	cb: (err?: Error, response?: { data: Uint8Array }) => void
): void => {
	let url: URL;
	try {
		url = new URL(req.url, DEFAULT_BASE);
	} catch {
		return cb(new Error(`could not resolve resource URL: ${req.url}`));
	}
	const sprite = /\/assets\/sprites\/([^/]+)$/.exec(url.pathname);
	if (sprite) {
		const file = resolve(SPRITE_DIR, sprite[1]);
		if (!existsSync(file)) return cb(new Error(`${file} does not exist — run \`npm run build-sprites\``));
		return cb(undefined, { data: readFileSync(file) });
	}
	fetch(url).then(
		async (res) => {
			if (!res.ok) return cb(new Error(`HTTP ${res.status} for ${url.href}`));
			cb(undefined, { data: new Uint8Array(await res.arrayBuffer()) });
		},
		(error: unknown) => cb(error instanceof Error ? error : new Error(String(error)))
	);
};

/**
 * Renders map images for predefined styles and saves them as PNG files.
 *
 * The script uses `@maplibre/maplibre-gl-native` for map rendering
 * and `sharp` for image processing. It generates map images for a set
 * of predefined styles and saves them in the `docs` directory.
 */
// Driven off `osm.palettes` rather than a list repeated here, so a palette added to the package gets
// a preview without anyone remembering to add one — which is how the dark themes went unillustrated
// in the README for a whole major version. The name is the palette's own, so `colorful-dark.png`
// sits beside `colorful.png` and the README can pair them.
//
// Awaited, with an explicit failure exit. Left floating, a rejected render surfaced as an unhandled
// rejection with no indication of which style failed — and this runs in the release workflow's docs
// job, where a silent-looking crash mid-way would publish a page missing a preview image.
Promise.all([
	...osm.palettes.map((theme) => draw(theme, osm({ theme }))),
	// No dark counterpart: the imagery is the background, and only the overlay could be themed.
	draw('satellite', satellite()),
]).catch((error: unknown) => {
	console.error('screenshots failed:', error);
	process.exit(1);
});

/**
 * Renders a map image using the given style and saves it as a PNG file.
 *
 * @param name - The name of the style, used in the output filename.
 * @param style - The style specification to render.
 * @returns A promise that resolves when the image has been successfully saved.
 */
async function draw(name: string, style: StyleSpecification): Promise<void> {
	// Create a new MapLibre GL map instance, serving sprites locally (see `request`).
	const map = new mbgl.Map({ request } as unknown as ConstructorParameters<typeof mbgl.Map>[0]);

	// Load the map style
	map.load(style);

	// Define the dimensions of the rendered image
	const width = 1024;
	const height = 768;

	return new Promise<void>((resolve) => {
		// Render the map to an image buffer
		map.render(
			{
				center: [13.408333, 52.518611],
				zoom: 9.2,
				width,
				height,
			},
			(err, buffer) => {
				if (err) throw err;

				// Release the map resources
				map.release();

				// Create a sharp image object from the raw buffer
				const image = sharp(buffer, { raw: { width, height, channels: 4 } });

				// Convert the raw image buffer to a PNG file and save it
				image.toFile(`docs/${name}.png`, (err) => {
					if (err) throw err;
					console.log(`Saved screenshot ${name}`);
					resolve();
				});
			}
		);
	});
}
