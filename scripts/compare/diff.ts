import { normalize } from './normalize.js';

export interface ValueChange {
	/** Dotted path within the layer / object, e.g. `paint.text-color`. */
	path: string;
	v5: unknown;
	v6: unknown;
}

export interface LayerChange {
	id: string;
	changes: ValueChange[];
}

export interface StyleDiff {
	root: ValueChange[];
	sources: { onlyV5: string[]; onlyV6: string[]; changed: LayerChange[] };
	layers: {
		onlyV5: string[];
		onlyV6: string[];
		changed: LayerChange[];
		reordered: { id: string; v5Index: number; v6Index: number }[];
		v5Count: number;
		v6Count: number;
	};
}

interface StyleLike {
	layers?: { id: string; [k: string]: unknown }[];
	sources?: Record<string, unknown>;
	[k: string]: unknown;
}

const ROOT_KEYS = [
	'version',
	'name',
	'metadata',
	'glyphs',
	'sprite',
	'sky',
	'projection',
	'light',
	'terrain',
	'bearing',
	'pitch',
	'center',
	'zoom',
];

/** Collect leaf-level differences between two normalized values. */
function collect(a: unknown, b: unknown, path: string, out: ValueChange[]): void {
	if (JSON.stringify(a) === JSON.stringify(b)) return;

	const isObj = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);
	const aObj = isObj(a);
	const bObj = isObj(b);

	// Descend into plain objects so the report names the property that changed
	// rather than dumping both whole objects. Arrays (expressions) are atomic.
	// A missing object on one side still descends, so an added `layout` aggregates
	// under `layout.line-join` rather than as one opaque object-vs-absent entry.
	if ((aObj || a === undefined) && (bObj || b === undefined) && (aObj || bObj)) {
		const aRec = (a ?? {}) as Record<string, unknown>;
		const bRec = (b ?? {}) as Record<string, unknown>;
		const keys = new Set([...Object.keys(aRec), ...Object.keys(bRec)]);
		for (const key of [...keys].sort()) {
			collect(aRec[key], bRec[key], path ? `${path}.${key}` : key, out);
		}
		return;
	}

	out.push({ path, v5: a, v6: b });
}

function diffObjects(a: unknown, b: unknown): ValueChange[] {
	const out: ValueChange[] = [];
	collect(a, b, '', out);
	return out;
}

export function diffStyles(v5raw: StyleLike, v6raw: StyleLike): StyleDiff {
	const v5 = normalize(v5raw) as StyleLike;
	const v6 = normalize(v6raw) as StyleLike;

	// ── Root ──────────────────────────────────────────────────────────────────
	const root: ValueChange[] = [];
	for (const key of ROOT_KEYS) {
		collect(v5[key], v6[key], key, root);
	}

	// ── Sources ───────────────────────────────────────────────────────────────
	const s5 = (v5.sources ?? {}) as Record<string, unknown>;
	const s6 = (v6.sources ?? {}) as Record<string, unknown>;
	const sourceChanged: LayerChange[] = [];
	for (const id of Object.keys(s5)) {
		if (!(id in s6)) continue;
		const changes = diffObjects(s5[id], s6[id]);
		if (changes.length > 0) sourceChanged.push({ id, changes });
	}

	// ── Layers ────────────────────────────────────────────────────────────────
	const l5 = v5.layers ?? [];
	const l6 = v6.layers ?? [];
	const m5 = new Map(l5.map((l, i) => [l.id, { layer: l, index: i }]));
	const m6 = new Map(l6.map((l, i) => [l.id, { layer: l, index: i }]));

	const changed: LayerChange[] = [];
	const reordered: { id: string; v5Index: number; v6Index: number }[] = [];

	// Compare shared layers in v5 order, and track how far each moved relative to
	// its neighbours rather than by absolute index (which every insertion shifts).
	const shared5 = l5.filter((l) => m6.has(l.id)).map((l) => l.id);
	const shared6 = l6.filter((l) => m5.has(l.id)).map((l) => l.id);

	for (const id of shared5) {
		const a = m5.get(id)!;
		const b = m6.get(id)!;
		const changes = diffObjects({ ...a.layer, id: undefined }, { ...b.layer, id: undefined });
		if (changes.length > 0) changed.push({ id, changes });

		const rank5 = shared5.indexOf(id);
		const rank6 = shared6.indexOf(id);
		if (rank5 !== rank6) reordered.push({ id, v5Index: rank5, v6Index: rank6 });
	}

	return {
		root,
		sources: {
			onlyV5: Object.keys(s5).filter((k) => !(k in s6)),
			onlyV6: Object.keys(s6).filter((k) => !(k in s5)),
			changed: sourceChanged,
		},
		layers: {
			onlyV5: l5.filter((l) => !m6.has(l.id)).map((l) => l.id),
			onlyV6: l6.filter((l) => !m5.has(l.id)).map((l) => l.id),
			changed,
			reordered,
			v5Count: l5.length,
			v6Count: l6.length,
		},
	};
}
