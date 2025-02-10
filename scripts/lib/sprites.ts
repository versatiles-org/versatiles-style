import sharp from 'sharp';
import type { Icon, IconSets } from './icons.js';
import binPack from 'bin-pack';
import { writeFileSync } from 'node:fs';
import type { Pack as TarPack } from 'tar-stream';
import { calcSDFFromAlpha } from './sdf.js';
import { optipng } from './optipng.js';

/**
 * Configuration for creating a Sprite, specifying icon sets and scale ratios.
 */
export interface SpriteConfig {
	spritesheets: Record<string, IconSets>;       // Collection of icon sets to include in the sprite.
	ratios: number[];     // Scale ratios to apply to each icon.
}

/**
 * Represents a sprite sheet that holds multiple icons arranged together in a compact layout.
 * Supports signed distance field (SDF) rendering and efficient memory management.
 */
export class Sprite {
	private readonly entries: SpriteEntry[]; // Metadata and layout information for each icon in the sprite.
	private readonly width: number;          // Width of the complete sprite sheet.
	private readonly height: number;         // Height of the complete sprite sheet.
	private readonly buffer: Buffer;         // Buffer storing raw image data for the sprite sheet.
	private readonly distance: Float64Array; // Distance field values for SDF rendering.

	/**
	 * Private constructor for creating a sprite instance.
	 * @param entries - Array of entries representing each icon in the sprite.
	 * @param width - Calculated width of the sprite sheet.
	 * @param height - Calculated height of the sprite sheet.
	 * @param buffer - Raw image buffer for the sprite sheet.
	 * @param distance - Signed Distance Field (SDF) data array.
	 */
	private constructor(entries: SpriteEntry[], width: number, height: number, buffer: Buffer, distance: Float64Array) {
		if (width % 1 !== 0) throw Error('Sprite width must be an integer.');
		if (height % 1 !== 0) throw Error('Sprite height must be an integer.');
		this.entries = entries;
		this.width = width;
		this.height = height;
		this.buffer = buffer;
		this.distance = distance;
	}

	/**
	 * Creates a Sprite instance from a set of icons.
	 * @param icons - Array of Icon objects to include in the sprite.
	 * @param scale - Scaling factor for each icon.
	 * @param defaultPadding - Default padding around each icon.
	 * @returns A promise resolving to the newly created Sprite instance.
	 */
	public static async fromIcons(icons: Icon[], scale: number, defaultPadding: number): Promise<Sprite> {
		// Parse dimensions for each SVG icon and apply scaling and padding.
		const spriteEntries = icons.map(icon => {
			const wResult = /<svg[^>]+width="([^"]+)"/.exec(icon.svg);
			const hResult = /<svg[^>]+height="([^"]+)"/.exec(icon.svg);
			if (!wResult || !hResult) throw Error('Invalid SVG format.');

			const w0 = parseFloat(wResult[1]);
			const h0 = parseFloat(hResult[1]);
			const height = Math.round(icon.size) * scale;
			const width = Math.round(icon.size * w0 / h0) * scale;

			const svg = icon.svg
				.replace(/(<svg[^>]*width=")([^"]+)/, (_, before) => before + width)
				.replace(/(<svg[^>]*height=")([^"]+)/, (_, before) => before + height);

			const padding = icon.useSDF ? defaultPadding * scale : 0;

			return {
				name: icon.name,
				useSDF: icon.useSDF,
				padding,
				svg,
				width: width + 2 * padding,
				height: height + 2 * padding,
				x: 0,
				y: 0,
				pixelRatio: scale,
			};
		});

		// Calculate dimensions for the packed sprite layout using bin packing.
		const { width, height } = binPack(spriteEntries, { inPlace: true });

		// Render the sprite sheet using sharp with transparent background.
		const buffer = await sharp({
			create: {
				width,
				height,
				channels: 4,
				background: '#fff',
			},
		}).composite(
			spriteEntries.map(e => ({
				input: Buffer.from(e.svg),
				left: e.x + e.padding,
				top: e.y + e.padding,
			})),
		).raw().toBuffer();

		for (let i = 0; i < width * height; i++) buffer[i * 4 + 3] = 0;
		for (const entry of spriteEntries) {
			if (!entry.useSDF) continue;
			for (const i of iteratePixels(entry, width)) {
				buffer[i * 4 + 3] = 255 - buffer[i * 4 + 0];
			}
		}

		// Generate SDF (Signed Distance Field) values based on alpha channel.
		const distance = calcSDFFromAlpha(buffer, width, height);

		return new Sprite(spriteEntries, width, height, buffer, distance);
	}

	/**
	 * Saves the sprite sheet and metadata to PNG and JSON files on disk.
	 * @param basename - Base name for the output files.
	 */
	public async saveToDisk(basename: string): Promise<void> {
		writeFileSync(basename + '.png', await this.getPng());
		writeFileSync(basename + '.json', await this.getJSON());
	}

	/**
	 * Adds the sprite sheet and metadata to a tar archive.
	 * @param basename - Base name for the entries within the tar archive.
	 * @param tarPack - TarPack instance for writing entries.
	 */
	public async saveToTar(basename: string, tarPack: TarPack): Promise<void> {
		tarPack.entry({ name: basename + '.png' }, await this.getPng());
		tarPack.entry({ name: basename + '.json' }, await this.getJSON());
	}

	/**
	 * Renders the SDF-based alpha channel for each icon in the sprite.
	 * @param ratio - Scaling factor to apply.
	 */
	public renderSDF(ratio: number): void {
		const { width, distance, buffer } = this;

		for (const entry of this.entries) {
			if (entry.useSDF) {
				for (const i of iteratePixels(entry, width)) {
					buffer[i * 4 + 3] = 255 * Math.max(0, Math.min(1, 0.75 - distance[i] / ratio / 8));
				}
			} else {
				for (const i of iteratePixels(entry, width)) {
					buffer[i * 4 + 3] = 255;
				}
			}
		}
	}

	/**
	 * Creates a scaled version of the sprite.
	 * @param scale - Scaling factor to apply.
	 * @returns A new Sprite instance at the specified scale.
	 */
	public getScaledSprite(scale: number): Sprite {
		if (scale % 1 !== 0) throw Error('Scale factor must be an integer.');
		if (!this.distance) throw Error('Distance field is not calculated.');

		const width = this.width / scale;
		const height = this.height / scale;
		if (width % 1 !== 0 || height % 1 !== 0) throw Error('Width and height must be integers.');

		const length = width * height;
		const distance = new Float64Array(length);
		const buffer = Buffer.alloc(length * 4);

		// Downsample the buffer and distance field to the new scale.
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let dSum = 0;
				const pSum = [0, 0, 0, 0];

				for (let ya = 0; ya < scale; ya++) {
					for (let xa = 0; xa < scale; xa++) {
						const indexa = (x * scale + xa) + (y * scale + ya) * width * scale;

						dSum += this.distance[indexa];
						pSum[0] += this.buffer[indexa * 4 + 0];
						pSum[1] += this.buffer[indexa * 4 + 1];
						pSum[2] += this.buffer[indexa * 4 + 2];
						pSum[3] += this.buffer[indexa * 4 + 3];
					}
				}

				const sum = scale ** 2;
				const index = x + y * width;
				distance[index] = dSum / (sum * scale);
				buffer[index * 4 + 0] = pSum[0] / sum;
				buffer[index * 4 + 1] = pSum[1] / sum;
				buffer[index * 4 + 2] = pSum[2] / sum;
				buffer[index * 4 + 3] = pSum[3] / sum;
			}
		}

		const scaledEntries = this.entries.map(entry => ({
			...entry,
			x: entry.x / scale,
			y: entry.y / scale,
			padding: entry.padding / scale,
			width: entry.width / scale,
			height: entry.height / scale,
			pixelRatio: entry.pixelRatio / scale,
		}));

		return new Sprite(scaledEntries, width, height, buffer, distance);
	}

	/**
	 * Converts the sprite buffer into a PNG image.
	 * @returns A promise resolving to the PNG buffer.
	 */
	public async getPng(): Promise<Buffer> {
		const pngBuffer = await sharp(this.buffer, { raw: { width: this.width, height: this.height, channels: 4 } })
			.png({ palette: false })
			.toBuffer();

		return await optipng(pngBuffer);
	}

	/**
	 * Generates JSON metadata for each icon in the sprite.
	 * @returns A promise resolving to the JSON buffer.
	 */
	public async getJSON(): Promise<Buffer> {
		const json = this.entries.map(e => `  "${e.name}": ` + JSON.stringify({
			width: e.width,
			height: e.height,
			x: e.x,
			y: e.y,
			pixelRatio: e.pixelRatio,
			sdf: e.useSDF,
		})).join(',\n');
		return Buffer.from(`{\n${json}\n}`, 'utf8');
	}
}

/**
 * Describes an entry in the sprite, containing the icon's layout and SDF properties.
 */
interface SpriteEntry {
	name: string;        // Name of the icon.
	svg: string;         // SVG data for the icon.
	x: number;           // X-coordinate in the sprite sheet.
	y: number;           // Y-coordinate in the sprite sheet.
	padding: number;     // Padding around the icon.
	width: number;       // Width of the icon (including padding).
	height: number;      // Height of the icon (including padding).
	pixelRatio: number;  // Scale ratio applied to the icon.
	useSDF: boolean;     // Flag indicating if the icon uses SDF rendering.
}

/**
 * Helper generator to iterate over all pixels in a given sprite entry.
 * @param entry - The sprite entry.
 * @param imageWidth - The width of the full image.
 * @returns A generator yielding pixel indices for the entry's pixels.
 */
function* iteratePixels(
	entry: { x: number, y: number, width: number, height: number },
	imageWidth: number,
): Generator<number> {
	const x0 = entry.x;
	const y0 = entry.y;
	const x1 = entry.x + entry.width;
	const y1 = entry.y + entry.height;

	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			yield y * imageWidth + x;
		}
	}
}
