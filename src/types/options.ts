import type { TileJSONSpecification } from './tilejson.js';
import type { ColorsOptions, RecolorOptions } from './colors.js';
import type { LayerGroupOptions } from './layer-groups.js';

export type Palette = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

/** A `fetch`-compatible function, used to download TileJSON documents. */
export type FetchLike = typeof fetch;

export type TextOptions = {
	language?: string;
	languageStrict?: boolean;
	fontNormal?: string;
	fontBold?: string;
};

export type LayoutOptions = {
	scale?: number | { labels?: number; icons?: number };
	spacing?: number | { labels?: number; icons?: number };
};

export type SunOptions = {
	direction?: number;
	altitude?: number;
	color?: string;
	intensity?: number;
};

export type SkyOptions = {
	skyColor?: string;
	horizonColor?: string;
	skyHorizonBlend?: number;
	horizonFogBlend?: number;
	atmosphereBlend?: number;
};

export type HillshadeOptions =
	| boolean
	| {
			exaggeration?: number;
			shadowColor?: string;
			highlightColor?: string;
			accentColor?: string;
			anchor?: 'map' | 'viewport';
	  };

export type SpriteEntry = { id: string; url: string };
export type SpriteInput = string | SpriteEntry[];

export type OsmContentOptions = {
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

export type OsmOptions = OsmContentOptions & {
	urls?: {
		base?: string;
		osm?: string | TileJSONSpecification;
		elevation?: string | TileJSONSpecification;
		glyphsPattern?: string;
		sprite?: SpriteInput;
		/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
		fetch?: FetchLike;
	};
	features?: {
		terrain?: boolean | { exaggeration?: number };
		hillshade?: HillshadeOptions;
		landcover?: boolean;
		buildings?: 'flat' | 'extruded';
	};
	sun?: SunOptions;
	sky?: SkyOptions;
};

export type SatelliteOptions = {
	urls?: {
		base?: string;
		satellite?: string | TileJSONSpecification;
		osm?: string | TileJSONSpecification;
		elevation?: string | TileJSONSpecification;
		glyphsPattern?: string;
		sprite?: SpriteInput;
		/** Custom `fetch` used to download any TileJSON sources. Defaults to the global `fetch`. */
		fetch?: FetchLike;
	};
	osmOverlay?: false | OsmContentOptions;
	raster?: {
		opacity?: number;
		hueRotate?: number;
		brightnessMin?: number;
		brightnessMax?: number;
		saturation?: number;
		contrast?: number;
	};
	features?: {
		terrain?: boolean | { exaggeration?: number };
		hillshade?: HillshadeOptions;
	};
	sun?: SunOptions;
	sky?: SkyOptions;
};
