import type { SatelliteOptions, SpriteEntry, SpriteInput } from '../types/index.js';
import type { ResolvedSatelliteOptions, ResolvedSatelliteUrls } from '../types/index.js';
import { resolveUrl, basename } from '../lib/utils.js';
import { resolveOsmFeatures, resolveOsmContentOptions, resolveSky, resolveSun } from './resolveOsmOptions.js';

const DEFAULT_BASE = globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';

function resolveSprite(base: string, sprite?: SpriteInput): SpriteEntry[] {
	const input = sprite ?? [{ id: 'basics', url: '/assets/sprites/basics/sprites' }];
	if (typeof input === 'string') {
		return [{ id: basename(input), url: resolveUrl(base, input) }];
	}
	return input.map(({ id, url }) => ({ id, url: resolveUrl(base, url) }));
}

function resolveSatelliteUrls(urls?: SatelliteOptions['urls']): ResolvedSatelliteUrls {
	const base = urls?.base ?? DEFAULT_BASE;
	return {
		satellite: resolveUrl(base, urls?.satellite ?? '/tiles/satellite/tiles.json'),
		osm: resolveUrl(base, urls?.osm ?? '/tiles/osm/tiles.json'),
		elevation: resolveUrl(base, urls?.elevation ?? '/tiles/elevation/tiles.json'),
		glyphsPattern: resolveUrl(base, urls?.glyphsPattern ?? '/assets/glyphs/{fontstack}/{range}.pbf'),
		sprite: resolveSprite(base, urls?.sprite ?? '/assets/sprites/basics/sprites'),
		fetch: urls?.fetch,
	};
}

export function resolveSatelliteOptions(options?: SatelliteOptions): ResolvedSatelliteOptions {
	const urls = resolveSatelliteUrls(options?.urls);

	const features = {
		terrain: resolveOsmFeatures({ terrain: options?.features?.terrain }).terrain,
		hillshade: resolveOsmFeatures({ hillshade: options?.features?.hillshade }).hillshade,
	};

	const raster = {
		opacity: options?.raster?.opacity ?? 1,
		hueRotate: options?.raster?.hueRotate ?? 0,
		brightnessMin: options?.raster?.brightnessMin ?? 0,
		brightnessMax: options?.raster?.brightnessMax ?? 1,
		saturation: options?.raster?.saturation ?? 0,
		contrast: options?.raster?.contrast ?? 0,
	};

	const osmUrls = {
		osm: urls.osm,
		elevation: urls.elevation,
		glyphsPattern: urls.glyphsPattern,
		sprite: urls.sprite,
		fetch: urls.fetch,
	};

	const osmOverlay =
		options?.osmOverlay === false || options?.osmOverlay == null
			? false
			: resolveOsmContentOptions(options.osmOverlay, osmUrls);

	return {
		urls,
		features,
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		raster,
		osmOverlay,
	};
}
