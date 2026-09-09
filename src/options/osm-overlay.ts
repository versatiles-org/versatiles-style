import {
	resolveColors,
	resolveLayerGroups,
	resolveLayout,
	resolveRecolor,
	resolveText,
	resolveTheme,
	type ColorsOptions,
	type LayerGroupOptions,
	type LayoutOptions,
	type Palette,
	type RecolorOptions,
	type ResolvedColors,
	type ResolvedLayerGroups,
	type ResolvedLayout,
	type ResolvedRecolor,
	type ResolvedText,
	type ResolvedTheme,
	type TextOptions,
	type ThemeOptions,
} from './parts.js';

export type OsmOverlayOptions = {
	theme?: ThemeOptions;
	layers?: boolean | number | LayerGroupOptions;
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

export function resolveOsmOverlay(content: OsmOverlayOptions, defaultPalette?: Palette): ResolvedOsmOverlay {
	const theme = resolveTheme(content.theme, defaultPalette);
	return {
		theme,
		layers: resolveLayerGroups(content.layers),
		text: resolveText(content.text),
		layout: resolveLayout(content.layout),
		colors: resolveColors(theme, content.colors),
		recolor: resolveRecolor(content.recolor),
	};
}
