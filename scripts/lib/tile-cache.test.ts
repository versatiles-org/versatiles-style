import { describe, expect, it } from 'vitest';
import { CacheMiss, isTileCached, readAsset, readTile, sourceMetadata } from './tile-cache.js';

// Offline reads only: these must never write to the cache or touch the network.

describe('tile cache, offline', () => {
	it('throws CacheMiss for a tile that is not cached instead of fetching it', async () => {
		expect(isTileCached('omt', 25, 1, 1)).toBe(false);
		await expect(readTile('omt', 25, 1, 1, { offline: true })).rejects.toBeInstanceOf(CacheMiss);
	});

	it('throws CacheMiss for an asset that is not cached', async () => {
		const url = 'https://example.invalid/fonts/never/0-255.pbf';
		await expect(readAsset(url, { offline: true })).rejects.toBeInstanceOf(CacheMiss);
	});

	it('rejects unknown schemas', async () => {
		await expect(readTile('mapbox', 0, 0, 0, { offline: true })).rejects.toThrow('unknown schema');
		await expect(sourceMetadata('mapbox', { offline: true })).rejects.toThrow('unknown schema');
	});
});
