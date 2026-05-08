import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colorful, eclipse, empty, graybeard, neutrino, shadow } from './index.js';
import { buildSatelliteStyle as satellite } from './satellite.js';

export interface StyleVariant {
	name: string;
	build: () => StyleSpecification | Promise<StyleSpecification>;
}

export function getStyleVariants(): StyleVariant[] {
	const variants: StyleVariant[] = [];

	const terrainOpts = { terrain: true, hillshade: true } as const;

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
		variants.push({ name: name + '-terrain/style', build: () => builder({ ...terrainOpts, language: undefined }) });
		variants.push({ name: name + '-terrain/en', build: () => builder({ ...terrainOpts, language: 'en' }) });
		variants.push({ name: name + '-terrain/de', build: () => builder({ ...terrainOpts, language: 'de' }) });
	}

	variants.push({ name: 'satellite/style', build: () => satellite({ language: undefined }) });
	variants.push({ name: 'satellite/en', build: () => satellite({ language: 'en' }) });
	variants.push({ name: 'satellite/de', build: () => satellite({ language: 'de' }) });
	variants.push({ name: 'satellite/nooverlay', build: () => satellite({ overlay: false }) });

	variants.push({ name: 'terrain/style', build: () => satellite({ ...terrainOpts, language: undefined }) });
	variants.push({ name: 'terrain/en', build: () => satellite({ ...terrainOpts, language: 'en' }) });
	variants.push({ name: 'terrain/de', build: () => satellite({ ...terrainOpts, language: 'de' }) });
	variants.push({ name: 'terrain/nooverlay', build: () => satellite({ ...terrainOpts, overlay: false }) });

	return variants;
}
