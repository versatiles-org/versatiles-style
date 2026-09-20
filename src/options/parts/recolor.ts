import { checkKeys, checkFinite } from './keys.js';
import { checkColors } from './color-check.js';
export type RecolorOptions = {
	invertBrightness?: boolean;
	rotateHue?: number;
	saturate?: number;
	tint?: { color?: string; amount?: number };
	gamma?: number;
	contrast?: number;
	brightness?: number;
	blend?: { color?: string; amount?: number };
};

export type ResolvedRecolor = {
	invertBrightness: boolean;
	rotateHue: number;
	saturate: number;
	tint: { color: string; amount: number };
	gamma: number;
	contrast: number;
	brightness: number;
	blend: { color: string; amount: number };
};

export function resolveRecolor(recolor?: RecolorOptions, path = 'recolor'): ResolvedRecolor {
	checkKeys(
		recolor,
		{
			invertBrightness: true,
			rotateHue: true,
			saturate: true,
			brightness: true,
			contrast: true,
			gamma: true,
			tint: true,
			blend: true,
		},
		path
	);
	checkKeys(recolor?.tint, { color: true, amount: true }, `${path}.tint`);
	checkKeys(recolor?.blend, { color: true, amount: true }, `${path}.blend`);
	// Walks the whole subtree, so `tint.amount` and `blend.amount` are covered with it. Without this,
	// an empty form field reaching `parseFloat` put NaN into the colour transforms, where `clamp` maps
	// it to the *minimum*: `brightness` rendered the map black, `gamma` white, `contrast` mid-grey.
	checkFinite(recolor, path);
	checkColors(recolor?.tint, ['color'], `${path}.tint`);
	checkColors(recolor?.blend, ['color'], `${path}.blend`);
	return {
		invertBrightness: recolor?.invertBrightness ?? false,
		rotateHue: recolor?.rotateHue ?? 0,
		saturate: recolor?.saturate ?? 0,
		brightness: recolor?.brightness ?? 0,
		contrast: recolor?.contrast ?? 1,
		gamma: recolor?.gamma ?? 1,
		tint: { color: recolor?.tint?.color ?? '#ff0000', amount: recolor?.tint ? (recolor?.tint?.amount ?? 0.5) : 0 },
		blend: { color: recolor?.blend?.color ?? '#ff0000', amount: recolor?.blend ? (recolor?.blend?.amount ?? 0.5) : 0 },
	};
}
