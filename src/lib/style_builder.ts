import StyleDefinition from './style_definition.js';
import { MaplibreStyle, StylebuilderOptions } from './types.js';

export class StyleBuilder {
	#definition: StyleDefinition
	constructor(definition: StyleDefinition) {
		this.#definition = definition;
	}
	get name(): string {
		return this.#definition.name;
	}
	get defaultOptions(): StylebuilderOptions {
		return this.#definition.getOptions();
	}
	build(options?: StylebuilderOptions): MaplibreStyle {
		options ??= {};
		// @ts-ignore
		options.baseUrl ??= global?.document?.location?.href as string;
		if (!options.baseUrl) throw Error('baseUrl is required, e.g.: style.build({ baseUrl: "https://example.com" });');
		return this.#definition.build(options);
	}
}
