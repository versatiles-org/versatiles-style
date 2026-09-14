import type { StyleSpecification } from '../types/index.js';
import type { ResolvedLayout } from '../options/index.js';

// Text/icon scaling, symbol spacing and label pitch alignment, applied to a finished style.
//
// Schema-neutral by construction: it walks symbol layers and rescales whatever `text-size`,
// `icon-size`, `symbol-spacing` and collision padding they carry, without knowing which tileset
// produced them. Lifted out of `src/api/osm.ts` so a second schema's builder composes it rather than
// copying it (SCHEMA-SUPPORT-PLAN.md §6 — the statics and post-processing that are already neutral).

// ── Apply text/icon scale + spacing ───────────────────────────────────────────

// Multiply a size value (number or ['interpolate', …, z, v, …] ramp) in place by `factor`.
function scaleValue(value: unknown, factor: number): unknown {
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
const PADDING_PER_SPACING = 14;

export function applyLayout(style: StyleSpecification, layout: ResolvedLayout) {
	const labelScale = layout.scale.labels;
	const iconScale = layout.scale.icons;
	const labelSpacing = layout.spacing.labels;
	const iconSpacing = layout.spacing.icons;
	const pitchViewport = layout.pitchAlignment === 'viewport';
	if (labelScale === 1 && iconScale === 1 && labelSpacing === 1 && iconSpacing === 1 && !pitchViewport) return;

	for (const layer of style.layers) {
		if (layer.type !== 'symbol') continue;
		const lyt = layer.layout as Record<string, unknown> | undefined;
		if (!lyt) continue;

		const hasText = lyt['text-field'] != null;
		const hasIcon = lyt['icon-image'] != null;
		const isLine = lyt['symbol-placement'] === 'line';

		// ── scale ──
		if (labelScale !== 1 && lyt['text-size'] != null) {
			lyt['text-size'] = scaleValue(lyt['text-size'], labelScale);
		}
		if (iconScale !== 1 && hasIcon) {
			lyt['icon-size'] = lyt['icon-size'] == null ? iconScale : scaleValue(lyt['icon-size'], iconScale);
		}

		// ── spacing ──
		if (isLine) {
			// Along a line the exclusion is the distance between repeats. A layer that renders text is a
			// "label"; otherwise it is an "icon" (a marking).
			const spacing = hasText ? labelSpacing : iconSpacing;
			if (spacing !== 1) {
				const current = lyt['symbol-spacing'];
				lyt['symbol-spacing'] = current != null ? scaleValue(current, spacing) : DEFAULT_SYMBOL_SPACING * spacing;
			}
		} else {
			// At a point it is the collision padding, and a POI carries both: its name takes the label
			// factor, its icon the icon factor.
			if (labelSpacing !== 1 && hasText) {
				lyt['text-padding'] = padValue(
					lyt['text-padding'] ?? DEFAULT_PADDING,
					PADDING_PER_SPACING * (labelSpacing - 1)
				);
			}
			if (iconSpacing !== 1 && hasIcon) {
				lyt['icon-padding'] = padValue(lyt['icon-padding'] ?? DEFAULT_PADDING, PADDING_PER_SPACING * (iconSpacing - 1));
			}
		}

		// ── pitch alignment ── MapLibre's `auto` already lays line labels on the map, so `map` emits
		// nothing and leaves the style as it was.
		if (pitchViewport && isLine && hasText) {
			lyt['text-pitch-alignment'] = 'viewport';
		}
	}
}
