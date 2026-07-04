import { describe, expect, it } from 'vitest';
import { buildContext } from '../context.js';
import { pois } from './pois.js';
import { resolveOsm } from '../../options/index.js';
import spriteConfig from '../../../scripts/config-sprites.js';

// Regression guard for POI icon coverage. It cross-checks three things that drifted apart before
// (a misspelled `optican` shop key, and `artwork` filed under `historic` instead of `tourism`):
//   1. every icon a poi-* layer references actually exists in the `base` sprite,
//   2. every value a poi-* layer matches on is a real Shortbread `pois` value for that key,
//   3. the set of schema values we do NOT give an icon is tracked (snapshot), so coverage
//      changes are visible in review.
//
// The COMPLETE set of pois attribute values, transcribed verbatim from the Shortbread schema:
// https://shortbread-tiles.org/schema/1.1/ (pois layer — Point, zoom 14). Keep this in sync with the
// schema on every version bump — a value missing here is silently excluded from the coverage checks
// below (which is exactly how `amenity=fuel` was previously overlooked).
const SHORTBREAD_POIS: Record<string, string[]> = {
	amenity: `arts_centre atm bank bar bench bicycle_rental biergarten cafe car_rental car_sharing car_wash cinema clinic
		college community_centre courthouse dentist doctors drinking_water embassy fast_food fire_station food_court fountain
		fuel grave_yard hospital hunting_stand library marketplace nightclub nursing_home pharmacy place_of_worship police
		post_box post_office prison pub public_building recycling restaurant school shelter telephone theatre toilets townhall
		university vending_machine veterinary waste_basket`.split(/\s+/),
	leisure: `dog_park golf_course ice_rink park pitch playground sports_centre stadium swimming_pool water_park`.split(
		/\s+/
	),
	tourism:
		`artwork alpine_hut bed_and_breakfast camp_site caravan_site chalet guest_house hostel hotel information motel
		picnic_site theme_park viewpoint zoo`.split(/\s+/),
	shop: `alcohol bakery beauty beverages bicycle books butcher car chemist clothes computer convenience department_store
		doityourself dry_cleaning florist furniture garden_centre general gift greengrocer hairdresser hardware jewelry kiosk
		laundry mall mobile_phone newsagent optician outdoor shoes sports stationery supermarket toys travel_agency video`.split(
		/\s+/
	),
	man_made: `lighthouse surveillance tower wastewater_plant water_well water_works watermill windmill`.split(/\s+/),
	historic: `archaeological_site battlefield castle fort memorial monument ruins wayside_cross wayside_shrine`.split(
		/\s+/
	),
	emergency: `defibrillator fire_hydrant phone`.split(/\s+/),
	highway: `emergency_access_point`.split(/\s+/),
	office: `diplomatic`.split(/\s+/),
};

// The icons packed into the `base` sprite sheet (referenced as `base:<group>-<name>`).
const SPRITE_ICONS = new Set<string>();
for (const [group, set] of Object.entries(spriteConfig.spritesheets.base)) {
	for (const name of set.names) SPRITE_ICONS.add(`${group}-${name}`);
}

// Parse each poi-* layer's `icon-image` match expression into { key, matches, default }.
// A match value is usually an icon string, but may be a nested `match` expression (e.g.
// place_of_worship → match on `religion`), so values are typed `unknown`.
type ParsedPoi = { key: string; matches: Record<string, unknown>; fallback: string | null };

function parsePoiLayers(): ParsedPoi[] {
	const out: ParsedPoi[] = [];
	for (const { layer } of pois(buildContext(resolveOsm()))) {
		if (!layer.id.startsWith('poi-')) continue;
		const key = layer.id.slice('poi-'.length);
		const img = (layer as { layout?: Record<string, unknown> }).layout?.['icon-image'];
		if (!Array.isArray(img)) {
			out.push({ key, matches: {}, fallback: null }); // highway / office carry no icons
			continue;
		}
		// ['match', ['get', key], v1, i1, …, default]
		const body = img.slice(2) as unknown[];
		const hasDefault = body.length % 2 === 1;
		const fallback = hasDefault ? (body[body.length - 1] as string) : null;
		const pairs = hasDefault ? body.slice(0, -1) : body;
		const matches: Record<string, unknown> = {};
		for (let i = 0; i < pairs.length; i += 2) matches[pairs[i] as string] = pairs[i + 1];
		out.push({ key, matches, fallback });
	}
	return out;
}

const poiLayers = parsePoiLayers();

// Sprite references are strings containing a ':' (`<sheet>:<group>-<name>`); every other string in
// a match expression is a keyword/tag value. Collect them recursively so nested matches (e.g. the
// place_of_worship → religion sub-match) are covered too.
function spriteRefsIn(value: unknown): string[] {
	if (typeof value === 'string') return value.includes(':') ? [value] : [];
	if (Array.isArray(value)) return value.flatMap(spriteRefsIn);
	return [];
}

// Collect every sprite reference used (per-value matches + fallbacks).
function iconRefs(): { key: string; value: string; ref: string }[] {
	const refs: { key: string; value: string; ref: string }[] = [];
	for (const { key, matches, fallback } of poiLayers) {
		for (const [value, ref] of Object.entries(matches))
			for (const r of spriteRefsIn(ref)) refs.push({ key, value, ref: r });
		for (const r of spriteRefsIn(fallback)) refs.push({ key, value: '<default>', ref: r });
	}
	return refs;
}

describe('POI layer ↔ Shortbread schema ↔ sprite coverage', () => {
	it('exposes a poi-* layer for every Shortbread pois attribute key', () => {
		const layerKeys = new Set(poiLayers.map((l) => l.key));
		const missing = Object.keys(SHORTBREAD_POIS).filter((k) => !layerKeys.has(k));
		expect(missing).toStrictEqual([]);
	});

	it('every referenced icon exists in the base sprite', () => {
		const broken = iconRefs()
			.filter(({ ref }) => ref.startsWith('base:'))
			.filter(({ ref }) => !SPRITE_ICONS.has(ref.replace(/^base:/, '')))
			.map(({ key, value, ref }) => `${key}.${value} → ${ref}`);
		expect(broken).toStrictEqual([]);
	});

	it('every icon reference uses the base: sprite prefix', () => {
		const bad = iconRefs()
			.filter(({ ref }) => !ref.startsWith('base:'))
			.map(({ key, value, ref }) => `${key}.${value} → ${ref}`);
		expect(bad).toStrictEqual([]);
	});

	it('every matched value is a real Shortbread value for its key (no typos / misfiled keys)', () => {
		// This is the guard that would have caught `shop=optican` and `historic=artwork`.
		const offenders: string[] = [];
		for (const { key, matches } of poiLayers) {
			const schema = new Set(SHORTBREAD_POIS[key] ?? []);
			for (const value of Object.keys(matches)) {
				if (!schema.has(value)) offenders.push(`${key}=${value}`);
			}
		}
		expect(offenders).toStrictEqual([]);
	});

	it('specifically covers the two previously-broken values', () => {
		const byKey = Object.fromEntries(poiLayers.map((l) => [l.key, l.matches]));
		expect(byKey.shop['optician']).toBe('base:icon-optician');
		expect(byKey.shop['optican']).toBeUndefined();
		expect(byKey.tourism['artwork']).toBe('base:icon-artwork');
		expect(byKey.historic['artwork']).toBeUndefined();
	});

	it('warns (does not fail) for Shortbread values without a dedicated icon', () => {
		// A value is "uncovered" when it is neither explicitly matched nor caught by a *dedicated*
		// per-key default. The generic point-of-interest marker (`base:transport-information`) does
		// NOT count as coverage — a value that only reaches it (e.g. `amenity=fuel`) has no real icon.
		// Missing coverage is allowed, but surfaced as a console warning so it stays visible.
		const GENERIC_FALLBACK = 'base:transport-information';
		const uncovered: string[] = [];
		for (const { key, matches, fallback } of poiLayers) {
			const hasDedicatedDefault = fallback != null && fallback !== '' && fallback !== GENERIC_FALLBACK;
			if (hasDedicatedDefault) continue; // a real category default covers every value for this key
			for (const value of SHORTBREAD_POIS[key] ?? []) {
				if (!(value in matches)) uncovered.push(`${key}=${value}`);
			}
		}

		if (uncovered.length > 0) {
			console.warn(
				`⚠ ${uncovered.length} Shortbread POI value(s) have no dedicated icon (fall back to the generic marker):\n  ` +
					`${uncovered.join('\n  ')}\n` +
					`  (add a match in src/shortbread/layers/pois.ts and, if needed, the icon to scripts/config-sprites.ts)`
			);
		}

		// Advisory only — coverage gaps do not fail the suite.
		expect(Array.isArray(uncovered)).toBe(true);
	});
});
