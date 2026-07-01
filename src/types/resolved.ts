import type { ColorsOptions } from './colors.js';
import type { LayerGroupOptions } from './layer-groups.js';
import type { FetchLike, Palette, SunOptions, SkyOptions, SpriteInput, SatelliteOptions } from './options.js';

export type ResolvedTheme = {
	palette: Palette;
	darkMode: boolean;
};

export type ResolvedUrls = {
	osm: string;
	elevation: string;
	glyphsPattern: string;
	sprite: SpriteInput;
	/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

export type ResolvedHillshade =
	| false
	| {
			exaggeration: number;
			shadowColor: string;
			highlightColor: string;
			accentColor: string;
			anchor: 'map' | 'viewport';
	  };

export type ResolvedSatelliteUrls = ResolvedUrls & {
	satellite: string;
};

export type ResolvedOsmFeatures = {
	terrain: false | { exaggeration: number };
	hillshade: ResolvedHillshade;
	landcover: boolean;
	buildings: 'flat' | 'extruded';
};

export type ResolvedSatelliteFeatures = {
	terrain: false | { exaggeration: number };
	hillshade: ResolvedHillshade;
};

export type ResolvedText = {
	language: string;
	languageStrict: boolean;
	fontNormal: string;
	fontBold: string;
};

export type ResolvedLayout = {
	labels: { scale: number; spacing: number };
	icons: { scale: number; spacing: number };
};

export type ResolvedSun = Required<SunOptions>;
export type ResolvedSky = Required<SkyOptions>;

export type ResolvedRecolorOptions = {
	invertBrightness: boolean;
	rotateHue: number;
	saturate: number;
	tint: { color: string; amount: number };
	gamma: number;
	contrast: number;
	brightness: number;
	blend: { color: string; amount: number };
};

export type ResolvedOsmOptions = {
	urls: ResolvedUrls;
	features: ResolvedOsmFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	theme: ResolvedTheme;
	layers: LayerGroupOptions;
	text: ResolvedText;
	layout: ResolvedLayout;
	colors: Required<ColorsOptions>;
	recolor: ResolvedRecolorOptions;
};

export type ResolvedSatelliteOptions = {
	urls: ResolvedSatelliteUrls;
	features: Pick<ResolvedOsmFeatures, 'terrain' | 'hillshade'>;
	sun: ResolvedSun;
	sky: ResolvedSky;
	osmOverlay: false | ResolvedOsmOptions;
	raster: Required<NonNullable<SatelliteOptions['raster']>>;
};
