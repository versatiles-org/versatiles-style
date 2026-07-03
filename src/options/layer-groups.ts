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
		  };
	icons?: boolean | number;
};

export type ResolvedLayerGroupOptions = {
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
	};
	icons: boolean | number;
};

// ── Resolution ─────────────────────────────────────────────────────────────────
//
// A group option is either a scalar (`boolean | number`) that cascades to every child, or an object
// that sets children individually. `resolveLayerGroups` fills in every field: a scalar set on an
// ancestor is inherited by any child not set explicitly, otherwise the child falls back to its own
// default. Every group defaults to visible (`true`) except `roads.steps`, which is hidden (`false`).

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
// every child; an object `opt` sets them individually (unset children fall back to `true`).
function resolveFlat<K extends string>(opt: unknown, keys: readonly K[]): Record<K, Scalar> {
	const inherited = scalarOf(opt);
	const obj = opt && typeof opt === 'object' ? (opt as Partial<Record<K, Scalar>>) : undefined;
	const out = {} as Record<K, Scalar>;
	for (const k of keys) out[k] = leaf(obj?.[k], inherited, true);
	return out;
}

/** Fill in every layer-group option, applying scalar cascade and per-group defaults. */
export function resolveLayerGroups(opts?: LayerGroupOptions): ResolvedLayerGroupOptions {
	const o = opts ?? {};

	// roads is two levels deep (roads → streets → residential/…); a scalar at either level cascades down.
	const roadsInherited = scalarOf(o.roads);
	const roads = o.roads && typeof o.roads === 'object' ? o.roads : undefined;
	const streetsInherited = scalarOf(roads?.streets) ?? roadsInherited;
	const streets = roads?.streets && typeof roads.streets === 'object' ? roads.streets : undefined;

	// `icons` is a cross-cutting alias for the icon symbol groups (POIs, road markings, transit stops):
	// it acts as their fallback default, overridden by a more specific option on any of those groups.
	const icons = scalarOf(o.icons);
	const transitInherited = scalarOf(o.transit);
	const transit = o.transit && typeof o.transit === 'object' ? o.transit : undefined;

	return {
		land: resolveFlat(o.land, ['forest', 'vegetation', 'rock', 'wetland', 'sand', 'glacier', 'agriculture', 'urban']),
		water: resolveFlat(o.water, ['ocean', 'rivers', 'lakes', 'piers']),
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
			// Steps are hidden unless explicitly enabled (or re-enabled by a scalar set on `roads`).
			steps: leaf(roads?.steps, roadsInherited, false),
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
		boundaries: resolveFlat(o.boundaries, ['country', 'state']),
		markings: leaf(o.markings, icons, true),
		labels: resolveFlat(o.labels, ['places', 'streets', 'states', 'countries', 'addresses']),
		icons: leaf(o.icons, undefined, true),
	};
}
