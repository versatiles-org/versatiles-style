/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { SpriteEntry, SpriteRGBA } from './sprites.js';

const INFINITY = 1e30;

export function calcSDF(sprite: SpriteRGBA): ImageSDF {
	// https://cs.brown.edu/people/pfelzens/dt/index.html
	// Felzenszwalb Huttenlocher algorithm
	const { width, height, buffer } = sprite;
	const length = width * height;

	const dInn = new Float64Array(length);
	const dOut = new Float64Array(length);
	dInn.fill(INFINITY);
	dOut.fill(INFINITY);

	for (let i = 0; i < length; i++) {
		const alpha = buffer[i * 4 + 3] / 255;
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

	return { width, height, buffer, distance: dOut, entries: sprite.entries };

	function euclideanDistance2D(data: Float64Array): void {
		const length = Math.max(width, height);
		const v = new Array(length);
		const z = new Float64Array(length + 1);
		const f = new Float64Array(length);

		for (let x = 0; x < width; x++) euclideanDistance1D(x, width, height);
		for (let y = 0; y < height; y++) euclideanDistance1D(y * width, 1, width);

		function euclideanDistance1D(offset: number, stepSize: number, length: number): void {

			for (let i = 0; i < length; i++) f[i] = data[offset + i * stepSize];

			let k = 0;
			let s: number;

			v[0] = 0;
			z[0] = -INFINITY;
			z[1] = INFINITY;

			for (let i = 1; i < length; i++) {
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
			for (let i = 0; i < length; i++) {
				while (z[k + 1] < i) k++;
				const r = v[k];
				data[offset + i * stepSize] = f[r] + (i - r) ** 2;
			}
		}


	}
}

export function renderSDFSprite(sprite: ImageSDF): SpriteRGBA {
	const { width, height, distance, entries, buffer } = sprite;
	const length = width * height;

	for (let i = 0; i < length; i++) {
		const c = 0; // 255 - buffer[i * 4 + 3];
		const a = 0.75 - distance[i] / 12;
		buffer[i * 4 + 0] = c;
		buffer[i * 4 + 1] = c;
		buffer[i * 4 + 2] = c;
		buffer[i * 4 + 3] = 255 * Math.max(0, Math.min(1, a));
	}

	return { width, height, buffer, entries };
}

export function scaleSDFSprite(sprite: ImageSDF, scale: number): ImageSDF {
	if (scale % 1 !== 0) throw Error();

	const width = sprite.width / scale;
	const height = sprite.height / scale;
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

					dSum += sprite.distance[indexa];
					pSum[0] += sprite.buffer[indexa * 4 + 0];
					pSum[1] += sprite.buffer[indexa * 4 + 1];
					pSum[2] += sprite.buffer[indexa * 4 + 2];
					pSum[3] += sprite.buffer[indexa * 4 + 3];
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

	return {
		width,
		height,
		buffer,
		distance,
		entries: sprite.entries.map(e => ({
			name: e.name,
			svg: e.svg,
			x: e.x / scale,
			y: e.y / scale,
			offset: e.offset / scale,
			width: e.width / scale,
			height: e.height / scale,
			pixelRatio: e.pixelRatio / scale,
		})),
	};
}

export interface ImageSDF {
	entries: SpriteEntry[];
	width: number;
	height: number;
	buffer: Buffer;
	distance: Float64Array;
}