import type { LanguageSuffix, RecolorOptions, StyleBuilderOptions, StylemakerStringLookup } from './types.js';
import { getDefaultRecolorFlags } from './recolor.js';
import { deepClone } from './utils.js';



export class Configuration {
	readonly #baseUrl: string;

	readonly #glyphsUrl: string;

	readonly #spriteUrl: string;

	readonly #tilesUrls: string[];

	readonly #hideLabels: boolean;

	readonly #languageSuffix: LanguageSuffix;

	readonly #colors: StylemakerStringLookup;

	readonly #fonts: StylemakerStringLookup;

	readonly #recolor: RecolorOptions;

	public constructor(config?: StyleBuilderOptions) {
		this.#hideLabels = config?.hideLabels ?? false;
		this.#languageSuffix = config?.languageSuffix ?? '';
		this.#baseUrl = config?.baseUrl ?? 'https://tiles.versatiles.org'; // set me in the browser
		this.#glyphsUrl = config?.glyphsUrl ?? '/assets/fonts/{fontstack}/{range}.pbf';
		this.#spriteUrl = config?.spriteUrl ?? '/assets/sprites/sprites';
		this.#tilesUrls = config?.tilesUrls ?? ['/tiles/osm/{z}/{x}/{y}'];
		this.#colors = config?.colors ?? {};
		this.#fonts = config?.fonts ?? {};
		this.#recolor = config?.recolor ?? getDefaultRecolorFlags();
	}

	public get hideLabels(): boolean {
		return this.#hideLabels;
	}

	public get languageSuffix(): LanguageSuffix {
		return this.#languageSuffix;
	}

	public get baseUrl(): string {
		return this.#baseUrl;
	}

	public get glyphsUrl(): string {
		return this.#glyphsUrl;
	}

	public get spriteUrl(): string {
		return this.#spriteUrl;
	}

	public get tilesUrls(): string[] {
		return deepClone(this.#tilesUrls);
	}

	public get fonts(): StylemakerStringLookup {
		return deepClone(this.#fonts);
	}

	public get colors(): StylemakerStringLookup {
		return deepClone(this.#colors);
	}

	public get recolor(): RecolorOptions {
		return deepClone(this.#recolor);
	}

	public setFonts(fonts: Record<string, string>): void {
		Object.assign(this.#fonts, fonts);
	}

	public setColors(newColors: Record<string, string>): void {
		for (const [name, color] of Object.entries(newColors)) {
			this.#colors[name] = color;
		}
	}

	public getOptions(): StyleBuilderOptions {
		return {
			baseUrl: this.#baseUrl,
			glyphsUrl: this.#glyphsUrl,
			spriteUrl: this.#spriteUrl,
			tilesUrls: this.#tilesUrls,
			hideLabels: this.#hideLabels,
			languageSuffix: this.#languageSuffix,
			colors: deepClone(this.#colors),
			fonts: deepClone(this.#fonts),
			recolor: deepClone(this.#recolor),
		};
	}

	public buildNew(options: StyleBuilderOptions): Configuration {
		const o = options;

		if (typeof o.languageSuffix === 'string') {
			if (!/^(|_de|_en)$/.test(o.languageSuffix)) {
				throw Error('language must be "", "de" or "en"');
			}
		}

		const colors = Object.fromEntries(Object.entries(this.#colors)
			.map(([name, color]: readonly [string, string]) => [name, o.colors?.[name] ?? color]),
		);

		const fonts = Object.fromEntries(Object.entries(this.#fonts)
			.map(([name, font]: readonly [string, string]) => [name, o.fonts?.[name] ?? font]),
		);

		const recolor: RecolorOptions = {
			invert: o.recolor?.invert ?? this.#recolor.invert,
			rotate: o.recolor?.rotate ?? this.#recolor.rotate,
			saturate: o.recolor?.saturate ?? this.#recolor.saturate,
			gamma: o.recolor?.gamma ?? this.#recolor.gamma,
			contrast: o.recolor?.contrast ?? this.#recolor.contrast,
			brightness: o.recolor?.brightness ?? this.#recolor.brightness,
			tint: o.recolor?.tint ?? this.#recolor.tint,
			tintColor: o.recolor?.tintColor ?? this.#recolor.tintColor,
		};

		return new Configuration({
			baseUrl: o.baseUrl ?? this.#baseUrl,
			glyphsUrl: o.glyphsUrl ?? this.#glyphsUrl,
			spriteUrl: o.spriteUrl ?? this.#spriteUrl,
			tilesUrls: o.tilesUrls ?? this.#tilesUrls,
			hideLabels: o.hideLabels ?? this.#hideLabels,
			languageSuffix: o.languageSuffix ?? this.#languageSuffix,
			colors,
			fonts,
			recolor,
		});
	}
}
