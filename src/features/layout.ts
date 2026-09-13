import type { StyleSpecification } from '../types/index.js';
import type { ResolvedLayout } from '../options/index.js';

// Text/icon scaling and symbol spacing, applied to a finished style.
//
// Schema-neutral by construction: it walks symbol layers and rescales whatever `text-size`,
// `icon-size` and `symbol-spacing` they carry, without knowing which tileset produced them. Lifted out
// of `src/api/osm.ts` so a second schema's builder composes it rather than copying it
// (SCHEMA-SUPPORT-PLAN.md §6 — the statics and post-processing that are already neutral).

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

// MapLibre's default symbol-spacing (px) for line-placed symbols.
const DEFAULT_SYMBOL_SPACING = 250;

export function applyLayout(style: StyleSpecification, layout: ResolvedLayout) {
	const labelScale = layout.scale.labels;
	const iconScale = layout.scale.icons;
	const labelSpacing = layout.spacing.labels;
	const iconSpacing = layout.spacing.icons;
	if (labelScale === 1 && iconScale === 1 && labelSpacing === 1 && iconSpacing === 1) return;

	for (const layer of style.layers) {
		if (layer.type !== 'symbol') continue;
		const lyt = layer.layout as Record<string, unknown> | undefined;
		if (!lyt) continue;

		// A layer that renders text is a "label"; otherwise it is an "icon" (marking / POI glyph).
		const isLabel = lyt['text-field'] != null;

		// ── scale ──
		if (labelScale !== 1 && lyt['text-size'] != null) {
			lyt['text-size'] = scaleValue(lyt['text-size'], labelScale);
		}
		if (iconScale !== 1 && lyt['icon-image'] != null) {
			lyt['icon-size'] = lyt['icon-size'] == null ? iconScale : scaleValue(lyt['icon-size'], iconScale);
		}

		// ── spacing ── (only affects line-placed symbols; labels use the label factor, icons the icon one)
		const spacing = isLabel ? labelSpacing : iconSpacing;
		if (spacing !== 1) {
			const current = lyt['symbol-spacing'];
			if (current != null) {
				lyt['symbol-spacing'] = scaleValue(current, spacing);
			} else if (lyt['symbol-placement'] === 'line') {
				lyt['symbol-spacing'] = DEFAULT_SYMBOL_SPACING * spacing;
			}
		}
	}
}
