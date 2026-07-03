import type { Palette, ResolvedTheme } from './theme.js';
import { resolveTheme } from './theme.js';
import type { ColorsOptions, ResolvedColors } from './colors.js';
import { resolveColors } from './colors.js';
import type { RecolorOptions, ResolvedRecolorOptions } from './recolor.js';
import { resolveRecolor } from './recolor.js';
import type { TextOptions, ResolvedText } from './text.js';
import { resolveText } from './text.js';
import type { LayoutOptions, ResolvedLayout } from './layout.js';
import { resolveLayout } from './layout.js';
import { resolveLayerGroups, type LayerGroupOptions, type ResolvedLayerGroupOptions } from './layer-groups.js';

export type OsmOverlayOptions = {
	theme?:
	| Palette
	| {
		darkMode?: boolean | 'auto';
		palette?: Palette;
	};
	layers?: LayerGroupOptions;
	text?: TextOptions;
	layout?: LayoutOptions;
	colors?: ColorsOptions;
	recolor?: RecolorOptions;
};

export type ResolvedOsmOverlayOptions = {
	theme: ResolvedTheme;
	layers: ResolvedLayerGroupOptions;
	text: ResolvedText;
	layout: ResolvedLayout;
	colors: ResolvedColors;
	recolor: ResolvedRecolorOptions;
};

export function resolveOsmOverlayOptions(content: OsmOverlayOptions): ResolvedOsmOverlayOptions {
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
