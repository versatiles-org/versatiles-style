import type { ThemeOptions, ResolvedTheme } from './theme.js';
import { resolveTheme } from './theme.js';
import type { ColorsOptions, ResolvedColors } from './colors.js';
import { resolveColors } from './colors.js';
import type { RecolorOptions, ResolvedRecolor } from './recolor.js';
import { resolveRecolor } from './recolor.js';
import type { TextOptions, ResolvedText } from './text.js';
import { resolveText } from './text.js';
import type { LayoutOptions, ResolvedLayout } from './layout.js';
import { resolveLayout } from './layout.js';
import { resolveLayerGroups, type LayerGroupOptions, type ResolvedLayerGroups } from './layer-groups.js';

export type OsmOverlayOptions = {
	theme?: ThemeOptions;
	layers?: LayerGroupOptions;
	text?: TextOptions;
	layout?: LayoutOptions;
	colors?: ColorsOptions;
	recolor?: RecolorOptions;
};

export type ResolvedOsmOverlay = {
	theme: ResolvedTheme;
	layers: ResolvedLayerGroups;
	text: ResolvedText;
	layout: ResolvedLayout;
	colors: ResolvedColors;
	recolor: ResolvedRecolor;
};

export function resolveOsmOverlay(content: OsmOverlayOptions): ResolvedOsmOverlay {
	const theme = resolveTheme(content.theme);
	return {
		theme,
		layers: resolveLayerGroups(content.layers),
		text: resolveText(content.text),
		layout: resolveLayout(content.layout),
		colors: resolveColors(theme, content.colors),
		recolor: resolveRecolor(content.recolor),
	};
}
