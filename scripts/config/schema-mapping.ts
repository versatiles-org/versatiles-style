/**
 * Candidate source-layer mapping from Shortbread to another schema — the input that turns
 * `npm run schema-gate` from a name diff into a decision.
 *
 * ⚠️ **Partly verified.** Every entry started as a hypothesis from the two vendored schema records
 * (`src/shortbread/schema.ts`, `src/omt/schema.ts` — which state layer names, zooms and *field names*)
 * plus the published OpenMapTiles schema. The entries marked "verified" in their note have since been
 * checked against real tiles with `npm run schema-values`, which reports the values a field actually
 * carries; the rest have not. A record alone cannot settle a value claim: that
 * `transportation.subclass` exists is verifiable from the record, that it carries `pier` is not.
 * See SCHEMA-SUPPORT-PLAN.md §7 step 2.
 *
 * Sampling has corrected this table five times so far, in both directions — which is the reason it is
 * worth keeping rather than deleting once the port is done: it is the record of what was checked and how.
 *
 * The largest correction was a single wrong assumption with three consequences. "`transportation` is
 * lines only" is false: one OpenMapTiles source-layer carries mixed geometry, and the sample found
 * `class: pier`, `class: path` and `class: bridge` all present as **polygons**. Those are exactly the
 * counterparts of Shortbread's separate `pier_polygons`, `street_polygons` and `bridges` layers, so three
 * verdicts of `none` became `partial` and every remaining `none` is now tile-checked rather than
 * reasoned. Geometry type is reported per value by `npm run schema-values`, so the same mistake cannot
 * be made silently again.
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
		note: 'verified: two mechanisms, not one — `brunnel: bridge` flags the carriageway, and a separate `class: bridge` carries the deck as polygons (176 observed). The casing area is not gone.',
	},
	buildings: {
		targets: ['building'],
		confidence: 'exact',
		note: 'verified: height→render_height, min_height→render_min_height, hide_3d kept, and the sample found no class/subclass at all — an unfiltered fill, as in Shortbread. Starts z13 rather than z14.',
	},
	dam_lines: {
		targets: [],
		confidence: 'none',
		note: 'verified: the Hoover Dam tile carries the dam only as a POI point and an access road — no dam class in `waterway`, `water` or `transportation`.',
	},
	dam_polygons: {
		targets: [],
		confidence: 'none',
		note: 'verified with dam_lines, on the same tile: no dam geometry in any layer, at any geometry type.',
	},
	ferries: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'class=ferry; the route name needs `transportation_name`, since `transportation` has no name fields.',
	},
	land: {
		targets: ['landcover', 'landuse'],
		confidence: 'partial',
		note: 'verified: 15 layers split across two, and the fidelity is in `landcover.subclass` (park, garden, scrub, scree, glacier…) — `class` has only 7 values. `park` is not involved; `landfill` has no counterpart.',
	},
	ocean: {
		targets: ['water'],
		confidence: 'partial',
		note: 'verified: `class: ocean` inside `water` rather than its own layer, so the bottom-most fill becomes a filter and moves into the water module.',
	},
	pier_lines: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'verified: `class: pier`, as lines (5 observed) alongside the polygons — it is a `class`, not the `subclass` the record made it look like.',
	},
	pier_polygons: {
		targets: ['transportation'],
		confidence: 'partial',
		note: 'verified: `class: pier` occurs as polygons (48 in the Rotterdam port tile), so a pier area is a geometry-type filter on `transportation`, not a missing concept.',
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
		targets: ['landuse'],
		confidence: 'partial',
		note: 'verified: education/hospital/pitch/track/military are `landuse` classes, but parking, bicycle_parking, prison and construction were in no sampled tile — 5 of 10 kinds are lost.',
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
		targets: ['transportation'],
		confidence: 'partial',
		note: 'verified: `class: path` carries 587 polygons in the sample (pedestrian squares and the like), so street areas exist behind a geometry-type filter. Runway/taxiway areas come from `aeroway` instead.',
	},
	streets: {
		targets: ['transportation', 'aeroway'],
		confidence: 'partial',
		note: 'verified in part: aeroway carries taxiway/apron/runway/helipad/aerodrome, and transportation collapses Shortbread’s residential/unclassified/living_street into one `minor` class. bridge/tunnel→brunnel, link→ramp, no `oneway_reverse`.',
	},
	streets_polygons_labels: {
		targets: ['transportation_name'],
		confidence: 'partial',
		note: 'follows street_polygons, which does exist after all; the label would come from `transportation_name` (`class: path`). Unverified as a pairing — Shortbread renders this for `pedestrian` only.',
	},
	water_lines: {
		targets: ['waterway'],
		confidence: 'exact',
		note: 'verified: all five classes (river, canal, stream, ditch, drain) observed, plus brunnel for bridge/tunnel and a bonus `intermittent`.',
	},
	water_lines_labels: {
		targets: ['waterway'],
		confidence: 'partial',
		note: '`waterway` carries its own names, so the label layer is the same source-layer, not a second one.',
	},
	water_polygons: {
		targets: ['water'],
		confidence: 'exact',
		note: 'verified: lake, pond, river, swimming_pool and ocean observed (`dock` was not, in a twelve-tile sample).',
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
