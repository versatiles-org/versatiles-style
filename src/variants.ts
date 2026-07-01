import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from './api/osm.js';
import { satellite as satelliteFn } from './api/satellite.js';
import type { OsmFeaturesOptions, Palette } from './options/index.js';

export interface StyleVariant {
	name: string;
	build: () => Promise<StyleSpecification>;
}

export function getStyleVariants(features?: OsmFeaturesOptions): StyleVariant[] {
	const variants: StyleVariant[] = [];

	const palettes: Palette[] = ['colorful', 'natural', 'muted', 'gray', 'toner'];

	// Terrain variants enable terrain + hillshade, but let the caller's `features`
	// override those defaults (and add landcover / buildings on top).
	const terrainFeatures: OsmFeaturesOptions = { terrain: true, hillshade: true, ...features };

	for (const palette of palettes) {
		variants.push({ name: `${palette}/style`, build: () => osm({ theme: palette, features }) });
		variants.push({
			name: `${palette}/en`,
			build: () => osm({ theme: palette, text: { language: 'en' }, features }),
		});
		variants.push({
			name: `${palette}/de`,
			build: () => osm({ theme: palette, text: { language: 'de' }, features }),
		});
		variants.push({
			name: `${palette}/nolabel`,
			build: () => osm({ theme: palette, layers: { labels: false }, features }),
		});

		variants.push({
			name: `${palette}-terrain/style`,
			build: () => osm({ theme: palette, features: terrainFeatures }),
		});
		variants.push({
			name: `${palette}-terrain/en`,
			build: () => osm({ theme: palette, text: { language: 'en' }, features: terrainFeatures }),
		});
		variants.push({
			name: `${palette}-terrain/de`,
			build: () => osm({ theme: palette, text: { language: 'de' }, features: terrainFeatures }),
		});
	}

	variants.push({ name: 'satellite/style', build: () => satelliteFn() });
	variants.push({ name: 'satellite/en', build: () => satelliteFn({ osmOverlay: { text: { language: 'en' } } }) });
	variants.push({ name: 'satellite/de', build: () => satelliteFn({ osmOverlay: { text: { language: 'de' } } }) });
	variants.push({ name: 'satellite/nooverlay', build: () => satelliteFn({ osmOverlay: false }) });

	const terrainSat = { features: { terrain: true, hillshade: true } } as const;
	variants.push({ name: 'terrain/style', build: () => satelliteFn({ ...terrainSat }) });
	variants.push({
		name: 'terrain/en',
		build: () => satelliteFn({ osmOverlay: { text: { language: 'en' } }, ...terrainSat }),
	});
	variants.push({
		name: 'terrain/de',
		build: () => satelliteFn({ osmOverlay: { text: { language: 'de' } }, ...terrainSat }),
	});
	variants.push({ name: 'terrain/nooverlay', build: () => satelliteFn({ osmOverlay: false, ...terrainSat }) });

	return variants;
}
