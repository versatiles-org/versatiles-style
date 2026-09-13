import type { TileJSONSpecification } from '../types/index.js';
import { SCHEMA_NAMES, SCHEMA_SIGNATURES, type SchemaName } from '../lib/schema-signatures.js';

export type { SchemaName } from '../lib/schema-signatures.js';

/** How well a tileset's source-layers fit one schema. */
export type SchemaScore = {
	schema: SchemaName;
	/** Tileset source-layers counted as this schema's. */
	matched: string[];
	/** This schema's source-layers the tileset does not carry — an extract, or a different schema. */
	missing: string[];
	/** Tileset source-layers not counted as this schema's. */
	extra: string[];
	/** `matched` as a share of all the tileset's source-layers, 0–1. */
	score: number;
};

/**
 * The result of {@link guessSchema}.
 *
 * - `vector` — `schema` is the recognised schema, or `undefined` when none qualifies or two tie.
 *   `candidates` scores every schema, best first, so a caller can show why.
 * - `raster` — a TileJSON without `vector_layers`. Raster tiles have no schema.
 * - `unknown` — not a TileJSON at all.
 */
export type SchemaGuess =
	| { type: 'vector'; schema: SchemaName | undefined; candidates: SchemaScore[] }
	| { type: 'raster' }
	| { type: 'unknown' };

/** A tileset must carry this many of a schema's source-layers to be recognised by count alone. */
const STRONG_MATCH_COUNT = 8;

/**
 * Whether `matched` of a tileset's `total` source-layers are enough to call it a schema's.
 *
 * Recognised when **at least half** its source-layers are the schema's, or when it carries at least
 * `STRONG_MATCH_COUNT` of them outright.
 *
 * ── Why not "3 or more", as this once was ─────────────────────────────────────
 *
 * Three is a low bar for a coincidence. Protomaps carries `boundaries`, `buildings` and `pois` — three
 * generic names that Shortbread also uses, with entirely different fields behind them — so a Protomaps
 * tileset scored exactly 3 and was handed a full Shortbread style that read nothing the tiles had.
 *
 * The two clauses cover the two honest cases. A **rate** test catches a tileset that is mostly this
 * schema, including a small extract of a handful of layers. A **count** test catches a tileset that is
 * this schema plus a pile of extra layers of its own, where the rate would fall below half.
 */
export function qualifies(matched: number, total: number): boolean {
	return total > 0 && (matched / total >= 0.5 || matched >= STRONG_MATCH_COUNT);
}

type Layer = { id: string; fields: ReadonlySet<string> };

/** The tileset's source-layers, tolerating the malformed entries a hand-written TileJSON can have. */
function readLayers(vectorLayers: readonly unknown[]): Layer[] {
	const layers = new Map<string, Layer>();
	for (const entry of vectorLayers) {
		if (entry === null || typeof entry !== 'object') continue;
		const { id, fields } = entry as { id?: unknown; fields?: unknown };
		if (typeof id !== 'string' || layers.has(id)) continue;
		const names = fields !== null && typeof fields === 'object' ? Object.keys(fields) : [];
		layers.set(id, { id, fields: new Set(names) });
	}
	return [...layers.values()];
}

/**
 * Does this source-layer count as `schema`'s?
 *
 * An id only `schema` uses always does. An id several schemas use counts for those whose distinguishing
 * fields the layer carries. When it carries none of anyone's — no `fields`, or only generic ones like
 * `name` — the id is evidence for every schema that uses it, and the ids around it decide.
 */
function countsFor(schema: SchemaName, layer: Layer): boolean {
	const own = SCHEMA_SIGNATURES[schema][layer.id];
	if (own === undefined) return false;
	const sharing = SCHEMA_NAMES.filter((name) => SCHEMA_SIGNATURES[name][layer.id] !== undefined);
	if (sharing.length === 1) return true;
	const hasEvidence = (name: SchemaName) => SCHEMA_SIGNATURES[name][layer.id].some((f) => layer.fields.has(f));
	return sharing.some(hasEvidence) ? hasEvidence(schema) : true;
}

function scoreSchema(schema: SchemaName, layers: Layer[]): SchemaScore {
	const matched: string[] = [];
	const extra: string[] = [];
	for (const layer of layers) (countsFor(schema, layer) ? matched : extra).push(layer.id);
	const present = new Set(layers.map((layer) => layer.id));
	const missing = Object.keys(SCHEMA_SIGNATURES[schema]).filter((id) => !present.has(id));
	const score = layers.length === 0 ? 0 : matched.length / layers.length;
	return { schema, matched, missing, extra, score };
}

/**
 * Recognise the vector tile schema of a tileset from its TileJSON.
 *
 * Reads only `vector_layers`: the source-layer ids, and the `fields` of the few ids two schemas share.
 * `name`, `attribution` and the like are not used — they describe who built a tileset, not what is in
 * it. Synchronous and free of I/O; for a URL, download the document with `fetchTileJSON()` first.
 *
 * Knows Shortbread, OpenMapTiles and Protomaps without importing any of their styles, so it costs the
 * root bundle a small table rather than two schemas. Build the style from the matching subpath:
 *
 * ```ts
 * import { guessSchema, osm } from '@versatiles/style';
 * import { omt } from '@versatiles/style/omt';
 * const guess = guessSchema(tileJSON);
 * if (guess.type === 'vector' && guess.schema === 'openmaptiles') style = omt({ urls: { omt: tileJSON } });
 * ```
 *
 * A schema is recognised when it qualifies (at least half the tileset's source-layers are its, or at
 * least eight are) and scores strictly higher than every other schema. Never throws.
 */
export function guessSchema(tileJSON: TileJSONSpecification): SchemaGuess {
	if (tileJSON === null || typeof tileJSON !== 'object' || Array.isArray(tileJSON)) return { type: 'unknown' };
	const vectorLayers = (tileJSON as { vector_layers?: unknown }).vector_layers;
	if (vectorLayers == null) {
		const tiles = (tileJSON as { tiles?: unknown }).tiles;
		return Array.isArray(tiles) ? { type: 'raster' } : { type: 'unknown' };
	}
	if (!Array.isArray(vectorLayers)) return { type: 'unknown' };

	const layers = readLayers(vectorLayers);
	// `sort` is stable, so equal scores keep the order of SCHEMA_NAMES.
	const candidates = SCHEMA_NAMES.map((schema) => scoreSchema(schema, layers)).sort((a, b) => b.score - a.score);
	const [best, runnerUp] = candidates;
	const recognised = qualifies(best.matched.length, layers.length) && best.score > runnerUp.score;
	return { type: 'vector', schema: recognised ? best.schema : undefined, candidates };
}
