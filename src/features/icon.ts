import type { StyleSpecification } from '../types/index.js';
import type { ResolvedIcon } from '../options/index.js';
import { padForSpacing, scaleSymbolSpacing, scaleValue } from '../lib/symbol-layout.js';

// Icon scale and spacing, applied to a finished style. The text half of a symbol layer — its size,
// spacing and pitch alignment — belongs to the text options and is set per topic (`applyText`).
//
// Schema-neutral by construction: it walks symbol layers and rescales whatever `icon-size`,
// `symbol-spacing` and `icon-padding` they carry, without knowing which tileset produced them.
export function applyIcon(style: StyleSpecification, icon: ResolvedIcon) {
	if (icon.scale === 1 && icon.spacing === 1) return;

	for (const layer of style.layers) {
		if (layer.type !== 'symbol') continue;
		const lyt = layer.layout as Record<string, unknown> | undefined;
		if (!lyt) continue;
		const hasText = lyt['text-field'] != null;
		const hasIcon = lyt['icon-image'] != null;

		if (icon.scale !== 1 && hasIcon) {
			lyt['icon-size'] = lyt['icon-size'] == null ? icon.scale : scaleValue(lyt['icon-size'], icon.scale);
		}

		if (lyt['symbol-placement'] === 'line') {
			// Along a line the exclusion is the distance between repeats. A layer that renders text keeps
			// the text's spacing; only a marking without text takes the icon's.
			if (!hasText) scaleSymbolSpacing(lyt, icon.spacing);
		} else if (hasIcon) {
			// At a point it is the collision padding, and a POI carries both: its name takes the text
			// spacing, its icon this one.
			padForSpacing(lyt, 'icon-padding', icon.spacing);
		}
	}
}
