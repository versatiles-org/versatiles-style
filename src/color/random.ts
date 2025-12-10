import { HSV } from './hsv.js';
import { mod } from './utils.js';

type Range = [number, number];
interface ColorInfo {
	hueRange: Range | null;
	lowerBounds: Range[];
	saturationRange: Range;
	brightnessRange: Range;
}

export interface RandomColorOptions {
	seed?: string;
	hue?: number | string;
	opacity?: number;
	luminosity?: number | string;
	saturation?: number | string;
}

let colorDictionary = new Map<string, ColorInfo>();

export default function randomColor(options?: RandomColorOptions): HSV {
	if (colorDictionary.size === 0) colorDictionary = initColorDictionary();

	options ??= {};

	let seed = inputToSeed(options.seed);

	const H = pickHue(options);
	const S = pickSaturation(H, options);
	const V = pickBrightness(H, S, options);

	return new HSV(H, S, V, options.opacity ?? 1);

	function pickHue(options: RandomColorOptions): number {
		return mod(randomWithin(getHueRange(options.hue)), 360);

		function getHueRange(hue?: number | string): Range {
			if (typeof hue === 'number') {
				hue = mod(hue, 360);
				return [hue, hue];
			}

			if (typeof hue === 'string') {
				const color = colorDictionary.get(hue);
				if (color?.hueRange) return color.hueRange;
			}

			return [0, 360];
		}
	}

	function pickSaturation(hue: number, options: RandomColorOptions): number {
		if (options.hue === 'monochrome') return 0;
		if (options.luminosity === 'random') return randomWithin([0, 100]);

		let [sMin, sMax] = getColorInfo(hue).saturationRange;

		if (options.saturation === 'strong') return sMax;

		switch (options.luminosity) {
			case 'bright':
				sMin = 55;
				break;
			case 'dark':
				sMin = sMax - 10;
				break;
			case 'light':
				sMax = 55;
				break;
			default:
		}

		return randomWithin([sMin, sMax]);
	}

	function pickBrightness(h: number, s: number, options: RandomColorOptions): number {
		let bMin = getMinimumBrightness(h, s),
			bMax = 100;

		if (typeof options.luminosity === 'number') {
			bMin = options.luminosity;
			bMax = options.luminosity;
		} else {
			switch (options.luminosity) {
				case 'dark':
					bMax = Math.min(100, bMin + 20);
					break;
				case 'light':
					bMin = (bMax + bMin) / 2;
					break;
				case 'random':
					bMin = 0;
					bMax = 100;
					break;
				default:
			}
		}

		return randomWithin([bMin, bMax]);

		function getMinimumBrightness(h: number, s: number): number {
			const { lowerBounds } = getColorInfo(h);

			for (let i = 0; i < lowerBounds.length - 1; i++) {
				const [s1, v1] = lowerBounds[i];
				const [s2, v2] = lowerBounds[i + 1];
				if (s >= s1 && s <= s2) {
					const m = (v2 - v1) / (s2 - s1),
						b = v1 - m * s1;
					return m * s + b;
				}
			}

			return 0;
		}
	}

	function randomWithin(range: Range): number {
		//Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
		seed = (seed * 9301 + 49297) % 233280;
		return Math.floor(range[0] + (seed / 233280.0) * (range[1] - range[0]));
	}
}

function inputToSeed(input: number | string | null | undefined): number {
	if (input == null) return 0;
	if (typeof input === 'number') return input;

	let i = 0;
	for (let p = 0; p < input.length; p++) i = (i * 0x101 + input.charCodeAt(p)) % 0x100000000;
	return i;
}

function initColorDictionary(): Map<string, ColorInfo> {
	const dict = new Map<string, ColorInfo>();

	const defineColor = (name: string, hueRange: [number, number] | null, lowerBounds: [number, number][]): void => {
		const [greyest] = lowerBounds;
		const colorful = lowerBounds[lowerBounds.length - 1];

		dict.set(name, {
			hueRange,
			lowerBounds,
			saturationRange: [greyest[0], colorful[0]],
			brightnessRange: [colorful[1], greyest[1]],
		});
	};

	defineColor('monochrome', null, [
		[0, 0],
		[100, 0],
	]);
	defineColor(
		'red',
		[-26, 18],
		[
			[20, 100],
			[30, 92],
			[40, 89],
			[50, 85],
			[60, 78],
			[70, 70],
			[80, 60],
			[90, 55],
			[100, 50],
		]
	);
	defineColor(
		'orange',
		[18, 46],
		[
			[20, 100],
			[30, 93],
			[40, 88],
			[50, 86],
			[60, 85],
			[70, 70],
			[100, 70],
		]
	);
	defineColor(
		'yellow',
		[46, 62],
		[
			[25, 100],
			[40, 94],
			[50, 89],
			[60, 86],
			[70, 84],
			[80, 82],
			[90, 80],
			[100, 75],
		]
	);
	defineColor(
		'green',
		[62, 178],
		[
			[30, 100],
			[40, 90],
			[50, 85],
			[60, 81],
			[70, 74],
			[80, 64],
			[90, 50],
			[100, 40],
		]
	);
	defineColor(
		'blue',
		[178, 257],
		[
			[20, 100],
			[30, 86],
			[40, 80],
			[50, 74],
			[60, 60],
			[70, 52],
			[80, 44],
			[90, 39],
			[100, 35],
		]
	);
	defineColor(
		'purple',
		[257, 282],
		[
			[20, 100],
			[30, 87],
			[40, 79],
			[50, 70],
			[60, 65],
			[70, 59],
			[80, 52],
			[90, 45],
			[100, 42],
		]
	);
	defineColor(
		'pink',
		[282, 334],
		[
			[20, 100],
			[30, 90],
			[40, 86],
			[60, 84],
			[80, 80],
			[90, 75],
			[100, 73],
		]
	);

	return dict;
}

function getColorInfo(hue: number): ColorInfo {
	hue = mod(hue, 360);
	if (hue >= 334) hue -= 360;

	for (const color of colorDictionary.values()) {
		if (color.hueRange && hue >= color.hueRange[0] && hue <= color.hueRange[1]) {
			return color;
		}
	}
	throw Error('Color hue value not found');
}
