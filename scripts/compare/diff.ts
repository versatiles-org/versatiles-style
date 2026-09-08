import { normalize } from './normalize.js';

export interface ValueChange {
	/** Dotted path within the layer / object, e.g. `paint.text-color`. */
	path: string;
	left: unknown;
	right: unknown;
}

export interface LayerChange {
	id: string;
	changes: ValueChange[];
}

export interface StyleDiff {
	root: ValueChange[];
	sources: { onlyLeft: string[]; onlyRight: string[]; changed: LayerChange[] };
	layers: {
		onlyLeft: string[];
		onlyRight: string[];
		changed: LayerChange[];
		reordered: { id: string; leftIndex: number; rightIndex: number }[];
		leftCount: number;
		rightCount: number;
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

	out.push({ path, left: a, right: b });
}

function diffObjects(a: unknown, b: unknown): ValueChange[] {
	const out: ValueChange[] = [];
	collect(a, b, '', out);
	return out;
}

export function diffStyles(leftRaw: StyleLike, rightRaw: StyleLike): StyleDiff {
	const left = normalize(leftRaw) as StyleLike;
	const right = normalize(rightRaw) as StyleLike;

	// ── Root ──────────────────────────────────────────────────────────────────
	const root: ValueChange[] = [];
	for (const key of ROOT_KEYS) {
		collect(left[key], right[key], key, root);
	}

	// ── Sources ───────────────────────────────────────────────────────────────
	const s5 = (left.sources ?? {}) as Record<string, unknown>;
	const s6 = (right.sources ?? {}) as Record<string, unknown>;
	const sourceChanged: LayerChange[] = [];
	for (const id of Object.keys(s5)) {
		if (!(id in s6)) continue;
		const changes = diffObjects(s5[id], s6[id]);
		if (changes.length > 0) sourceChanged.push({ id, changes });
	}

	// ── Layers ────────────────────────────────────────────────────────────────
	const l5 = left.layers ?? [];
	const l6 = right.layers ?? [];
	const m5 = new Map(l5.map((l, i) => [l.id, { layer: l, index: i }]));
	const m6 = new Map(l6.map((l, i) => [l.id, { layer: l, index: i }]));

	const changed: LayerChange[] = [];
	const reordered: { id: string; leftIndex: number; rightIndex: number }[] = [];

	// Compare shared layers in left-hand order, and track how far each moved relative to
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
		if (rank5 !== rank6) reordered.push({ id, leftIndex: rank5, rightIndex: rank6 });
	}

	return {
		root,
		sources: {
			onlyLeft: Object.keys(s5).filter((k) => !(k in s6)),
			onlyRight: Object.keys(s6).filter((k) => !(k in s5)),
			changed: sourceChanged,
		},
		layers: {
			onlyLeft: l5.filter((l) => !m6.has(l.id)).map((l) => l.id),
			onlyRight: l6.filter((l) => !m5.has(l.id)).map((l) => l.id),
			changed,
			reordered,
			leftCount: l5.length,
			rightCount: l6.length,
		},
	};
}
