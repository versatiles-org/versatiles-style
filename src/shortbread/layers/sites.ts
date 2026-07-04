import type { LayerContext } from '../context.js';
import type { ColorSet } from '../context.js';
import * as b from '../build.js';

// Site polygons (schools, hospitals, parking, danger areas, …). All in the `sites` group.
// Every site must define a color (a bare fill would render black), so `style` is required.
// Sites appear at Shortbread zoom 14; each fades in over z14→15 — its `opacity` is the fade target.

const APPEAR = 14;

type SiteDef = { kind: string; style: (c: ColorSet) => b.ColoredStyleProps };

const SITES: SiteDef[] = [
	{
		kind: 'danger_area',
		style: (c) => ({
			color: c.siteDanger.opaque(),
			fillOutlineColor: c.siteDanger.opaque(),
			opacity: c.siteDanger.alpha,
			image: 'base:pattern-warning',
		}),
	},
	{ kind: 'sports_centre', style: (c) => ({ color: c.siteSports }) },
	{ kind: 'university', style: (c) => ({ color: c.siteEducation }) },
	{ kind: 'college', style: (c) => ({ color: c.siteEducation }) },
	{ kind: 'school', style: (c) => ({ color: c.siteEducation }) },
	{ kind: 'hospital', style: (c) => ({ color: c.siteHospital }) },
	{
		kind: 'prison',
		style: (c) => ({ color: c.sitePrison.opaque(), image: 'base:pattern-striped', opacity: c.sitePrison.alpha }),
	},
	{ kind: 'parking', style: (c) => ({ color: c.siteParking }) },
	{ kind: 'bicycle_parking', style: (c) => ({ color: c.siteParking }) },
	{
		kind: 'construction',
		style: (c) => ({
			color: c.siteConstruction.opaque(),
			image: 'base:pattern-hatched_thin',
			opacity: c.siteConstruction.alpha,
		}),
	},
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { kind, style } of SITES) {
		yield b.fill('site-' + kind.replace(/_/g, ''), {
			sourceLayer: 'sites',
			filter: ['==', ['get', 'kind'], kind],
			...style(ctx.c),
			appear: APPEAR,
			group: 'sites',
		});
	}
}
