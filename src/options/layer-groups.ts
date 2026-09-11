import { checkKeys, type KnownKeys } from './keys.js';
export type LayerGroupOptions = {
	land?:
		| boolean
		| number
		| {
				forest?: boolean | number;
				vegetation?: boolean | number;
				rock?: boolean | number;
				wetland?: boolean | number;
				sand?: boolean | number;
				glacier?: boolean | number;
				agriculture?: boolean | number;
				urban?: boolean | number;
		  };
	water?:
		| boolean
		| number
		| {
				ocean?: boolean | number;
				rivers?: boolean | number;
				lakes?: boolean | number;
				piers?: boolean | number;
		  };
	roads?:
		| boolean
		| number
		| {
				motorways?: boolean | number;
				highways?: boolean | number;
				streets?:
					| boolean
					| number
					| {
							residential?: boolean | number;
							service?: boolean | number;
							pedestrian?: boolean | number;
							track?: boolean | number;
							bus?: boolean | number;
					  };
				paths?: boolean | number;
				footway?: boolean | number;
				steps?: boolean | number;
		  };
	transit?:
		| boolean
		| number
		| {
				rail?: boolean | number;
				aerialways?: boolean | number;
				ferries?: boolean | number;
				stops?: boolean | number;
		  };
	buildings?: boolean | number;
	sites?: boolean | number;
	airport?: boolean | number;
	pois?: boolean | number;
	boundaries?:
		| boolean
		| number
		| {
				country?: boolean | number;
				state?: boolean | number;
		  };
	markings?: boolean | number;
	labels?:
		| boolean
		| number
		| {
				places?: boolean | number;
				streets?: boolean | number;
				states?: boolean | number;
				countries?: boolean | number;
				addresses?: boolean | number;
				water?: boolean | number;
		  };
	icons?: boolean | number;
};

export type ResolvedLayerGroups = {
	land: {
		forest: boolean | number;
		vegetation: boolean | number;
		rock: boolean | number;
		wetland: boolean | number;
		sand: boolean | number;
		glacier: boolean | number;
		agriculture: boolean | number;
		urban: boolean | number;
	};
	water: {
		ocean: boolean | number;
		rivers: boolean | number;
		lakes: boolean | number;
		piers: boolean | number;
	};
	roads: {
		motorways: boolean | number;
		highways: boolean | number;
		streets: {
			residential: boolean | number;
			service: boolean | number;
			pedestrian: boolean | number;
			track: boolean | number;
			bus: boolean | number;
		};
		paths: boolean | number;
		footway: boolean | number;
		steps: boolean | number;
	};
	transit: {
		rail: boolean | number;
		aerialways: boolean | number;
		ferries: boolean | number;
		stops: boolean | number;
	};
	buildings: boolean | number;
	sites: boolean | number;
	airport: boolean | number;
	pois: boolean | number;
	boundaries: {
		country: boolean | number;
		state: boolean | number;
	};
	markings: boolean | number;
	labels: {
		places: boolean | number;
		streets: boolean | number;
		states: boolean | number;
		countries: boolean | number;
		addresses: boolean | number;
		water: boolean | number;
	};
	icons: boolean | number;
};

// ── Resolution ─────────────────────────────────────────────────────────────────
//
// A group option is either a scalar (`boolean | number`) that cascades to every child, or an object
// that sets children individually. `resolveLayerGroups` fills in every field: a scalar set on an
// ancestor is inherited by any child not set explicitly, otherwise the child falls back to its own
// default. Every group defaults to visible (`true`).

type Scalar = boolean | number;

const scalarOf = (v: unknown): Scalar | undefined => (typeof v === 'boolean' || typeof v === 'number' ? v : undefined);

// Collapse a non-fractional opacity to a boolean: ≤ 0 is fully hidden (→ false), ≥ 1 is fully
// visible (→ true). Only a fractional value in the open interval (0, 1) stays a number.
const normalize = (v: Scalar): Scalar => {
	if (typeof v === 'number') {
		if (v <= 0) return false;
		if (v >= 1) return true;
	}
	return v;
};

// Resolve a leaf: an explicit value wins, else a scalar inherited from an ancestor, else the default.
const leaf = (opt: unknown, inherited: Scalar | undefined, def: Scalar): Scalar =>
	normalize(scalarOf(opt) ?? inherited ?? def);

// Resolve a single-level group whose children all default to visible. A scalar `opt` cascades to
// every child; an object `opt` sets them individually (unset children fall back to `true`). `known`
// names the children — TypeScript holds it to the option type — and rejects any other key.
function resolveFlat<T>(opt: T, known: NoInfer<KnownKeys<T>>, path: string): Record<keyof KnownKeys<T>, Scalar> {
	checkKeys(opt, known, path);
	const inherited = scalarOf(opt);
	const obj = opt && typeof opt === 'object' ? (opt as Record<string, unknown>) : undefined;
	const out = {} as Record<keyof KnownKeys<T>, Scalar>;
	for (const key of Object.keys(known) as (keyof KnownKeys<T> & string)[]) out[key] = leaf(obj?.[key], inherited, true);
	return out;
}

/**
 * Fill in every layer-group option, applying scalar cascade and per-group defaults.
 *
 * A scalar in place of the whole object cascades to every group — the same rule that already
 * applies at every level below it. `layers: false` is the v6 equivalent of the v5 `empty` style,
 * and `layers: 0.5` dims the entire map.
 */
export function resolveLayerGroups(opts?: boolean | number | LayerGroupOptions, path = 'layers'): ResolvedLayerGroups {
	checkKeys(
		opts,
		{
			land: true,
			water: true,
			roads: true,
			transit: true,
			buildings: true,
			sites: true,
			airport: true,
			pois: true,
			boundaries: true,
			markings: true,
			labels: true,
			icons: true,
		},
		path
	);
	// A top-level scalar cascades to every group; previously it was silently ignored, so
	// `layers: false` returned a fully-populated style.
	const o: LayerGroupOptions =
		typeof opts === 'boolean' || typeof opts === 'number'
			? {
					land: opts,
					water: opts,
					roads: opts,
					transit: opts,
					buildings: opts,
					sites: opts,
					airport: opts,
					pois: opts,
					boundaries: opts,
					markings: opts,
					labels: opts,
					icons: opts,
				}
			: (opts ?? {});

	// roads is two levels deep (roads → streets → residential/…); a scalar at either level cascades down.
	const roadsInherited = scalarOf(o.roads);
	const roads = o.roads && typeof o.roads === 'object' ? o.roads : undefined;
	const streetsInherited = scalarOf(roads?.streets) ?? roadsInherited;
	const streets = roads?.streets && typeof roads.streets === 'object' ? roads.streets : undefined;
	checkKeys(
		o.roads,
		{ motorways: true, highways: true, streets: true, paths: true, footway: true, steps: true },
		`${path}.roads`
	);
	checkKeys(
		roads?.streets,
		{ residential: true, service: true, pedestrian: true, track: true, bus: true },
		`${path}.roads.streets`
	);

	// `icons` is a cross-cutting alias for the icon symbol groups (POIs, road markings, transit stops):
	// it acts as their fallback default, overridden by a more specific option on any of those groups.
	const icons = scalarOf(o.icons);
	const transitInherited = scalarOf(o.transit);
	const transit = o.transit && typeof o.transit === 'object' ? o.transit : undefined;
	checkKeys(o.transit, { rail: true, aerialways: true, ferries: true, stops: true }, `${path}.transit`);

	return {
		land: resolveFlat(
			o.land,
			{
				forest: true,
				vegetation: true,
				rock: true,
				wetland: true,
				sand: true,
				glacier: true,
				agriculture: true,
				urban: true,
			},
			`${path}.land`
		),
		water: resolveFlat(o.water, { ocean: true, rivers: true, lakes: true, piers: true }, `${path}.water`),
		roads: {
			motorways: leaf(roads?.motorways, roadsInherited, true),
			highways: leaf(roads?.highways, roadsInherited, true),
			streets: {
				residential: leaf(streets?.residential, streetsInherited, true),
				service: leaf(streets?.service, streetsInherited, true),
				pedestrian: leaf(streets?.pedestrian, streetsInherited, true),
				track: leaf(streets?.track, streetsInherited, true),
				bus: leaf(streets?.bus, streetsInherited, true),
			},
			paths: leaf(roads?.paths, roadsInherited, true),
			footway: leaf(roads?.footway, roadsInherited, true),
			steps: leaf(roads?.steps, roadsInherited, true),
		},
		transit: {
			rail: leaf(transit?.rail, transitInherited, true),
			aerialways: leaf(transit?.aerialways, transitInherited, true),
			ferries: leaf(transit?.ferries, transitInherited, true),
			// stops are icons: an explicit setting wins, else the `transit` scalar, else the `icons` alias.
			stops: leaf(transit?.stops, transitInherited ?? icons, true),
		},
		buildings: leaf(o.buildings, undefined, true),
		sites: leaf(o.sites, undefined, true),
		airport: leaf(o.airport, undefined, true),
		pois: leaf(o.pois, icons, true),
		boundaries: resolveFlat(o.boundaries, { country: true, state: true }, `${path}.boundaries`),
		markings: leaf(o.markings, icons, true),
		labels: resolveFlat(
			o.labels,
			{ places: true, streets: true, states: true, countries: true, addresses: true, water: true },
			`${path}.labels`
		),
		icons: leaf(o.icons, undefined, true),
	};
}
