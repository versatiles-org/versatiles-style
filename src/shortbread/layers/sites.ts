import type { LayerContext } from '../context.js';
import type { ColorSet } from '../context.js';
import * as b from '../build.js';

// Site polygons (schools, hospitals, parking, danger areas, …). All in the `sites` group.
// Note: `sports_center` has no styling rule — it is emitted as a bare fill (filter only).

type SiteDef = { kind: string; style?: (c: ColorSet) => b.StyleProps };

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
	{ kind: 'sports_center' },
	{ kind: 'university', style: (c) => ({ color: c.siteEducation, opacity: 0.1 }) },
	{ kind: 'college', style: (c) => ({ color: c.siteEducation, opacity: 0.1 }) },
	{ kind: 'school', style: (c) => ({ color: c.siteEducation, opacity: 0.1 }) },
	{ kind: 'hospital', style: (c) => ({ color: c.siteHospital, opacity: 0.1 }) },
	{ kind: 'prison', style: (c) => ({ color: c.sitePrison, image: 'basics:pattern-striped', opacity: 0.1 }) },
	{ kind: 'parking', style: (c) => ({ color: c.siteParking }) },
	{ kind: 'bicycle_parking', style: (c) => ({ color: c.siteParking }) },
	{
		kind: 'construction',
		style: (c) => ({ color: c.siteConstruction, image: 'basics:pattern-hatched_thin', opacity: 0.1 }),
	},
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { kind, style } of SITES) {
		yield b.fill('site-' + kind.replace(/_/g, ''), {
			sourceLayer: 'sites',
			filter: ['==', ['get', 'kind'], kind],
			...(style ? style(ctx.c) : {}),
			group: 'sites',
		});
	}
}
