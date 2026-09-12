/**
 * Candidate source-layer mapping from Shortbread to another schema — the input that turns
 * `npm run schema-gate` from a name diff into a decision.
 *
 * ⚠️ **This is a hypothesis, not ground truth.** Every entry was derived from two things only: the two
 * vendored schema records (`src/shortbread/schema.ts`, `src/omt/schema.ts` — which state layer names,
 * zooms and *field names*) and the published OpenMapTiles schema. No entry has been confirmed against
 * real tiles, and a record cannot state which *values* a field carries: that `transportation.subclass`
 * exists is verifiable here, that it carries `pier` is not. Confirm `partial` and `none` before
 * relying on them. See SCHEMA-SUPPORT-PLAN.md §7 step 2.
 *
 * ── Why a mapping is needed at all ────────────────────────────────────────────
 *
 * Without one the gate reports that OpenMapTiles binds 0 of 40 layer groups, which is true and
 * useless: the two schemas share no layer names, so a name-level diff measures vocabulary, not
 * capability. With it, the gate answers the question the plan's stop criterion is written against —
 * *which cartographic concepts does the other tileset not carry at all?*
 *
 * ── Why it is `scripts/` and not `src/` ───────────────────────────────────────
 *
 * It is assessment, not cartography. A real port maps at *kind* level, not layer level: Shortbread's
 * `streets` carries motorways and airport runways in one layer, which OpenMapTiles splits across
 * `transportation` and `aeroway`, and its `land` kinds spread across `landcover`, `landuse` and
 * `park`. Those are one-to-many both ways, which is why `targets` is a list and why `partial` is the
 * most common verdict rather than the exception.
 */

/**
 * How well another schema carries one Shortbread source-layer.
 *
 * - `exact`   — same concept, every field the style reads has a counterpart (renames are fine).
 * - `partial` — the concept is there but decomposed differently, or a field the style reads has no
 *               counterpart, so the cartography has to be re-derived rather than re-pointed.
 * - `none`    — nothing in the other schema carries it. This is the verdict the gate counts.
 */
export type Confidence = 'exact' | 'partial' | 'none';

export type LayerMapping = {
	/** Source-layers in the target schema that carry some of this concept. Empty iff `none`. */
	targets: string[];
	confidence: Confidence;
	/** What a port would have to do, or why the verdict is `none`. One line, specific. */
	note: string;
};

/**
 * Shortbread source-layer → OpenMapTiles, for all 26 source-layers the style reads.
 *
 * Field evidence cited in the notes is from the vendored records: OpenMapTiles `transportation` does
 * carry `brunnel`, `ramp`, `oneway`, `service`, `class` and `subclass`; `building` carries
 * `render_height`/`render_min_height`/`hide_3d`; `boundary` carries `admin_level`, `disputed` and
 * `maritime`. Absences are equally checked — there is no `population` on `place`, no `way_area`
 * anywhere, and `transportation` carries no name fields at all.
 */
export const SHORTBREAD_TO_OMT: Record<string, LayerMapping> = {
	addresses: {
		targets: ['housenumber'],
		confidence: 'partial',
		note: 'housenumber only (both z14); no `unit`, `block` or `housename`, so the unit suffix drops.',
	},
	aerialways: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'class=aerialway with the kind in `subclass`; subclass *values* are unverified here.',
	},
	boundaries: {
		targets: ['boundary'],
		confidence: 'exact',
		note: 'admin_level, disputed and maritime all present under the same names.',
	},
	boundary_labels: {
		targets: ['place'],
		confidence: 'partial',
		note: 'country/state labels are `place` classes; no `way_area`, so label sizing must come from `rank`.',
	},
	bridges: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'brunnel=bridge is a flag on the line, not a separate area layer — the bridge casing area is gone.',
	},
	buildings: {
		targets: ['building'],
		confidence: 'exact',
		note: 'height→render_height, min_height→render_min_height, hide_3d kept; starts z13 rather than z14.',
	},
	dam_lines: {
		targets: [],
		confidence: 'none',
		note: 'OpenMapTiles `waterway` classes are stream/river/canal/drain/ditch; dams are not carried.',
	},
	dam_polygons: {
		targets: [],
		confidence: 'none',
		note: 'As dam_lines — no dam concept in `water` or `waterway`.',
	},
	ferries: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'class=ferry; the route name needs `transportation_name`, since `transportation` has no name fields.',
	},
	land: {
		targets: ['landcover', 'landuse', 'park'],
		confidence: 'partial',
		note: '15 style layers keyed on one `kind` split across three layers with coarser, differently-cut classes.',
	},
	ocean: {
		targets: ['water'],
		confidence: 'partial',
		note: 'class=ocean inside `water` rather than its own layer — the bottom-most fill becomes a filter.',
	},
	pier_lines: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'piers are expected under `transportation.subclass`; unverified, and there is no pier area layer.',
	},
	pier_polygons: {
		targets: [],
		confidence: 'none',
		note: 'No polygon pier concept; `transportation` is lines only.',
	},
	place_labels: {
		targets: ['place'],
		confidence: 'partial',
		note: 'class instead of kind, and no `population` — size/visibility must be re-derived from `rank`/`capital`.',
	},
	pois: {
		targets: ['poi'],
		confidence: 'partial',
		note: 'raw OSM tags (amenity, shop, tourism, …) vs class/subclass: a full re-derivation, and §5.5 caps it at existing icons.',
	},
	public_transport: {
		targets: ['poi'],
		confidence: 'partial',
		note: 'stations/stops are `poi` classes (with `agg_stop`), not their own layer; z11 rather than z0.',
	},
	sites: {
		targets: ['landuse', 'park'],
		confidence: 'partial',
		note: 'university/hospital/military-style sites are `landuse` classes; coverage per kind is unverified.',
	},
	street_labels: {
		targets: ['transportation_name'],
		confidence: 'exact',
		note: 'names, `ref`, `ref_length`, `network` and route_* relations are all present.',
	},
	street_labels_points: {
		targets: ['transportation_name'],
		confidence: 'partial',
		note: 'no separate point layer — point labels come from the same layer, so the split must be by geometry.',
	},
	street_polygons: {
		targets: [],
		confidence: 'none',
		note: 'No street-area polygons (pedestrian squares, service areas); `transportation` is lines only.',
	},
	streets: {
		targets: ['transportation', 'aeroway'],
		confidence: 'partial',
		note: 'kind→class/subclass, bridge/tunnel→brunnel, link→ramp; runways/taxiways move to `aeroway` (z10+), and there is no `oneway_reverse`.',
	},
	streets_polygons_labels: {
		targets: [],
		confidence: 'none',
		note: 'Follows street_polygons — nothing to label.',
	},
	water_lines: {
		targets: ['waterway'],
		confidence: 'exact',
		note: 'class plus brunnel covers kind/bridge/tunnel; `intermittent` is a bonus.',
	},
	water_lines_labels: {
		targets: ['waterway'],
		confidence: 'partial',
		note: '`waterway` carries its own names, so the label layer is the same source-layer, not a second one.',
	},
	water_polygons: {
		targets: ['water'],
		confidence: 'exact',
		note: 'class covers the kinds the fills need.',
	},
	water_polygons_labels: {
		targets: ['water_name'],
		confidence: 'partial',
		note: 'present, but no `way_area`, so lake-label sizing by area has to be re-derived.',
	},
};

/** Every mapping table the gate knows, keyed by the schema name `npm run vendor-schema` uses. */
export const MAPPINGS: Record<string, Record<string, LayerMapping>> = {
	omt: SHORTBREAD_TO_OMT,
};
