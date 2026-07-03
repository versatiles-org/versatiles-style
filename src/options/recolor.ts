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

export function resolveRecolor(recolor?: RecolorOptions): ResolvedRecolor {
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
