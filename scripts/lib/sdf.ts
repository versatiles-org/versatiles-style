/**
 * Calculates the Signed Distance Field (SDF) for the sprite based on alpha values.
 * @param buffer - Image buffer with alpha values.
 * @param width - Width of the sprite.
 * @param height - Height of the sprite.
 * @returns A Float64Array containing SDF values for each pixel.
 */
export function calcSDFFromAlpha(buffer: Buffer, width: number, height: number): Float64Array {
	const INFINITY = 1e30;
	// https://cs.brown.edu/people/pfelzens/dt/index.html
	// Felzenszwalb Huttenlocher algorithm

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
		dOut[i] = dOut[i] < dInn[i] ? -Math.sqrt(dInn[i]) : Math.sqrt(dOut[i]);
	}
	return dOut;

	/**
	 * Helper function to compute 2D Euclidean distance.
	 */
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
					s = (f[i] - f[r] + i ** 2 - r ** 2) / (2 * (i - r));
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
