import Color from 'color';
import { LanguageSuffix, RecolorOptions, StylebuilderOptions, StylemakerStringLookup } from './types.js';
import { getDefaultRecolorFlags } from './recolor.js';
import { deepClone } from './utils.js';

export type StylemakerConfiguration = {
	baseUrl: string,
	glyphsUrl: string,
	spriteUrl: string,
	tilesUrls: string[],
	hideLabels: boolean,
	languageSuffix: LanguageSuffix,
	colors: StylemakerStringLookup,
	fonts: StylemakerStringLookup,
	recolor: RecolorOptions,
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
			recolor: getDefaultRecolorFlags(),
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
		return deepClone(this.#config.tilesUrls)
	}
	get fonts(): StylemakerStringLookup {
		return deepClone(this.#config.fonts)
	}
	get colors(): StylemakerStringLookup {
		return deepClone(this.#config.colors)
	}
	get recolor(): RecolorOptions {
		return deepClone(this.#config.recolor)
	}

	setFonts(fonts: { [name: string]: string }) {
		Object.assign(this.#config.fonts ??= {}, fonts);
	}
	setColors(newColors: { [name: string]: string }) {
		const oldColors: StylemakerStringLookup = this.#config.colors ??= {};
		Object.entries(newColors).forEach(([name, color]) => oldColors[name] = color)
	}

	buildNew(options: StylebuilderOptions): Configuration {
		const c = this.#config;
		const o = options;

		if (typeof o.languageSuffix === 'string') {
			if (!/^(|_de|_en)$/.test(o.languageSuffix)) {
				throw Error('language must be "", "de" or "en"');
			}
		}

		const colors = Object.fromEntries(Object.entries(c.colors)
			.map(([name, color]) => [name, o.colors?.[name] ?? color])
		)

		const fonts = Object.fromEntries(Object.entries(c.fonts)
			.map(([name, font]) => [name, o.fonts?.[name] ?? font])
		)

		const recolor: RecolorOptions = {
			invert: o.recolor?.invert ?? c.recolor.invert,
			rotate: o.recolor?.rotate ?? c.recolor.rotate,
			saturate: o.recolor?.saturate ?? c.recolor.saturate,
			gamma: o.recolor?.gamma ?? c.recolor.gamma,
			contrast: o.recolor?.contrast ?? c.recolor.contrast,
			brightness: o.recolor?.brightness ?? c.recolor.brightness,
			tint: o.recolor?.tint ?? c.recolor.tint,
			tintColor: o.recolor?.tintColor ?? c.recolor.tintColor,
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
			recolor,
		})
	}

	getOptions(): StylebuilderOptions {
		let c = this.#config;
		return {
			baseUrl: c.baseUrl,
			glyphsUrl: c.glyphsUrl,
			spriteUrl: c.spriteUrl,
			tilesUrls: c.tilesUrls,
			hideLabels: c.hideLabels,
			languageSuffix: c.languageSuffix,
			colors: deepClone(c.colors),
			fonts: deepClone(c.fonts),
			recolor: deepClone(c.recolor)
		}
	}
}
