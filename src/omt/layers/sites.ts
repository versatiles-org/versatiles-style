import type { LayerContext, ColorSet } from '../context.js';
import * as b from '../../dsl/index.js';

// Site polygons for OpenMapTiles — the port of `src/shortbread/layers/sites.ts`, and the module that
// loses the most to the schema.
//
// Shortbread has a dedicated `sites` source-layer with ten kinds. OpenMapTiles has no such layer: the
// ones it carries are `landuse` classes, mixed in with the developed-land fills the landcover module
// draws. Values below are from `npm run schema-values -- omt landuse`, which observed
// school/university/college/kindergarten/education/library, hospital, pitch/track and military.
//
// ── What is dropped, and why not approximated ─────────────────────────────────
//
// Five of the ten kinds have no counterpart in any sampled tile: `parking` and `bicycle_parking`
// (OpenMapTiles carries parking as a POI, not an area), `prison`, `construction` and `danger_area` as
// such. Each of those Shortbread layers draws a *named palette colour* — `siteParking`, `sitePrison`,
// `siteConstruction` — and two of them carry a hatch pattern, so substituting a neighbouring class
// would tint the wrong features in a colour the user chose for something else. They are dropped, and
// the group keeps only what the tiles support.
//
// `danger_area` is the one near-miss: OpenMapTiles' `military` class covers military areas, which is
// what `military=danger_area` is a part of. It is mapped, with the hatch kept, and flagged as broader
// than the Shortbread original rather than equivalent.

const APPEAR = 14;

type SiteDef = { id: string; classes: string[]; style: (c: ColorSet) => b.ColoredStyleProps };

const SITES: SiteDef[] = [
	{
		// Broader than Shortbread's `danger_area`: every military area, not only the danger zone.
		id: 'danger',
		classes: ['military'],
		style: (c) => ({
			color: c.siteDanger.opaque(),
			fillOutlineColor: c.siteDanger.opaque(),
			opacity: c.siteDanger.alpha,
			image: 'base:pattern-hatched',
		}),
	},
	// Shortbread's `sports_centre`. OpenMapTiles splits the sports surface itself into `pitch` and
	// `track`, which is what a sports centre is made of.
	{ id: 'sports', classes: ['pitch', 'track'], style: (c) => ({ color: c.siteSports }) },
	// One layer where Shortbread has three (university / college / school), because the colour is the
	// same for all of them — and OpenMapTiles adds `kindergarten`, `education` and `library` to the set.
	{
		id: 'education',
		classes: ['university', 'college', 'school', 'kindergarten', 'education', 'library'],
		style: (c) => ({ color: c.siteEducation }),
	},
	{ id: 'hospital', classes: ['hospital'], style: (c) => ({ color: c.siteHospital }) },
];

export function* sites(ctx: LayerContext): Generator<b.TaggedLayer> {
	for (const { id, classes, style } of SITES) {
		yield b.fill('site-' + id, {
			sourceLayer: 'landuse',
			filter:
				classes.length === 1
					? ['==', ['get', 'class'], classes[0]]
					: ['in', ['get', 'class'], ['literal', [...classes]]],
			...style(ctx.c),
			appear: APPEAR,
			group: 'sites',
		});
	}
}
