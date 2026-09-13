import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { omt } from './api.js';

const minzoom = (style: ReturnType<typeof osm>, id: string) => style.layers.find((l) => l.id === id)?.minzoom;

describe('omt() waterway zooms', () => {
	it('starts river lines at z9, as Shortbread does, although OpenMapTiles tiles them from z3', () => {
		expect(minzoom(omt(), 'water-river')).toBe(9);
		expect(minzoom(omt(), 'water-river')).toBe(minzoom(osm(), 'water-river'));
	});
});
