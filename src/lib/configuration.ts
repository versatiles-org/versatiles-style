import Color from 'color';
import { ColorTransformerFlags, LanguageSuffix, StylemakerColorLookup, StylemakerFontLookup, StylemakerOptions } from './types.js';
import { getDefaultColorTransformer } from './color_transformer.js';


export type StylemakerConfiguration = {
	baseUrl: string,
	glyphsUrl: string,
	spriteUrl: string,
	tilesUrls: string[],
	hideLabels: boolean,
	languageSuffix: LanguageSuffix,
	colors: StylemakerColorLookup,
	fonts: StylemakerFontLookup,
	colorTransformer: ColorTransformerFlags,
}


export class Configuration {
	#config: StylemakerConfiguration
	constructor(config?: StylemakerConfiguration) {
		this.#config = config ?? {
			hideLabels: false,
			languageSuffix: '',
			baseUrl: 'https://tiles.versatiles.org', // set me in the browser
			glyphsUrl: '/assets/fonts/{fontstack}/{range}.pbf',
			spriteUrl: '/assets/sprites/sprites',
			tilesUrls: ['/tiles/osm/{z}/{x}/{y}'],
			colors: {},
			fonts: {},
			colorTransformer: getDefaultColorTransformer(),
		}
	}

	get hideLabels(): boolean {
		return this.#config.hideLabels
	}
	get languageSuffix(): LanguageSuffix {
		return this.#config.languageSuffix
	}
	get baseUrl(): string {
		return this.#config.baseUrl
	}
	get glyphsUrl(): string {
		return this.#config.glyphsUrl
	}
	get spriteUrl(): string {
		return this.#config.spriteUrl
	}
	get tilesUrls(): string[] {
		return this.#config.tilesUrls
	}
	get fonts(): StylemakerFontLookup {
		return this.#config.fonts
	}
	get colors(): StylemakerColorLookup {
		return this.#config.colors
	}
	get colorTransformer(): ColorTransformerFlags {
		return this.#config.colorTransformer
	}

	setFonts(fonts: { [name: string]: string }) {
		Object.assign(this.#config.fonts ??= {}, fonts);
	}
	setColors(colors: { [name: string]: string | Color }) {
		const oldColors: StylemakerColorLookup = this.#config.colors ??= {};
		Object.entries(colors).forEach(([name, color]) => {
			if (typeof color === 'string') {
				oldColors[name] = Color(color);
			} else {
				oldColors[name] = color;
			}
		})
	}

	buildNew(options: StylemakerOptions): Configuration {
		const c = this.#config;
		const o = options;

		if (typeof o.languageSuffix === 'string') {
			if (!/^(|_de|_en)$/.test(o.languageSuffix)) {
				throw Error('language must be "", "de" or "en"');
			}
		}

		const colors = Object.fromEntries(Object.entries(c.colors).map(([name, color]) => {
			if (o.colors?.[name]) color = Color(o.colors[name]);
			return [name, color];
		}))

		const fonts = Object.fromEntries(Object.entries(c.fonts).map(([name, font]) => {
			if (o.fonts?.[name]) font = o.fonts[name];
			return [name, font];
		}))

		const colorTransformer: ColorTransformerFlags = {
			invert: o.colorTransformer?.invert ?? c.colorTransformer.invert,
			rotate: o.colorTransformer?.rotate ?? c.colorTransformer.rotate,
			saturate: o.colorTransformer?.saturate ?? c.colorTransformer.saturate,
			gamma: o.colorTransformer?.gamma ?? c.colorTransformer.gamma,
			contrast: o.colorTransformer?.contrast ?? c.colorTransformer.contrast,
			brightness: o.colorTransformer?.brightness ?? c.colorTransformer.brightness,
			tint: o.colorTransformer?.tint ?? c.colorTransformer.tint,
			tintColor: o.colorTransformer?.tintColor ? Color(o.colorTransformer?.tintColor) : c.colorTransformer.tintColor,
		}

		return new Configuration({
			baseUrl: o.baseUrl ?? c.baseUrl,
			glyphsUrl: o.glyphsUrl ?? c.glyphsUrl,
			spriteUrl: o.spriteUrl ?? c.spriteUrl,
			tilesUrls: o.tilesUrls ?? c.tilesUrls,
			hideLabels: o.hideLabels ?? c.hideLabels,
			languageSuffix: o.languageSuffix ?? c.languageSuffix,
			colors,
			fonts,
			colorTransformer,
		})
	}

	getOptions(): StylemakerOptions {
		let c = this.#config;

		const colors = Object.fromEntries(Object.entries(c.colors).map(([name, color]) => [name, color.hexa()]))
		const fonts = Object.fromEntries(Object.entries(c.fonts).map(([name, font]) => [name, String(font)]))

		const ct = c.colorTransformer;
		const colorTransformer = {
			invert: ct.invert,
			rotate: ct.rotate,
			saturate: ct.saturate,
			gamma: ct.gamma,
			contrast: ct.contrast,
			brightness: ct.brightness,
			tint: ct.tint,
			tintColor: ct.tintColor.hexa(),
		}

		return {
			baseUrl: c.baseUrl,
			glyphsUrl: c.glyphsUrl,
			spriteUrl: c.spriteUrl,
			tilesUrls: c.tilesUrls,
			hideLabels: c.hideLabels,
			languageSuffix: c.languageSuffix,
			colors,
			fonts,
			colorTransformer,
		}
	}
}

export function buildConfiguration(config: StylemakerConfiguration, options: StylemakerOptions) {
}
