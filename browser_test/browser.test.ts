
import type { SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import * as V from '../release/versatiles-style.js';
import type { LanguageSuffix } from '../src/lib/types.js';

type Builder = typeof V.Colorful | typeof V.Neutrino;
type Style = V.Colorful | V.Neutrino;

interface StyleTestConfig {
	name: string;
	builder: Builder;
	labelLayers?: RegExp;
}

[
	{ name: 'Colorful', builder: V.Colorful, labelLayers: /^label-(street|place|boundary|transit)-/ },
	{ name: 'Graybeard', builder: V.Graybeard, labelLayers: /^label-(street|place|boundary|transit)-/ },
	{ name: 'Neutrino', builder: V.Neutrino },
].forEach(config => {
	test(config);
});

function test(config: StyleTestConfig): void {

	describe('Style: ' + config.name, () => {
		let style: Style;
		beforeEach(() => style = new config.builder());

		it('should be buildable', () => {
			expect(style.build()).toBeTruthy();
		});

		if (config.labelLayers) {
			it('should use correct language suffix', () => {
				(['', '_de', '_en'] as LanguageSuffix[]).forEach(langSuffix => {
					style.languageSuffix = langSuffix;
					const textLayers = style.build().layers
						.filter(l => config.labelLayers?.test(l.id))
						.filter(l => l.type === 'symbol') as SymbolLayerSpecification[];
					const layersTextFields = textLayers.map(l => l.layout?.['text-field'] as unknown);
					expect(layersTextFields)
						.toMatchObject(layersTextFields.slice().fill(`{name${langSuffix}}`));
				});
			});
		}
	});
}
