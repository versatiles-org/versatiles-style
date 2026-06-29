import type { TileJSONSpecification } from './tilejson.js';
import type { ColorsOptions } from './colors.js';
import type { LayerGroupOptions } from './layer-groups.js';
import type { Palette, SunOptions, SkyOptions, SpriteInput, SatelliteOptions } from './options.js';

export type ResolvedTheme = {
	palette: Palette;
	darkMode: boolean;
};

export type ResolvedUrls = {
	base: string;
	osm: string | TileJSONSpecification;
	elevation: string | TileJSONSpecification;
	glyphsPattern: string;
	sprite: SpriteInput;
};

export type ResolvedSatelliteUrls = ResolvedUrls & {
	satellite: string | TileJSONSpecification;
};

export type ResolvedFeatures = {
	terrain: false | { exaggeration: number };
	hillshade:
		| false
		| {
				exaggeration: number;
				shadowColor: string;
				highlightColor: string;
				accentColor: string;
				anchor: 'map' | 'viewport';
		  };
	landcover: boolean;
	buildings: 'flat' | 'extruded';
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
	features: ResolvedFeatures;
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
	features: Pick<ResolvedFeatures, 'terrain' | 'hillshade'>;
	sun: ResolvedSun;
	sky: ResolvedSky;
	osmOverlay: false | ResolvedOsmOptions;
	raster: Required<NonNullable<SatelliteOptions['raster']>>;
};
