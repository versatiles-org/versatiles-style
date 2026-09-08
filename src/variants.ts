import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm, satellite as satelliteFn } from './api/index.js';
import type { OsmFeaturesOptions, Palette, ThemeOptions } from './options/index.js';

export interface StyleVariant {
	name: string;
	build: () => StyleSpecification;
}

/**
 * v5 style names and the v6 theme that reproduces each most closely. `shadow` is the one loose
 * match — v6 has no close equivalent — the other three measure near-exact.
 */
const LEGACY_ALIASES: { name: string; theme: ThemeOptions }[] = [
	{ name: 'eclipse', theme: { darkMode: true } },
	{ name: 'graybeard', theme: 'gray' },
	{ name: 'neutrino', theme: 'muted' },
	{ name: 'shadow', theme: { palette: 'gray', darkMode: true } },
];

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

	// ── v5 style names ────────────────────────────────────────────────────────────
	//
	// The v5 palettes were removed in v6, but `tiles.versatiles.org/assets/styles/<name>/…` still
	// serves them and anyone pointing MapLibre at a URL (rather than installing the package) would
	// get a 404 on upgrade. These regenerate the old names from their closest v6 equivalent, chosen
	// by comparing per-colour RGB distance against the published v5 styles — see the migration table
	// in API_DESIGN.md. Deprecated: drop them in 7.0.
	for (const { name, theme } of LEGACY_ALIASES) {
		variants.push({ name: `${name}/style`, build: () => osm({ theme, features }) });
		variants.push({ name: `${name}/en`, build: () => osm({ theme, text: { language: 'en' }, features }) });
		variants.push({ name: `${name}/de`, build: () => osm({ theme, text: { language: 'de' }, features }) });
		variants.push({ name: `${name}/nolabel`, build: () => osm({ theme, layers: { labels: false }, features }) });
		variants.push({ name: `${name}-terrain/style`, build: () => osm({ theme, features: terrainFeatures }) });
		variants.push({
			name: `${name}-terrain/en`,
			build: () => osm({ theme, text: { language: 'en' }, features: terrainFeatures }),
		});
		variants.push({
			name: `${name}-terrain/de`,
			build: () => osm({ theme, text: { language: 'de' }, features: terrainFeatures }),
		});
	}

	// v5 published `empty` as a single style with no language or terrain siblings.
	variants.push({ name: 'empty/style', build: () => osm({ layers: false, features }) });

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
