import type { LayerContext } from '../context.js';
import type { ColorSet } from '../context.js';
import * as b from '../../dsl/index.js';

// Site polygons (schools, hospitals, parking, danger areas, …). All in the `sites` group.
// Every site must define a color (a bare fill would render black), so `style` is required.
// Sites appear at Shortbread zoom 14; each fades in over z14→15 — its `opacity` is the fade target.

const APPEAR = 14;

/**
 * One layer per entry. Kinds drawn alike share an entry, and with it one layer: `id` names it, and
 * `kinds` lists what it draws. A single-kind entry is named after its kind.
 */
type SiteDef = { id?: string; kinds: string[]; style: (c: ColorSet) => b.ColoredStyleProps };

const SITES: SiteDef[] = [
	{
		kinds: ['danger_area'],
		style: (c) => ({
			color: c.siteDanger.opaque(),
			fillOutlineColor: c.siteDanger.opaque(),
			opacity: c.siteDanger.alpha,
			image: 'base:pattern-hatched',
		}),
	},
	{ kinds: ['sports_centre'], style: (c) => ({ color: c.siteSports }) },
	{ id: 'education', kinds: ['university', 'college', 'school'], style: (c) => ({ color: c.siteEducation }) },
	{ kinds: ['hospital'], style: (c) => ({ color: c.siteHospital }) },
	{
		kinds: ['prison'],
		style: (c) => ({ color: c.sitePrison.opaque(), image: 'base:pattern-striped', opacity: c.sitePrison.alpha }),
	},
	{ id: 'parking', kinds: ['parking', 'bicycle_parking'], style: (c) => ({ color: c.siteParking }) },
	{
		kinds: ['construction'],
		style: (c) => ({
			color: c.siteConstruction.opaque(),
			image: 'base:pattern-hatched_thin',
			opacity: c.siteConstruction.alpha,
		}),
	},
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { id, kinds, style } of SITES) {
		yield b.fill('site-' + (id ?? kinds[0].replace(/_/g, '')), {
			sourceLayer: 'sites',
			filter: kinds.length === 1 ? ['==', ['get', 'kind'], kinds[0]] : ['in', ['get', 'kind'], ['literal', kinds]],
			...style(ctx.c),
			appear: APPEAR,
			group: 'sites',
		});
	}
}
