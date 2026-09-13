import type { LayerContext, ColorSet } from '../context.js';
import * as b from '../../dsl/index.js';

// Site polygons for Protomaps — `landuse` kinds, as in the OpenMapTiles port, but a richer set.
//
// Verified with `npm run schema-values -- protomaps landuse`: school, university, college, kindergarten,
// military and nature_reserve all appear as `kind` values. Still missing, as in OpenMapTiles: parking,
// prison and construction, each of which draws a named palette colour that no neighbouring kind should
// borrow.

const APPEAR = 14;

type SiteDef = { id: string; kinds: string[]; style: (c: ColorSet) => b.ColoredStyleProps };

const SITES: SiteDef[] = [
	{
		// Broader than Shortbread's `danger_area`, as in the OpenMapTiles port: every military area.
		id: 'danger',
		kinds: ['military'],
		style: (c) => ({
			color: c.siteDanger.opaque(),
			fillOutlineColor: c.siteDanger.opaque(),
			opacity: c.siteDanger.alpha,
			image: 'base:pattern-hatched',
		}),
	},
	{ id: 'sports', kinds: ['pitch', 'track', 'stadium'], style: (c) => ({ color: c.siteSports }) },
	{
		id: 'education',
		kinds: ['university', 'college', 'school', 'kindergarten'],
		style: (c) => ({ color: c.siteEducation }),
	},
	{ id: 'hospital', kinds: ['hospital'], style: (c) => ({ color: c.siteHospital }) },
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { id, kinds, style } of SITES) {
		yield b.fill('site-' + id, {
			sourceLayer: 'landuse',
			filter: kinds.length === 1 ? ['==', ['get', 'kind'], kinds[0]] : ['in', ['get', 'kind'], ['literal', [...kinds]]],
			...style(ctx.c),
			appear: APPEAR,
			group: 'sites',
		});
	}
}
