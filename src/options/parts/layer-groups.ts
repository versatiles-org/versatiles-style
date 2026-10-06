import { checkKeys, checkFinite, type KnownKeys } from './keys.js';
import { describeValue, reportIssue } from './issues.js';

/**
 * How a line is drawn, for the groups that are one: borders and paths. Takes the place of the plain
 * `boolean | number` those groups also accept — `state: 0.5` and `state: { opacity: 0.5 }` say the
 * same thing.
 */
export type LineStyle = {
	/** As the plain value: `false` hides the line, a number in (0, 1] is its opacity. Default `true`. */
	opacity?: boolean | number;
	/**
	 * `true` draws the line in the style's own dash pattern for it, `false` draws it solid, and a list
	 * is a dash pattern of your own — the lengths of dashes and gaps in turn, in multiples of the line
	 * width, as MapLibre's `line-dasharray` takes them. The default depends on the line: a country
	 * border is solid, the other five are dashed.
	 */
	dashed?: boolean | number[];
	/**
	 * Multiplies the line's width, at every zoom: `0.5` draws it half as wide, `2` twice. The dash
	 * follows, since a pattern is in multiples of the width, and so does a border's halo. Default `1`.
	 */
	width?: number;
};

/** A {@link LineStyle} for a border, which has a halo: `boundaries.country`, `.state` and `.disputed`. */
export type BorderStyle = LineStyle & {
	/**
	 * Whether the border is drawn on a halo — a wider line in the background colour beneath it, which
	 * keeps it legible over whatever it crosses. Default `true`.
	 */
	halo?: boolean;
};

export type ResolvedLineStyle = Required<LineStyle>;
export type ResolvedBorderStyle = Required<BorderStyle>;

/**
 * The groups that take a `LineStyle`, by their path in `layers`, and whether each is dashed unless
 * told otherwise. The one list of them: the option type and the resolved type name the same six.
 */
export const LINE_STYLE_DEFAULTS: Readonly<Record<string, boolean>> = Object.freeze({
	'roads.paths': true,
	'roads.footway': true,
	'roads.steps': true,
	'boundaries.country': false,
	'boundaries.state': true,
	'boundaries.disputed': true,
});

/** How one line group is drawn where a theme, or the style, says: what a `LineStyle` sets beyond its opacity. */
export type LineDefault = {
	readonly dashed?: boolean | readonly number[];
	readonly width?: number;
	/** Borders only. */
	readonly halo?: boolean;
};

/**
 * How a theme draws its lines where that differs from the style's defaults, per line group by the
 * same paths as {@link LINE_STYLE_DEFAULTS}. A theme's preset sits between the defaults and the
 * caller, field by field: it replaces a default, and an explicit value in `layers` replaces it.
 */
export type LinePreset = Readonly<Record<string, LineDefault>>;

/**
 * How every line group is drawn under a preset unless the caller says: dashed or not as
 * {@link LINE_STYLE_DEFAULTS} has it, at its own width, a border on its halo — with the preset's own
 * values on top.
 */
export function lineDefaults(
	preset?: LinePreset
): Readonly<Record<string, Required<Omit<LineDefault, 'halo'>> & LineDefault>> {
	return Object.fromEntries(
		Object.entries(LINE_STYLE_DEFAULTS).map(([group, dashed]) => [
			group,
			{ dashed, width: 1, ...(group.startsWith('boundaries.') && { halo: true }), ...preset?.[group] },
		])
	);
}

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
				paths?: boolean | number | LineStyle;
				footway?: boolean | number | LineStyle;
				steps?: boolean | number | LineStyle;
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
				country?: boolean | number | BorderStyle;
				state?: boolean | number | BorderStyle;
				disputed?: boolean | number | BorderStyle;
		  };
	markings?: boolean | number;
	labels?:
		| boolean
		| number
		| {
				boundaries?: boolean | number | { countries?: boolean | number; states?: boolean | number };
				places?:
					| boolean
					| number
					| {
							cities?: boolean | number;
							villages?: boolean | number;
							hamlets?: boolean | number;
							districts?: boolean | number;
					  };
				streets?: boolean | number | { names?: boolean | number; refs?: boolean | number; exits?: boolean | number };
				water?: boolean | number | { lakes?: boolean | number; rivers?: boolean | number };
				addresses?: boolean | number;
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
		paths: ResolvedLineStyle;
		footway: ResolvedLineStyle;
		steps: ResolvedLineStyle;
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
		country: ResolvedBorderStyle;
		state: ResolvedBorderStyle;
		disputed: ResolvedBorderStyle;
	};
	markings: boolean | number;
	labels: {
		boundaries: { countries: boolean | number; states: boolean | number };
		places: {
			cities: boolean | number;
			villages: boolean | number;
			hamlets: boolean | number;
			districts: boolean | number;
		};
		streets: { names: boolean | number; refs: boolean | number; exits: boolean | number };
		water: { lakes: boolean | number; rivers: boolean | number };
		addresses: boolean | number;
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

// Collapse an out-of-range opacity: ≤ 0 is fully hidden (→ false), > 1 is clamped to fully visible
// (→ true). A value in (0, 1] stays a number.
//
// An explicit `1` used to collapse to `true` as well, on the reasoning that for a layer drawn at full
// opacity the two say the same thing. True of every layer but one: `building-3d` is drawn at 0.7, and
// `true` means "leave the cartography alone", so `1` collapsed to `true` came back as 0.7 — the one
// value a caller asking for opaque buildings cannot get, while 0.99 worked. Keeping the number costs
// nothing elsewhere: `gate` treats a factor of 1 as the no-op it is, so every other group behaves
// exactly as it did.
const normalize = (v: Scalar): Scalar => {
	if (typeof v === 'number') {
		if (v <= 0) return false;
		if (v > 1) return true;
	}
	return v;
};

// Resolve a leaf: an explicit value wins, else a scalar inherited from an ancestor, else the default.
// Anything but a boolean or a number is reported: an object here used to be ignored without a word,
// which reads, to whoever wrote it, as a setting that was applied.
const leaf = (opt: unknown, inherited: Scalar | undefined, def: Scalar, path: string): Scalar => {
	if (opt != null && scalarOf(opt) === undefined) {
		reportIssue({ path, message: `expected a boolean or a number, got ${describeValue(opt)}` });
	}
	return normalize(scalarOf(opt) ?? inherited ?? def);
};

/** A dash pattern MapLibre can draw: dashes and gaps in turn, none negative, not all of them zero. */
export const isDashPattern = (value: unknown): value is number[] =>
	Array.isArray(value) &&
	value.length >= 2 &&
	value.length % 2 === 0 &&
	value.every((length) => typeof length === 'number' && Number.isFinite(length) && length >= 0) &&
	value.some((length) => length > 0);

// Resolve a line leaf: the plain value or a `LineStyle`. The opacity follows the same rule as every
// other leaf — explicit, else inherited, else visible. Everything else is the leaf's own and never
// inherited: a scalar on an ancestor says how visible its lines are, not how they are drawn.
function lineLeaf(
	opt: unknown,
	inherited: Scalar | undefined,
	path: string,
	byDefault: Required<Omit<LineDefault, 'halo'>>
): ResolvedLineStyle {
	// copied: a theme's pattern is shared by every style of that theme, and a resolved option is the caller's
	const dashedByDefault = typeof byDefault.dashed === 'boolean' ? byDefault.dashed : [...byDefault.dashed];
	if (opt === null || typeof opt !== 'object' || Array.isArray(opt)) {
		return { opacity: leaf(opt, inherited, true, path), dashed: dashedByDefault, width: byDefault.width };
	}
	const style = opt as BorderStyle;
	let dashed: boolean | number[] = dashedByDefault;
	if (typeof style.dashed === 'boolean') dashed = style.dashed;
	else if (isDashPattern(style.dashed)) dashed = [...style.dashed];
	else if (style.dashed != null) {
		reportIssue({
			path: `${path}.dashed`,
			message:
				`expected true, false or a dash pattern — an even number of dash and gap lengths, none ` +
				`negative and not all zero — got ${describeValue(style.dashed)}`,
		});
	}
	let width = byDefault.width;
	if (typeof style.width === 'number' && Number.isFinite(style.width) && style.width > 0) width = style.width;
	else if (style.width != null) {
		reportIssue({
			path: `${path}.width`,
			message: `expected a number above 0, which the line's width is multiplied by, got ${describeValue(style.width)}`,
		});
	}
	return { opacity: leaf(style.opacity, inherited, true, `${path}.opacity`), dashed, width };
}

/** A path: a line style with no halo to set. */
function pathLeaf(
	opt: unknown,
	inherited: Scalar | undefined,
	path: string,
	byDefault: Required<Omit<LineDefault, 'halo'>>
): ResolvedLineStyle {
	if (opt !== null && typeof opt === 'object' && !Array.isArray(opt)) {
		checkKeys(opt as LineStyle, { opacity: true, dashed: true, width: true }, path);
	}
	return lineLeaf(opt, inherited, path, byDefault);
}

/** A border: a line style, and whether it has its halo. */
function borderLeaf(
	opt: unknown,
	inherited: Scalar | undefined,
	path: string,
	byDefault: Required<Omit<LineDefault, 'halo'>> & LineDefault
): ResolvedBorderStyle {
	let halo = byDefault.halo ?? true;
	if (opt !== null && typeof opt === 'object' && !Array.isArray(opt)) {
		const style = opt as BorderStyle;
		checkKeys(style, { opacity: true, dashed: true, width: true, halo: true }, path);
		if (typeof style.halo === 'boolean') halo = style.halo;
		else if (style.halo != null) {
			reportIssue({ path: `${path}.halo`, message: `expected true or false, got ${describeValue(style.halo)}` });
		}
	}
	return { ...lineLeaf(opt, inherited, path, byDefault), halo };
}

// Resolve a single-level group whose children all default to visible. A scalar `opt` cascades to
// every child; an object `opt` sets them individually (unset children fall back to a scalar inherited
// from an ancestor, else `true`). `known` names the children — TypeScript holds it to the option type
// — and rejects any other key.
function resolveFlat<T>(
	opt: T,
	known: NoInfer<KnownKeys<T>>,
	path: string,
	parentInherited?: Scalar
): Record<keyof KnownKeys<T>, Scalar> {
	checkKeys(opt, known, path);
	const inherited = scalarOf(opt) ?? parentInherited;
	const obj = opt && typeof opt === 'object' ? (opt as Record<string, unknown>) : undefined;
	const out = {} as Record<keyof KnownKeys<T>, Scalar>;
	for (const key of Object.keys(known) as (keyof KnownKeys<T> & string)[]) {
		out[key] = leaf(obj?.[key], inherited, true, `${path}.${key}`);
	}
	return out;
}

/**
 * Fill in every layer-group option, applying scalar cascade and per-group defaults.
 *
 * A scalar in place of the whole object cascades to every group — the same rule that already
 * applies at every level below it. `layers: false` is the v6 equivalent of the v5 `empty` style,
 * and `layers: 0.5` dims the entire map.
 */
export function resolveLayerGroups(
	opts?: boolean | number | LayerGroupOptions,
	path = 'layers',
	preset?: LinePreset
): ResolvedLayerGroups {
	// how each line group is drawn unless the caller says: the theme's own way (`getLinePreset`), else
	// the style's default
	const drawnAs = lineDefaults(preset);
	checkFinite(opts, path);
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

	// labels are two levels deep (labels → water → lakes/rivers); a scalar at either level cascades down.
	const labelsInherited = scalarOf(o.labels);
	const labels = o.labels && typeof o.labels === 'object' ? o.labels : undefined;
	checkKeys(
		o.labels,
		{ boundaries: true, places: true, streets: true, water: true, addresses: true },
		`${path}.labels`
	);

	const boundariesInherited = scalarOf(o.boundaries);
	const boundaries = o.boundaries && typeof o.boundaries === 'object' ? o.boundaries : undefined;
	checkKeys(o.boundaries, { country: true, state: true, disputed: true }, `${path}.boundaries`);
	const boundary = (key: 'country' | 'state' | 'disputed'): ResolvedBorderStyle =>
		borderLeaf(boundaries?.[key], boundariesInherited, `${path}.boundaries.${key}`, drawnAs[`boundaries.${key}`]);

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
			motorways: leaf(roads?.motorways, roadsInherited, true, `${path}.roads.motorways`),
			highways: leaf(roads?.highways, roadsInherited, true, `${path}.roads.highways`),
			streets: {
				residential: leaf(streets?.residential, streetsInherited, true, `${path}.roads.streets.residential`),
				service: leaf(streets?.service, streetsInherited, true, `${path}.roads.streets.service`),
				pedestrian: leaf(streets?.pedestrian, streetsInherited, true, `${path}.roads.streets.pedestrian`),
				track: leaf(streets?.track, streetsInherited, true, `${path}.roads.streets.track`),
				bus: leaf(streets?.bus, streetsInherited, true, `${path}.roads.streets.bus`),
			},
			paths: pathLeaf(roads?.paths, roadsInherited, `${path}.roads.paths`, drawnAs['roads.paths']),
			footway: pathLeaf(roads?.footway, roadsInherited, `${path}.roads.footway`, drawnAs['roads.footway']),
			steps: pathLeaf(roads?.steps, roadsInherited, `${path}.roads.steps`, drawnAs['roads.steps']),
		},
		transit: {
			rail: leaf(transit?.rail, transitInherited, true, `${path}.transit.rail`),
			aerialways: leaf(transit?.aerialways, transitInherited, true, `${path}.transit.aerialways`),
			ferries: leaf(transit?.ferries, transitInherited, true, `${path}.transit.ferries`),
			// stops are icons: an explicit setting wins, else the `transit` scalar, else the `icons` alias.
			stops: leaf(transit?.stops, transitInherited ?? icons, true, `${path}.transit.stops`),
		},
		buildings: leaf(o.buildings, undefined, true, `${path}.buildings`),
		sites: leaf(o.sites, undefined, true, `${path}.sites`),
		airport: leaf(o.airport, undefined, true, `${path}.airport`),
		pois: leaf(o.pois, icons, true, `${path}.pois`),
		boundaries: {
			country: boundary('country'),
			state: boundary('state'),
			disputed: boundary('disputed'),
		},
		markings: leaf(o.markings, icons, true, `${path}.markings`),
		labels: {
			boundaries: resolveFlat(
				labels?.boundaries,
				{ countries: true, states: true },
				`${path}.labels.boundaries`,
				labelsInherited
			),
			places: resolveFlat(
				labels?.places,
				{ cities: true, villages: true, hamlets: true, districts: true },
				`${path}.labels.places`,
				labelsInherited
			),
			streets: resolveFlat(
				labels?.streets,
				{ names: true, refs: true, exits: true },
				`${path}.labels.streets`,
				labelsInherited
			),
			water: resolveFlat(labels?.water, { lakes: true, rivers: true }, `${path}.labels.water`, labelsInherited),
			addresses: leaf(labels?.addresses, labelsInherited, true, `${path}.labels.addresses`),
		},
		icons: leaf(o.icons, undefined, true, `${path}.icons`),
	};
}
