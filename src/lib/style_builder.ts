import type StyleDefinition from './style_definition.js';
import type { MaplibreStyle, StyleBuilderOptions } from './types.js';

export class StyleBuilder {
	readonly #definition: StyleDefinition;

	public constructor(definition: StyleDefinition) {
		this.#definition = definition;
	}

	public get name(): string {
		return this.#definition.name;
	}

	public get defaultOptions(): StyleBuilderOptions {
		return this.#definition.getOptions();
	}

	public build(options?: StyleBuilderOptions): MaplibreStyle {
		options ??= {};
		if (options.baseUrl === undefined) {
			try {
				// @ts-expect-error: I'm not sure if I'm in a browser
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				options.baseUrl = document.location.href as string;
			} catch (e) { }
		}
		if (!Boolean(options.baseUrl)) throw Error('baseUrl is required, e.g.: style.build({ baseUrl: "https://example.com" });');
		return this.#definition.build(options);
	}
}
