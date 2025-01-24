import mbgl from '@maplibre/maplibre-gl-native';
import sharp from 'sharp';
import { StyleBuilderFunction, styles } from '../src/index';

Promise.all([
	draw('colorful', styles.colorful),
	draw('eclipse', styles.eclipse),
	draw('graybeard', styles.graybeard),
	draw('neutrino', styles.neutrino),
])

async function draw(name: string, style: StyleBuilderFunction): Promise<void> {
	const map = new mbgl.Map();

	map.load(style({}));

	const width = 1024;
	const height = 768;

	return new Promise<void>((resolve) => {
		map.render({ center: [13.408333, 52.518611], zoom: 9.2, width, height, }, (err, buffer) => {
			if (err) throw err;

			map.release();

			const image = sharp(buffer, { raw: { width, height, channels: 4 } });

			// Convert raw image buffer to PNG
			image.toFile(`screenshots/${name}.png`, err => {
				if (err) throw err;
				console.log(`Saved screenshot ${name}`);
				resolve();
			});
		});
	})
}
