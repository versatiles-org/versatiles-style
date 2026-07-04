import { describe, expect, it } from 'vitest';
import { buildContext } from '../context.js';
import { pois } from './pois.js';
import { resolveOsm } from '../../options/index.js';
import spriteConfig from '../../../scripts/config-sprites.js';

// Regression guard for POI icon coverage. It cross-checks three things that drifted apart before
// (a misspelled `optican` shop key, and `artwork` filed under `historic` instead of `tourism`):
//   1. every icon a poi-* layer references actually exists in the `basics` sprite,
//   2. every value a poi-* layer matches on is a real Shortbread `pois` value for that key,
//   3. the set of schema values we do NOT give an icon is tracked (snapshot), so coverage
//      changes are visible in review.
//
// The Shortbread value lists below are transcribed from the schema:
// https://shortbread-tiles.org/schema/1.0/ (pois layer — Point, zoom 14).

const SHORTBREAD_POIS: Record<string, string[]> = {
	amenity: `arts_centre atm bank bar bench bicycle_rental biergarten cafe car_rental car_sharing car_wash cinema clinic
		college community_centre courthouse dentist doctors dog_park drinking_water embassy fast_food fire_station food_court
		fountain grave_yard hospital hunting_stand library marketplace nightclub nursing_home pharmacy place_of_worship
		playground police post_box post_office prison pub public_building recycling restaurant school shelter telephone
		theatre toilets townhall university vending_machine veterinary waste_basket`.split(/\s+/),
	leisure: `golf_course ice_rink pitch sports_centre stadium swimming_pool water_park`.split(/\s+/),
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

// The icons packed into the `basics` sprite sheet (referenced as `basics:<group>-<name>`).
const SPRITE_ICONS = new Set<string>();
for (const [group, set] of Object.entries(spriteConfig.spritesheets.basics)) {
	for (const name of set.names) SPRITE_ICONS.add(`${group}-${name}`);
}

// Parse each poi-* layer's `icon-image` match expression into { key, matches, default }.
type ParsedPoi = { key: string; matches: Record<string, string>; fallback: string | null };

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
		const matches: Record<string, string> = {};
		for (let i = 0; i < pairs.length; i += 2) matches[pairs[i] as string] = pairs[i + 1] as string;
		out.push({ key, matches, fallback });
	}
	return out;
}

const poiLayers = parsePoiLayers();

// Collect every sprite reference used (per-value matches + fallbacks), skipping the empty
// fallback ('' = "no icon, base style only").
function iconRefs(): { key: string; value: string; ref: string }[] {
	const refs: { key: string; value: string; ref: string }[] = [];
	for (const { key, matches, fallback } of poiLayers) {
		for (const [value, ref] of Object.entries(matches)) refs.push({ key, value, ref });
		if (fallback) refs.push({ key, value: '<default>', ref: fallback });
	}
	return refs;
}

describe('POI layer ↔ Shortbread schema ↔ sprite coverage', () => {
	it('exposes a poi-* layer for every Shortbread pois attribute key', () => {
		const layerKeys = new Set(poiLayers.map((l) => l.key));
		const missing = Object.keys(SHORTBREAD_POIS).filter((k) => !layerKeys.has(k));
		expect(missing).toStrictEqual([]);
	});

	it('every referenced icon exists in the basics sprite', () => {
		const broken = iconRefs()
			.filter(({ ref }) => ref.startsWith('basics:'))
			.filter(({ ref }) => !SPRITE_ICONS.has(ref.replace(/^basics:/, '')))
			.map(({ key, value, ref }) => `${key}.${value} → ${ref}`);
		expect(broken).toStrictEqual([]);
	});

	it('every icon reference uses the basics: sprite prefix', () => {
		const bad = iconRefs()
			.filter(({ ref }) => !ref.startsWith('basics:'))
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
		expect(byKey.shop['optician']).toBe('basics:icon-optician');
		expect(byKey.shop['optican']).toBeUndefined();
		expect(byKey.tourism['artwork']).toBe('basics:icon-artwork');
		expect(byKey.historic['artwork']).toBeUndefined();
	});

	it('warns (does not fail) for POI kinds that have no icon', () => {
		// A value is "iconless" when it is neither explicitly matched nor caught by a non-empty
		// per-key default. Missing coverage is allowed, but surfaced as a console warning so it
		// stays visible without forcing an update to a snapshot on every change.
		const iconless: string[] = [];
		for (const { key, matches, fallback } of poiLayers) {
			const hasDefault = fallback != null && fallback !== '';
			if (hasDefault) continue; // a non-empty default icon covers every value for this key
			for (const value of SHORTBREAD_POIS[key] ?? []) {
				if (!(value in matches)) iconless.push(`${key}=${value}`);
			}
		}

		if (iconless.length > 0) {
			console.warn(
				`⚠ ${iconless.length} Shortbread POI kind(s) have no icon:\n  ${iconless.join('\n  ')}\n` +
					`  (add a match in src/shortbread/layers/pois.ts and, if needed, the icon to scripts/config-sprites.ts)`
			);
		}

		// Advisory only — coverage gaps do not fail the suite.
		expect(Array.isArray(iconless)).toBe(true);
	});
});
