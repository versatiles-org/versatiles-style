import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colorful, eclipse, empty, graybeard, neutrino, shadow } from './index.js';
import { buildSatelliteStyle as satellite } from './satellite.js';

export interface StyleVariant {
	name: string;
	build: () => StyleSpecification | Promise<StyleSpecification>;
}

export function getStyleVariants(): StyleVariant[] {
	const variants: StyleVariant[] = [];

	for (const { name, builder } of [
		{ name: 'colorful', builder: colorful },
		{ name: 'eclipse', builder: eclipse },
		{ name: 'empty', builder: empty },
		{ name: 'graybeard', builder: graybeard },
		{ name: 'neutrino', builder: neutrino },
		{ name: 'shadow', builder: shadow },
	]) {
		variants.push({ name: name + '/style', build: () => builder({ language: undefined }) });
		if (name === 'empty') continue;
		variants.push({ name: name + '/en', build: () => builder({ language: 'en' }) });
		variants.push({ name: name + '/de', build: () => builder({ language: 'de' }) });
		variants.push({ name: name + '/nolabel', build: () => builder({ hideLabels: true }) });
	}

	variants.push({ name: 'satellite/style', build: () => satellite({ language: undefined }) });
	variants.push({ name: 'satellite/en', build: () => satellite({ language: 'en' }) });
	variants.push({ name: 'satellite/de', build: () => satellite({ language: 'de' }) });
	variants.push({ name: 'satellite/nooverlay', build: () => satellite({ overlay: false }) });

	const terrain = { terrain: true, hillshade: true } as const;
	variants.push({ name: 'terrain/style', build: () => satellite({ ...terrain, language: undefined }) });
	variants.push({ name: 'terrain/en', build: () => satellite({ ...terrain, language: 'en' }) });
	variants.push({ name: 'terrain/de', build: () => satellite({ ...terrain, language: 'de' }) });
	variants.push({ name: 'terrain/nooverlay', build: () => satellite({ ...terrain, overlay: false }) });

	return variants;
}
