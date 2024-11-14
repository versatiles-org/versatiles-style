import sharp from 'sharp';
import type { Icon } from './icons.js';
import binPack from 'bin-pack';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Pack as TarPack } from 'tar-stream';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

/**
 * Represents a sprite sheet that holds multiple icons arranged together.
 */
export class Sprite {
	private readonly entries: SpriteEntry[]; // List of entries for each icon in the sprite.
	private readonly width: number;         // Width of the sprite sheet.
	private readonly height: number;        // Height of the sprite sheet.
	private readonly buffer: Buffer;        // Buffer storing raw image data for the sprite sheet.
	private bufferPng?: Buffer;             // PNG representation of the sprite sheet.
	private distance?: Float64Array;        // Distance field values for SDF (Signed Distance Field) rendering.

	/**
	 * Private constructor to initialize a sprite instance.
	 * @param entries - Array of sprite entries.
	 * @param width - Width of the sprite sheet.
	 * @param height - Height of the sprite sheet.
	 * @param buffer - Raw image buffer for the sprite sheet.
	 */
	private constructor(entries: SpriteEntry[], width: number, height: number, buffer: Buffer) {
		if (width % 1 !== 0) throw Error();
		if (height % 1 !== 0) throw Error();
		this.entries = entries;
		this.width = width;
		this.height = height;
		this.buffer = buffer;
	}

	/**
	 * Factory method to create a Sprite from a list of icons.
	 * @param icons - Array of Icon objects.
	 * @param scale - Scale factor for the icon size.
	 * @param padding - Padding around each icon in the sprite.
	 * @returns A promise resolving to a new Sprite instance.
	 */
	public static async fromIcons(icons: Icon[], scale: number, padding: number): Promise<Sprite> {
		// Generate sprite entries by parsing the width and height of each SVG icon.
		const spriteEntries = icons.map(icon => {
			const wResult = /<svg[^>]+width="([^"]+)"/.exec(icon.svg);
			const hResult = /<svg[^>]+height="([^"]+)"/.exec(icon.svg);
			if (!wResult || !hResult) throw Error();

			const w0 = parseFloat(wResult[1]);
			const h0 = parseFloat(hResult[1]);
			const height = Math.round(icon.size) * scale;
			const width = Math.round(icon.size * w0 / h0) * scale;

			const svg = icon.svg
				.replace(/(<svg[^>]*width=")([^"]+)/, (all, before: string) => before + width)
				.replace(/(<svg[^>]*height=")([^"]+)/, (all, before: string) => before + height);

			return {
				name: icon.name,
				offset: padding * scale,
				svg,
				width: width + 2 * padding * scale,
				height: height + 2 * padding * scale,
				x: 0,
				y: 0,
				pixelRatio: scale,
			};
		});

		// Calculate dimensions for the sprite using bin packing.
		const dimensions = binPack(spriteEntries, { inPlace: true });

		// Render the sprite image using sharp.
		const buffer = await sharp({
			create: {
				width: dimensions.width,
				height: dimensions.height,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			},
		}).composite(
			spriteEntries.map(spriteEntry => ({
				input: Buffer.from(spriteEntry.svg),
				left: spriteEntry.x + spriteEntry.offset,
				top: spriteEntry.y + spriteEntry.offset,
			})),
		).raw().toBuffer();

		return new Sprite(
			spriteEntries,
			dimensions.width,
			dimensions.height,
			buffer,
		);
	}

	/**
	 * Save the sprite to disk as a PNG and JSON file.
	 * @param basename - Base name for the files.
	 * @param folder - Folder path where files will be saved.
	 */
	public async saveToDisk(basename: string, folder: string): Promise<void> {
		writeFileSync(resolve(folder, basename + '.png'), await this.getPng());
		writeFileSync(resolve(folder, basename + '.json'), await this.getJSON());
	}

	/**
	 * Save the sprite to a tar archive.
	 * @param basename - Base name for the files in the tar archive.
	 * @param tarPack - TarPack instance for archiving.
	 */
	public async saveToTar(basename: string, tarPack: TarPack): Promise<void> {
		tarPack.entry({ name: basename + '.png' }, await this.getPng());
		tarPack.entry({ name: basename + '.json' }, await this.getJSON());
	}

	/**
	 * Calculate the Signed Distance Field (SDF) for the sprite.
	 */
	public calcSDF(): void {
		const INFINITY = 1e30;
		// https://cs.brown.edu/people/pfelzens/dt/index.html
		// Felzenszwalb Huttenlocher algorithm

		const { width, height } = this;
		const length = width * height;

		const dInn = new Float64Array(length);
		const dOut = new Float64Array(length);
		dInn.fill(INFINITY);
		dOut.fill(INFINITY);

		for (let i = 0; i < length; i++) {
			const alpha = this.buffer[i * 4 + 3] / 255;
			if (alpha < 0.5) {
				dInn[i] = alpha ** 2;
			} else {
				dOut[i] = (1 - alpha) ** 2;
			}
		}

		euclideanDistance2D(dOut);
		euclideanDistance2D(dInn);

		for (let i = 0; i < length; i++) {
			dOut[i] = (dOut[i] < dInn[i]) ? -Math.sqrt(dInn[i]) : Math.sqrt(dOut[i]);
		}

		this.distance = dOut;

		function euclideanDistance2D(data: Float64Array): void {
			const maxSize = Math.max(width, height);
			const v = new Array(maxSize);
			const z = new Float64Array(maxSize + 1);
			const f = new Float64Array(maxSize);

			for (let x = 0; x < width; x++) euclideanDistance1D(x, width, height);
			for (let y = 0; y < height; y++) euclideanDistance1D(y * width, 1, width);

			function euclideanDistance1D(offset: number, stepSize: number, max: number): void {
				for (let i = 0; i < max; i++) f[i] = data[offset + i * stepSize];

				let k = 0;
				let s: number;
				v[0] = 0;
				z[0] = -INFINITY;
				z[1] = INFINITY;

				for (let i = 1; i < max; i++) {
					do {
						const r = v[k];
						s = (f[i] - f[r] + i ** 2 - r ** 2) / (i - r) / 2;
					} while (s <= z[k] && --k >= 0);

					k++;
					v[k] = i;
					z[k] = s;
					z[k + 1] = INFINITY;
				}

				k = 0;
				for (let i = 0; i < max; i++) {
					while (z[k + 1] < i) k++;
					data[offset + i * stepSize] = f[v[k]] + (i - v[k]) ** 2;
				}
			}
		}
	}

	/**
	 * Renders the sprite's distance field into the sprite's buffer.
	 */
	public renderSDF(): void {
		if (!this.distance) throw Error();

		const { width, height, distance, buffer } = this;
		const length = width * height;

		for (let i = 0; i < length; i++) {
			const a = 0.75 - distance[i] / 16;
			buffer[i * 4 + 0] = 0;
			buffer[i * 4 + 1] = 0;
			buffer[i * 4 + 2] = 0;
			buffer[i * 4 + 3] = 255 * Math.max(0, Math.min(1, a));
		}
	}

	/**
	 * Gets a scaled version of the sprite.
	 * @param scale - Scaling factor.
	 * @returns New scaled Sprite instance.
	 */
	public getScaledSprite(scale: number): Sprite {
		if (scale % 1 !== 0) throw Error();
		if (!this.distance) throw Error();

		const width = this.width / scale;
		const height = this.height / scale;
		if (width % 1 !== 0) throw Error();
		if (height % 1 !== 0) throw Error();

		const length = width * height;
		const distance = new Float64Array(length);
		const buffer = Buffer.alloc(length * 4);

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

		const sprite = new Sprite(this.entries.map(e => ({
			name: e.name,
			svg: e.svg,
			x: e.x / scale,
			y: e.y / scale,
			offset: e.offset / scale,
			width: e.width / scale,
			height: e.height / scale,
			pixelRatio: e.pixelRatio / scale,
		})), width, height, buffer);

		sprite.distance = distance;
		return sprite;
	}

	/**
	 * Generates a PNG from the sprite buffer.
	 * @returns A promise resolving to the PNG buffer.
	 */
	private async getPng(): Promise<Buffer> {
		if (this.bufferPng) return this.bufferPng;

		const pngBuffer = await sharp(this.buffer, { raw: { width: this.width, height: this.height, channels: 4 } })
			.png({ palette: false })
			.toBuffer();

		this.bufferPng = optipng(pngBuffer);
		return this.bufferPng;
	}

	/**
	 * Generates JSON metadata for the sprite entries.
	 * @returns A promise resolving to the JSON buffer.
	 */
	private async getJSON(): Promise<Buffer> {
		let json = this.entries.map(e => '  "' + e.name + '": ' + JSON.stringify({
			width: e.width,
			height: e.height,
			x: e.x,
			y: e.y,
			pixelRatio: e.pixelRatio,
			sdf: true,
		})).join(',\n');
		json = `{\n${json}\n}`;
		return Buffer.from(json, 'utf8');
	}
}

/**
 * Interface defining the structure of a sprite entry.
 */
interface SpriteEntry {
	name: string;
	svg: string;
	x: number;
	y: number;
	offset: number;
	width: number;
	height: number;
	pixelRatio: number;
}

/**
 * Optimizes a PNG buffer using the optipng command-line tool.
 * @param bufferIn - Input PNG buffer.
 * @returns Optimized PNG buffer.
 */
export function optipng(bufferIn: Buffer): Buffer {
	const randomString = Math.random().toString(36).replace(/[^a-z0-9]/g, '');
	const filename = resolve(tmpdir(), randomString + '.png');

	writeFileSync(filename, bufferIn);
	const result = spawnSync('optipng', [filename]);

	if (result.status === 1) {
		console.log(result.stderr.toString());
		throw Error();
	}

	const bufferOut = readFileSync(filename);
	rmSync(filename);
	return bufferOut;
}
