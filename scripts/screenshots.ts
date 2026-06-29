import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { osm, satellite } from '../src/index.js';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { mkdirSync } from 'fs';

mkdirSync('docs', { recursive: true });

/**
 * Renders map images for predefined styles and saves them as PNG files.
 *
 * The script uses `@maplibre/maplibre-gl-native` for map rendering
 * and `sharp` for image processing. It generates map images for a set
 * of predefined styles and saves them in the `screenshots` directory.
 */
Promise.all([
	draw('colorful', osm({ theme: 'colorful' })),
	draw('natural', osm({ theme: 'natural' })),
	draw('muted', osm({ theme: 'muted' })),
	draw('gray', osm({ theme: 'gray' })),
	draw('toner', osm({ theme: 'toner' })),
	draw('satellite', satellite()),
]);

/**
 * Renders a map image using the given style and saves it as a PNG file.
 *
 * @param name - The name of the style, used in the output filename.
 * @param style - The style specification to render.
 * @returns A promise that resolves when the image has been successfully saved.
 */
async function draw(name: string, styleInput: StyleSpecification | Promise<StyleSpecification>): Promise<void> {
	// osm()/satellite() are async, so accept a style or a promise of one.
	const style = await styleInput;

	// Create a new MapLibre GL map instance
	const map = new mbgl.Map();

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
