import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { StyleBuilderFunction, styles } from '../src/index.js';

/**
 * Renders map images for predefined styles and saves them as PNG files.
 *
 * The script uses `@maplibre/maplibre-gl-native` for map rendering
 * and `sharp` for image processing. It generates map images for a set
 * of predefined styles and saves them in the `screenshots` directory.
 */
Promise.all([
	draw('colorful', styles.colorful),
	draw('colorfancy', styles.colorfancy),
	draw('eclipse', styles.eclipse),
	draw('graybeard', styles.graybeard),
	draw('neutrino', styles.neutrino),
])

/**
 * Renders a map image using the given style and saves it as a PNG file.
 *
 * @param name - The name of the style, used in the output filename.
 * @param style - The style builder function that configures the map style.
 * @returns A promise that resolves when the image has been successfully saved.
 */
async function draw(name: string, style: StyleBuilderFunction): Promise<void> {
	// Create a new MapLibre GL map instance
	const map = new mbgl.Map();

	// Load the map style
	map.load(style({}));

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
				height
			},
			(err, buffer) => {
				if (err) throw err;

				// Release the map resources
				map.release();

				// Create a sharp image object from the raw buffer
				const image = sharp(buffer, { raw: { width, height, channels: 4 } });

				// Convert the raw image buffer to a PNG file and save it
				image.toFile(`docs/${name}.png`, err => {
					if (err) throw err;
					console.log(`Saved screenshot ${name}`);
					resolve();
				});
			});
	});
}
