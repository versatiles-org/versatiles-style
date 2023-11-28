
import type { SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import * as V from '../release/versatiles-style.js';
import type { LanguageSuffix, MaplibreStyle, StylemakerOptions } from '../src/lib/types.js';
import type Colorful from '../src/style/colorful.js';
import type StyleBuilder from '../src/lib/style_builder.js';
import type Graybeard from '../src/style/graybeard.ts';
import type Neutrino from '../src/style/neutrino.ts';

type Builder<T extends StyleBuilder<T>> = (options?: StylemakerOptions<T>) => MaplibreStyle;
type GenericBuilder = Builder<Colorful> | Builder<Graybeard> | Builder<Neutrino>;

test('Colorful', V.colorful, /^label-(street|place|boundary|transit)-/);
test('Graybeard', V.graybeard, /^label-(street|place|boundary|transit)-/);
test('Neutrino', V.neutrino);

function test(name: string, build: GenericBuilder, labelLayers?: RegExp): void {

	describe('Style: ' + name, () => {
		it('should be buildable', () => {
			expect(build()).toBeTruthy();
		});

		if (labelLayers) {
			it('should use correct language suffix', () => {
				(['', '_de', '_en'] as LanguageSuffix[]).forEach(languageSuffix => {
					const textLayers = build({ languageSuffix }).layers
						.filter(l => labelLayers.test(l.id))
						.filter(l => l.type === 'symbol') as SymbolLayerSpecification[];
					const layersTextFields = textLayers.map(l => l.layout?.['text-field'] as unknown);
					expect(layersTextFields)
						.toMatchObject(layersTextFields.slice().fill(`{name${languageSuffix}}`));
				});
			});
		}
	});
}
