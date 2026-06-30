import type { LayerContext } from '../context.js';
import type { ColorSet } from '../context.js';
import * as b from '../build.js';

// Site polygons (schools, hospitals, parking, danger areas, …). All in the `sites` group.
// Every site must define a color (a bare fill would render black), so `style` is required.

type SiteDef = { kind: string; style: (c: ColorSet) => b.ColoredStyleProps };
const opacity = { 14: 0, 15: 1 };

const SITES: SiteDef[] = [
	{
		kind: 'danger_area',
		style: (c) => ({
			color: c.siteDanger,
			fillOutlineColor: c.siteDanger,
			opacity: 0.3,
			image: 'basics:pattern-warning',
		}),
	},
	{ kind: 'sports_center', style: (c) => ({ color: c.natureLeisure, opacity: { 14: 0, 15: 0.1 } }) },
	// OSM Bright renders education/hospital areas as flat pastel fills.
	{ kind: 'university', style: (c) => ({ color: c.siteEducation, opacity }) },
	{ kind: 'college', style: (c) => ({ color: c.siteEducation, opacity }) },
	{ kind: 'school', style: (c) => ({ color: c.siteEducation, opacity }) },
	{ kind: 'hospital', style: (c) => ({ color: c.siteHospital, opacity }) },
	{
		kind: 'prison',
		style: (c) => ({ color: c.sitePrison, image: 'basics:pattern-striped', opacity: { 14: 0, 15: 0.1 } }),
	},
	{ kind: 'parking', style: (c) => ({ color: c.siteParking, opacity }) },
	{ kind: 'bicycle_parking', style: (c) => ({ color: c.siteParking, opacity }) },
	{
		kind: 'construction',
		style: (c) => ({ color: c.siteConstruction, image: 'basics:pattern-hatched_thin', opacity: { 14: 0, 15: 0.1 } }),
	},
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { kind, style } of SITES) {
		yield b.fill('site-' + kind.replace(/_/g, ''), {
			sourceLayer: 'sites',
			filter: ['==', ['get', 'kind'], kind],
			...style(ctx.c),
			group: 'sites',
		});
	}
}
