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

export type RandomColorFunction = (options?: RandomColorOptions) => string;

export default function randomColorGenerator(startSeed?: number | string): RandomColorFunction {
	let seed: number = inputToSeed(startSeed);
	const colorDictionary = initColorDictionary();
	return randomColor;

	function randomColor(options?: RandomColorOptions): string {
		options ??= {};

		if (options.seed != null) {
			seed = inputToSeed(options.seed);
		}

		options.opacity ??= 1;

		const H = pickHue(options);
		const S = pickSaturation(H, options);
		const V = pickBrightness(H, S, options);
		const hsl = HSVtoHSL([H, S, V]).map(v => v.toFixed(0));

		if (options.opacity === 1) {
			return `hsl(${hsl[0]},${hsl[1]}%,${hsl[2]}%)`;
		} else {
			return `hsla(${hsl[0]},${hsl[1]}%,${hsl[2]}%,${options.opacity})`;
		}
	}

	function pickHue(options: RandomColorOptions): number {
		let hue = randomWithin(getHueRange(options.hue));
		if (hue < 0) hue = 360 + hue;
		return hue;
	}

	function pickSaturation(hue: number, options: RandomColorOptions): number {
		if (options.hue === 'monochrome') return 0;
		if (options.luminosity === 'random') return randomWithin([0, 100]);

		const { saturationRange } = getColorInfo(hue);
		let [sMin, sMax] = saturationRange;

		if (options.saturation === 'strong') return sMax;

		switch (options.luminosity) {
			case 'bright': sMin = 55; break;
			case 'dark': sMin = sMax - 10; break;
			case 'light': sMax = 55; break;
			default:
		}

		return randomWithin([sMin, sMax]);
	}

	function pickBrightness(h: number, s: number, options: RandomColorOptions): number {
		let bMin = getMinimumBrightness(h, s), bMax = 100;

		switch (options.luminosity) {
			case 'dark': bMax = Math.min(100, bMin + 20); break;
			case 'light': bMin = (bMax + bMin) / 2; break;
			case 'random': bMin = 0; bMax = 100; break;
			default:
		}

		return randomWithin([bMin, bMax]);
	}

	function getMinimumBrightness(h: number, s: number): number {
		const { lowerBounds } = getColorInfo(h);

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

	function getHueRange(hue?: number | string): [number, number] {
		if (typeof hue === 'number') {
			if (hue < 360 && hue > 0) return [hue, hue];
		}

		if (typeof hue === 'string') {
			const color = colorDictionary[hue];
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (color?.hueRange) return color.hueRange;
		}

		return [0, 360];
	}

	function getColorInfo(hue: number): ColorInfo {
		// Maps red colors to make picking hue easier
		if (hue >= 334 && hue <= 360) hue -= 360;

		for (const colorName in colorDictionary) {
			const color = colorDictionary[colorName];
			if (color.hueRange && hue >= color.hueRange[0] && hue <= color.hueRange[1]) {
				return colorDictionary[colorName];
			}
		}
		throw Error('Color not found');
	}

	function randomWithin(range: [number, number]): number {
		//Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		const max = range[1] || 1;
		const min = range[0] || 0;
		seed = (seed * 9301 + 49297) % 233280;
		const rnd = seed / 233280.0;
		return Math.floor(min + rnd * (max - min));
	}

	function initColorDictionary(): Record<string, ColorInfo> {
		const dic: Record<string, ColorInfo> = {};

		const defineColor = (name: string, hueRange: [number, number] | null, lowerBounds: [number, number][]): void => {
			const [greyest] = lowerBounds;
			const colorful = lowerBounds[lowerBounds.length - 1];

			dic[name] = {
				hueRange,
				lowerBounds,
				saturationRange: [greyest[0], colorful[0]],
				brightnessRange: [colorful[1], greyest[1]],
			};
		};

		defineColor('monochrome', null, [[0, 0], [100, 0]]);
		defineColor('red', [- 26, 18], [[20, 100], [30, 92], [40, 89], [50, 85], [60, 78], [70, 70], [80, 60], [90, 55], [100, 50]]);
		defineColor('orange', [18, 46], [[20, 100], [30, 93], [40, 88], [50, 86], [60, 85], [70, 70], [100, 70]]);
		defineColor('yellow', [46, 62], [[25, 100], [40, 94], [50, 89], [60, 86], [70, 84], [80, 82], [90, 80], [100, 75]]);
		defineColor('green', [62, 178], [[30, 100], [40, 90], [50, 85], [60, 81], [70, 74], [80, 64], [90, 50], [100, 40]]);
		defineColor('blue', [178, 257], [[20, 100], [30, 86], [40, 80], [50, 74], [60, 60], [70, 52], [80, 44], [90, 39], [100, 35]]);
		defineColor('purple', [257, 282], [[20, 100], [30, 87], [40, 79], [50, 70], [60, 65], [70, 59], [80, 52], [90, 45], [100, 42]]);
		defineColor('pink', [282, 334], [[20, 100], [30, 90], [40, 86], [60, 84], [80, 80], [90, 75], [100, 73]]);

		return dic;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	function HSVtoHSL(hsv: [number, number, number]): [number, number, number] {
		const s = hsv[1] / 100, v = hsv[2] / 100, k = (2 - s) * v;
		return [hsv[0], 100 * s * v / (k < 1 ? k : 2 - k), 100 * k / 2];
	}

	function inputToSeed(input: number | string | null | undefined): number {
		if (input == null) return 0;
		if (typeof input === 'number') return input;

		let i = 0;
		for (let p = 0; p < input.length; p++) i = (i * 0x101 + input.charCodeAt(p)) % 0x100000000;
		return i;
	}
}
