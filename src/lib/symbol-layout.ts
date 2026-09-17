// Scaling sizes and spacing of symbol layers — shared by the label typography (`applyText`) and the
// icon options (`applyIcon`), which split one layer's text and icon between them.

// Multiply a size value (number or ['interpolate', …, z, v, …] ramp) in place by `factor`.
export function scaleValue(value: unknown, factor: number): unknown {
	if (typeof value === 'number') return value * factor;
	if (Array.isArray(value) && value[0] === 'interpolate') {
		for (let i = 4; i < value.length; i += 2) {
			if (typeof value[i] === 'number') (value as unknown[])[i] = (value[i] as number) * factor;
		}
		return value;
	}
	return value;
}

// Add `delta` to a padding value, clamped at 0 — a number, a `padding` array of one to four sides, or
// an interpolate ramp of either. Anything else (a data expression) is returned unchanged.
function padValue(value: unknown, delta: number): unknown {
	const pad = (v: number) => Math.max(0, v + delta);
	if (typeof value === 'number') return pad(value);
	if (Array.isArray(value) && value.every((v) => typeof v === 'number')) return value.map(pad);
	if (Array.isArray(value) && value[0] === 'interpolate') {
		for (let i = 4; i < value.length; i += 2) (value as unknown[])[i] = padValue(value[i], delta);
		return value;
	}
	return value;
}

// MapLibre's default symbol-spacing (px) for line-placed symbols.
const DEFAULT_SYMBOL_SPACING = 250;

// MapLibre's default `text-padding` and `icon-padding` (px).
const DEFAULT_PADDING = 2;

// Collision padding (px) added to point symbols per unit of `spacing` above 1. `symbol-spacing` only
// exists for line placement, so for places, POIs and house numbers the exclusion radius is the
// padding. Multiplying MapLibre's 2 px default would do next to nothing, so the factor adds a fixed
// amount instead. Measured by rendering the labels and icons alone and counting their pixels, as a
// share of the default (Shortbread, berlin z10/z14/z16, london z15, tokyo z16):
//
//   padding  4 px → 88–100 %   8 px → 73–93 %   16 px → 55–88 %   32 px → 31–80 %
//
// 14 px per step puts `spacing: 2` at 16 px and `spacing: 3` at 30 px — a visible thinning, where the
// effect of doubling the default could not be told from noise.
export const PADDING_PER_SPACING = 14;

/** Multiply a line-placed symbol layer's `symbol-spacing`, in place. */
export function scaleSymbolSpacing(layout: Record<string, unknown>, spacing: number): void {
	if (spacing === 1) return;
	const current = layout['symbol-spacing'];
	layout['symbol-spacing'] = current != null ? scaleValue(current, spacing) : DEFAULT_SYMBOL_SPACING * spacing;
}

/** Widen a point symbol's `text-padding` or `icon-padding` by `spacing`, in place. */
export function padForSpacing(
	layout: Record<string, unknown>,
	key: 'text-padding' | 'icon-padding',
	spacing: number
): void {
	if (spacing === 1) return;
	layout[key] = padValue(layout[key] ?? DEFAULT_PADDING, PADDING_PER_SPACING * (spacing - 1));
}
