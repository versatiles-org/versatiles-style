import Color from 'color';

// Utility function to deep clone an object
export function deepClone<T>(obj: T): T {
	const type = typeof obj;
	if (type !== 'object') {
		switch (type) {
			case 'boolean':
			case 'number':
			case 'string':
			case 'undefined':
				return obj;
			default: throw new Error(`Not implemented yet: "${type}" case`);
		}
	}

	if (isSimpleObject(obj)) {
		// @ts-expect-error: Too complicated to handle
		return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, deepClone(value)]));
	}

	if (obj instanceof Array) {
		// @ts-expect-error: Too complicated to handle
		return obj.map((e: unknown) => deepClone(e));
	}

	if (obj instanceof Color) {
		// @ts-expect-error: Too complicated to handle
		return Color(obj);
	}

	console.log('obj', obj);
	console.log('obj.prototype', Object.getPrototypeOf(obj));
	throw Error();
}

export function isSimpleObject(item: unknown): boolean {
	if (item === null) return false;
	if (typeof item !== 'object') return false;
	if (Array.isArray(item)) return false;
	const prototypeKeyCount: number = Object.keys(Object.getPrototypeOf(item) as object).length;
	if (prototypeKeyCount !== 0) return false;
	if (item.constructor.name !== 'Object') return false;
	return true;
}

export function isBasicType(item: unknown): boolean {
	switch (typeof item) {
		case 'boolean':
		case 'number':
		case 'string':
		case 'undefined':
			return true;
		case 'object':
			return false;
		default:
			throw Error('unknown type: ' + typeof item);
	}
}

export function deepMerge<T extends object>(source0: T, ...sources: T[]): T {
	const target: T = deepClone(source0);

	for (const source of sources) {
		if (typeof source !== 'object') continue;
		for (const key in source) {
			if (!Object.hasOwn(source, key)) continue;

			const sourceValue = source[key];

			// *********
			// overwrite
			// *********
			switch (typeof sourceValue) {
				case 'number':
				case 'string':
				case 'boolean':
					target[key] = sourceValue;
					continue;
				default:
			}

			if (isBasicType(target[key])) {
				target[key] = deepClone(sourceValue);
				continue;
			}

			if (sourceValue instanceof Color) {
				// @ts-expect-error: Too complicated to handle
				target[key] = Color(sourceValue);
				continue;
			}

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				// @ts-expect-error: Too complicated to handle
				target[key] = deepMerge(target[key], sourceValue);
				continue;
			}

			// *********
			// merge
			// *********

			if (isSimpleObject(target[key]) && isSimpleObject(sourceValue)) {
				// @ts-expect-error: Too complicated to handle
				target[key] = deepMerge(target[key], sourceValue);
				continue;
			}

			console.log('target[key]:', target[key]);
			console.log('source[key]:', source[key]);
			throw Error('unpredicted case');
		}
	}
	return target;
}

export interface RandomColorOptions {
	seed?: string;
	hue?: number | string;
	opacity?: number;
	luminosity?: number | string;
	saturation?: number | string;
}

interface ColorInfo {
	hueRange: [number, number] | null;
	lowerBounds: [number, number][];
	saturationRange: [number, number];
	brightnessRange: [number, number];
}

export class RandomColor {
	#seed: number;

	#colorDictionary: Record<string, ColorInfo>;

	public constructor() {
		this.#seed = 0;
		this.#colorDictionary = {};
		this.#initColorDictionary();
	}


	public randomColor(options: RandomColorOptions = { hue: 0 }): string {

		if (options.seed != null) {
			this.#seed = this.#stringToInteger(options.seed);
		}

		const H = this.#pickHue(options);
		const S = this.#pickSaturation(H, options);
		const B = this.#pickBrightness(H, S, options);
		const hsl = this.#HSVtoHSL([H, S, B]).map(v => v.toFixed(0));
		return `hsla(${hsl[0]},${hsl[1]}%,${hsl[2]}%,${options.opacity ?? 1})`;
	}

	#pickHue(options: RandomColorOptions): number {
		let hue = this.#randomWithin(this.#getHueRange(options.hue));
		if (hue < 0) hue = 360 + hue;
		return hue;
	}

	#pickSaturation(hue: number, options: RandomColorOptions): number {
		if (options.hue === 'monochrome') return 0;
		if (options.luminosity === 'random') return this.#randomWithin([0, 100]);

		const { saturationRange } = this.#getColorInfo(hue);
		let [sMin, sMax] = saturationRange;

		if (options.saturation === 'strong') return sMax;

		switch (options.luminosity) {
			case 'bright': sMin = 55; break;
			case 'dark': sMin = sMax - 10; break;
			case 'light': sMax = 55; break;
			default:
		}

		return this.#randomWithin([sMin, sMax]);
	}

	#pickBrightness(h: number, s: number, options: RandomColorOptions): number {
		let bMin = this.#getMinimumBrightness(h, s), bMax = 100;

		switch (options.luminosity) {
			case 'dark': bMax = Math.min(100, bMin + 20); break;
			case 'light': bMin = (bMax + bMin) / 2; break;
			case 'random': bMin = 0; bMax = 100; break;
			default:
		}

		return this.#randomWithin([bMin, bMax]);
	}

	#getMinimumBrightness(h: number, s: number): number {
		const { lowerBounds } = this.#getColorInfo(h);

		for (let i = 0; i < lowerBounds.length - 1; i++) {
			const [s1, v1] = lowerBounds[i];
			const [s2, v2] = lowerBounds[i + 1];
			if (s >= s1 && s <= s2) {
				const m = (v2 - v1) / (s2 - s1), b = v1 - m * s1;
				return m * s + b;
			}
		}

		return 0;
	}

	#getHueRange(hue?: number | string): [number, number] {
		if (typeof hue === 'number') {
			if (hue < 360 && hue > 0) return [hue, hue];
		}

		if (typeof hue === 'string') {
			const color = this.#colorDictionary[hue];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (color?.hueRange) return color.hueRange;
		}

		return [0, 360];
	}

	#getColorInfo(hue: number): ColorInfo {
		// Maps red colors to make picking hue easier
		if (hue >= 334 && hue <= 360) hue -= 360;

		for (const colorName in this.#colorDictionary) {
			const color = this.#colorDictionary[colorName];
			if (color.hueRange && hue >= color.hueRange[0] && hue <= color.hueRange[1]) {
				return this.#colorDictionary[colorName];
			}
		}
		throw Error('Color not found');
	}

	#randomWithin(range: [number, number]): number {
		//Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		const max = range[1] || 1;
		const min = range[0] || 0;
		this.#seed = (this.#seed * 9301 + 49297) % 233280;
		const rnd = this.#seed / 233280.0;
		return Math.floor(min + rnd * (max - min));
	}

	#initColorDictionary(): void {
		this.#colorDictionary = {};

		const defineColor = (name: string, hueRange: [number, number] | null, lowerBounds: [number, number][]): void => {
			const [greyest] = lowerBounds;
			const colorful = lowerBounds[lowerBounds.length - 1];

			this.#colorDictionary[name] = {
				hueRange,
				lowerBounds,
				saturationRange: [greyest[0], colorful[0]],
				brightnessRange: [colorful[1], greyest[1]],
			};
		};

		defineColor('monochrome', null, [[0, 0], [100, 0]]);
		defineColor('red', [-26, 18], [[20, 100], [30, 92], [40, 89], [50, 85], [60, 78], [70, 70], [80, 60], [90, 55], [100, 50]]);
		defineColor('orange', [18, 46], [[20, 100], [30, 93], [40, 88], [50, 86], [60, 85], [70, 70], [100, 70]]);
		defineColor('yellow', [46, 62], [[25, 100], [40, 94], [50, 89], [60, 86], [70, 84], [80, 82], [90, 80], [100, 75]]);
		defineColor('green', [62, 178], [[30, 100], [40, 90], [50, 85], [60, 81], [70, 74], [80, 64], [90, 50], [100, 40]]);
		defineColor('blue', [178, 257], [[20, 100], [30, 86], [40, 80], [50, 74], [60, 60], [70, 52], [80, 44], [90, 39], [100, 35]]);
		defineColor('purple', [257, 282], [[20, 100], [30, 87], [40, 79], [50, 70], [60, 65], [70, 59], [80, 52], [90, 45], [100, 42]]);
		defineColor('pink', [282, 334], [[20, 100], [30, 90], [40, 86], [60, 84], [80, 80], [90, 75], [100, 73]]);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	#HSVtoHSL(hsv: [number, number, number]): [number, number, number] {
		const s = hsv[1] / 100, v = hsv[2] / 100, k = (2 - s) * v;
		return [hsv[0], 100 * s * v / (k < 1 ? k : 2 - k), 100 * k / 2];
	}

	#stringToInteger(s: string): number {
		let i = 0;
		for (let p = 0; p < s.length; p++) i = (i * 0x101 + s.charCodeAt(p)) % 0x100000000;
		return i;
	}
}
