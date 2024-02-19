import sharp from 'sharp';
import type { Icon } from './icons.js';
import pack from 'bin-pack';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Pack as TarPack } from 'tar-stream';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

export class Sprite {
	private readonly entries: SpriteEntry[];

	private readonly width: number;

	private readonly height: number;

	private readonly buffer: Buffer;

	private bufferPng?: Buffer;

	private distance?: Float64Array;

	// eslint-disable-next-line @typescript-eslint/max-params
	private constructor(entries: SpriteEntry[], width: number, height: number, buffer: Buffer) {
		this.entries = entries;
		this.width = width;
		this.height = height;
		this.buffer = buffer;
	}

	public static async fromIcons(icons: Icon[], scale: number, padding: number): Promise<Sprite> {
		const spriteEntries = icons.map(icon => {
			const wResult = /<svg[^>]+width="([^"]+)"/.exec(icon.svg);
			const hResult = /<svg[^>]+height="([^"]+)"/.exec(icon.svg);
			if (!wResult) throw Error();
			if (!hResult) throw Error();
			const w0 = parseFloat(wResult[1]);
			const h0 = parseFloat(hResult[1]);

			if (!w0 || !h0) throw Error();

			const height: number = Math.round(icon.size) * scale;
			const width: number = Math.round(icon.size * w0 / h0) * scale;

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

		const dimensions = pack(spriteEntries, { inPlace: true });

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

	public async saveToDisk(basename: string, folder: string): Promise<void> {
		writeFileSync(resolve(folder, basename + '.png'), await this.getPng());
		writeFileSync(resolve(folder, basename + '.json'), await this.getJSON());
	}

	public async saveToTar(basename: string, tarPack: TarPack): Promise<void> {
		tarPack.entry({ name: basename + '.png' }, await this.getPng());
		tarPack.entry({ name: basename + '.json' }, await this.getJSON());
	}

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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const r = v[k];
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const r = v[k];
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					data[offset + i * stepSize] = f[r] + (i - r) ** 2;
				}
			}


		}
	}

	public renderSDF(): void {
		if (!this.distance) throw Error();

		const { width, height, distance, buffer } = this;
		const length = width * height;

		for (let i = 0; i < length; i++) {
			const a = 0.75 - distance[i] / 12;
			buffer[i * 4 + 0] = 0;
			buffer[i * 4 + 1] = 0;
			buffer[i * 4 + 2] = 0;
			buffer[i * 4 + 3] = 255 * Math.max(0, Math.min(1, a));
		}
	}

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

	private async getPng(): Promise<Buffer> {
		if (this.bufferPng) return this.bufferPng;
		
		const pngBuffer = await sharp(this.buffer, { raw: { width: this.width, height: this.height, channels: 4 } })
			.png({ palette: false })
			.toBuffer();
			
		this.bufferPng = optipng(pngBuffer);
		
		return this.bufferPng;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
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

