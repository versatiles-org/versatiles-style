import { describe, expect, it } from 'vitest';
import type { FillLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/index.js';
import { SLOT_BELOW_FILLS, SLOT_BELOW_LABELS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS } from './index.js';

// End-to-end checks on the assembled layer list (structure, language handling, slot anchors,
// render order) — the colocated successors of the old getShortbreadLayers() tests.

function layersFor(language?: string, languageStrict?: boolean): SymbolLayerSpecification[] {
	return osm({ text: { language, languageStrict } }).layers as unknown as SymbolLayerSpecification[];
}

describe('assembled layers', () => {
	it('should return a non-empty array of layers with id and type', () => {
		const layers = layersFor('en');
		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	const labelField = (layers: SymbolLayerSpecification[]) =>
		(layers.find((l) => l.id === 'label-street-pedestrian') as SymbolLayerSpecification).layout?.['text-field'];

	it('should use local name when language is "local"', () => {
		expect(labelField(layersFor('local'))).toStrictEqual(['get', 'name']);
	});

	it('should use local name when language is empty string', () => {
		expect(labelField(layersFor(''))).toStrictEqual(['get', 'name']);
	});

	it('should handle language suffix "en" with fallback', () => {
		expect(labelField(layersFor('en'))).toStrictEqual(['coalesce', ['get', 'name_en'], ['get', 'name']]);
	});

	it('should handle language suffix "fr" with fallback', () => {
		expect(labelField(layersFor('fr'))).toStrictEqual(['coalesce', ['get', 'name_fr'], ['get', 'name']]);
	});

	it('should use strict language field when languageStrict is true', () => {
		expect(labelField(layersFor('de', true))).toStrictEqual(['get', 'name_de']);
	});

	it('should render busway and bus_guideway as streets', () => {
		const ids = new Set(layersFor('local').map((l) => l.id));
		// both kinds are drawn by one merged `street-bus` layer per band (see MERGES)
		expect(ids.has('street-bus')).toBe(true);
		expect(ids.has('bridge-street-bus')).toBe(true);
		expect(ids.has('tunnel-street-bus')).toBe(true);
		expect(ids.has('transport-busway')).toBe(false);
		expect(ids.has('transport-bus_guideway')).toBe(false);
	});

	it('should sort place labels by population', () => {
		const cityLayer = layersFor('local').find((l) => l.id === 'label-place-city') as SymbolLayerSpecification;
		expect(cityLayer.layout?.['symbol-sort-key']).toStrictEqual(['-', ['to-number', ['get', 'population'], 0]]);
	});

	it('should create appropriate filters for land layers', () => {
		const landLayer = layersFor('en').find((l) => l.id === 'land-agriculture') as unknown as FillLayerSpecification;
		expect(landLayer.filter).toEqual([
			'in',
			['get', 'kind'],
			[
				'literal',
				[
					'brownfield',
					'farmland',
					'farmyard',
					'greenfield',
					'greenhouse_horticulture',
					'orchard',
					'plant_nursery',
					'vineyard',
				],
			],
		]);
	});

	it('should include all four slot anchor layers', () => {
		const ids = layersFor('local').map((l) => l.id);
		expect(ids).toContain(SLOT_BELOW_FILLS);
		expect(ids).toContain(SLOT_BELOW_STREETS);
		expect(ids).toContain(SLOT_BELOW_SYMBOLS);
		expect(ids).toContain(SLOT_BELOW_LABELS);
	});

	it('should order slot layers correctly in the render stack', () => {
		const layers = layersFor('local');
		const indexOf = (id: string) => layers.findIndex((l) => l.id === id);

		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('water-ocean'));
		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('land-forest'));
		expect(indexOf(SLOT_BELOW_STREETS)).toBeLessThan(indexOf('street-minor'));
		expect(indexOf(SLOT_BELOW_STREETS)).toBeGreaterThan(indexOf('building'));
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeLessThan(indexOf('poi-amenity'));
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeGreaterThan(indexOf('bridge-street-motorway'));
		expect(indexOf(SLOT_BELOW_LABELS)).toBeLessThan(indexOf('label-place-city'));
		expect(indexOf('symbol-transit-station')).toBeGreaterThan(indexOf('label-street-residential'));
		expect(indexOf('symbol-transit-station')).toBeLessThan(indexOf('label-place-city'));
		// Transit stops sit inside the label stack, above the anchor: they are name labels with an icon,
		// and they have to outrank the street names they stand on (see the assembly order).
		expect(indexOf(SLOT_BELOW_LABELS)).toBeLessThan(indexOf('symbol-transit-airport'));
	});

	it('slot anchor layers should be invisible background layers', () => {
		const layers = layersFor('local');
		for (const slotId of [SLOT_BELOW_FILLS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS, SLOT_BELOW_LABELS]) {
			const slot = layers.find((l) => l.id === slotId);
			expect(slot?.type).toBe('background');
			expect((slot as { paint?: Record<string, unknown> })?.paint?.['background-opacity']).toBe(0);
		}
	});
});

describe('underground treatment', () => {
	// A tunnel layer must actually LOOK different from the same road on the surface. Snapshots only
	// record whatever shipped last, so this states the property instead: for every `tunnel-` layer
	// that has a surface counterpart, at least one cue must differ — and the cue must be one that
	// really renders.
	//
	// Before `underground()`, `tunnel-street-primary` differed from `street-primary` by ΔE 3.6 and
	// nothing else — invisible — and every tunnel dash in the style was cancelled by its round
	// line-cap. Both bugs pass a snapshot test and fail this one.

	/** CIE76 ΔE. ~2.3 is a just-noticeable difference on large flat areas; a thin line needs more. */
	function deltaE(a: string, b: string): number {
		const lab = (css: string): number[] => {
			const [r, g, b2] = css
				.match(/[\d.]+/g)!
				.slice(0, 3)
				.map(Number);
			const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
			const [R, G, B] = [lin(r), lin(g), lin(b2)];
			const xyz = [
				(0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047,
				0.2126 * R + 0.7152 * G + 0.0722 * B,
				(0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883,
			].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
			return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
		};
		const [A, B] = [lab(a), lab(b)];
		return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
	}

	/** A round cap extends each dash by half a line width at both ends, closing any gap below 1.0. */
	function dashRenders(layer: Record<string, unknown>): boolean {
		const paint = (layer.paint ?? {}) as Record<string, unknown>;
		const dash = paint['line-dasharray'] as number[] | undefined;
		if (!dash) return false;
		const cap = ((layer.layout ?? {}) as Record<string, string>)['line-cap'] ?? 'butt';
		return cap !== 'round' || dash[1] > 1;
	}

	// Roads whose surface colour is already at (or within a hair of) `bg`, so fading toward `bg`
	// cannot move them — see the KNOWN GAP note on `UNDERGROUND.fade`. They render underground
	// exactly as they do on the surface. Listed exactly rather than skipped: if the treatment stops
	// reaching another road this list grows and the test fails, and if one of these gains a cue the
	// list shrinks and the test fails too, so the gap has to stay a deliberate decision.
	// Merged layers appear once under their merged ID (see MERGES in layers/index.ts): the two
	// bus kinds as `tunnel-street-bus`, and livingstreet/residential/unclassified bicycle overlays
	// as `tunnel-street-minor-bicycle`.
	const NO_COLOUR_HEADROOM = [
		'tunnel-way-cycleway',
		'tunnel-street-service',
		'tunnel-street-bus',
		'tunnel-street-track-bicycle',
		'tunnel-street-pedestrian-bicycle',
		'tunnel-street-service-bicycle',
		'tunnel-street-minor-bicycle',
	];

	it('every tunnel road differs visibly from the same road on the surface', () => {
		const layers = layersFor('local') as unknown as Record<string, unknown>[];
		const byId = new Map(layers.map((l) => [l.id as string, l]));

		// Grouped by road, not by layer: a reader sees the casing and the fill as one road, so the cue
		// only has to be on one of them. Several casings are near-white and have no room to fade.
		const roads = new Map<string, Record<string, unknown>[]>();
		for (const l of layers) {
			const id = l.id as string;
			if (!id.startsWith('tunnel-')) continue;
			const road = id.replace(/:outline$/, '');
			roads.set(road, [...(roads.get(road) ?? []), l]);
		}
		expect(roads.size).toBeGreaterThan(20);

		const undifferentiated: string[] = [];
		for (const [road, parts] of roads) {
			const differs = parts.some((t) => {
				const surface = byId.get((t.id as string).slice('tunnel-'.length));
				if (!surface) return true; // nothing on the surface to be confused with
				const tp = (t.paint ?? {}) as Record<string, unknown>;
				const sp = (surface.paint ?? {}) as Record<string, unknown>;
				const colorKey = t.type === 'fill' ? 'fill-color' : 'line-color';
				const opacityKey = t.type === 'fill' ? 'fill-opacity' : 'line-opacity';
				return (
					deltaE(tp[colorKey] as string, sp[colorKey] as string) >= 6 ||
					(dashRenders(t) && !dashRenders(surface)) ||
					JSON.stringify(tp[opacityKey]) !== JSON.stringify(sp[opacityKey])
				);
			});
			if (!differs) undifferentiated.push(road);
		}
		expect(undifferentiated).toStrictEqual(NO_COLOUR_HEADROOM);
	});
});

// ── Layer merging (issue #51) ─────────────────────────────────────────────────────
// `mergeIdenticalLayers` collapses adjacent runs that MapLibre would draw identically. These lock
// the invariant in both directions: the merge is COMPLETE (nothing mergeable is left behind, so the
// count cannot creep back up) and it is SOUND (it never merges what must stay separate).
describe('identically-drawn layers are merged', () => {
	const renderKey = (l: Record<string, unknown>): string => {
		const { id, filter, ...rest } = l;
		void id;
		void filter;
		return JSON.stringify(rest);
	};

	it('leaves no adjacent run that draws identically', () => {
		const layers = layersFor('local') as unknown as Record<string, unknown>[];
		const groups = osm.layerGroups;
		const groupOf = new Map<string, string>();
		const walk = (node: unknown, path: string[]): void => {
			for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
				if (Array.isArray(v)) for (const id of v as string[]) groupOf.set(id, [...path, k].join('.'));
				else walk(v, [...path, k]);
			}
		};
		walk(groups, []);

		const leftover: string[] = [];
		for (let i = 1; i < layers.length; i++) {
			const a = layers[i - 1];
			const b = layers[i];
			if (a.type === 'symbol' || b.type === 'symbol') continue;
			if (a['source-layer'] === undefined || b['source-layer'] === undefined) continue;
			if (groupOf.get(a.id as string) !== groupOf.get(b.id as string)) continue;
			if (renderKey(a) === renderKey(b)) leftover.push(`${String(a.id)} + ${String(b.id)}`);
		}
		expect(leftover).toStrictEqual([]);
	});

	it('never merges symbol layers, whose order decides label collisions', () => {
		const ids = new Set(layersFor('local').map((l) => l.id));
		// these draw identically and sit adjacent, but merging them would change which street name
		// survives a collision, so each keeps its own layer
		for (const id of ['label-street-pedestrian', 'label-street-residential', 'label-street-trunk'])
			expect(ids.has(id), `${id} must stay a separate symbol layer`).toBe(true);
	});

	it('gives every layer a unique id', () => {
		const ids = layersFor('local').map((l) => l.id);
		expect(ids.length).toBe(new Set(ids).size);
	});

	it('keeps the merged ids addressable through osm.layerGroups', () => {
		const ids = new Set(layersFor('local').map((l) => l.id));
		const listed = new Set<string>();
		const walk = (node: unknown): void => {
			for (const v of Object.values(node as Record<string, unknown>)) {
				if (Array.isArray(v)) for (const id of v as string[]) listed.add(id);
				else walk(v);
			}
		};
		walk(osm.layerGroups);
		// every layer the style emits is reachable from the group map — merging must not orphan one
		expect([...ids].filter((id) => !listed.has(id) && !id.startsWith('slot-') && id !== 'background')).toStrictEqual(
			[]
		);
	});
});

// Merges are registered by member IDs, so they depend on how the style is built, never on colour
// values. Before this, the merge was decided by comparing computed paint: two neighbouring layers that
// merely happened to get equal colours formed an unregistered run and `osm()` threw, and a matching
// neighbour could be absorbed into a registered merge, silently dropping its layer ID.
describe('layer IDs do not depend on colour values', () => {
	const defaultIds = osm().layers.map((l) => l.id);
	const idsOf = (style: { layers: { id: string }[] }) => style.layers.map((l) => l.id);

	it('does not throw when user colours make neighbouring layers identical', () => {
		// path and cycleway tunnel casings: equal transitCycle and transitFoot used to crash osm()
		const style = osm({ colors: { transitCycle: '#88aa66', transitFoot: '#88aa66' } });
		expect(idsOf(style)).toStrictEqual(defaultIds);
	});

	it('does not absorb a coincidentally identical neighbour into a registered merge', () => {
		const education = osm.resolveOptions().colors.siteEducation;
		const style = osm({ colors: { siteHospital: education } });
		expect(idsOf(style)).toStrictEqual(defaultIds);
		expect(idsOf(style)).toContain('site-hospital');
	});

	it('keeps the same IDs in every shipped theme', () => {
		for (const palette of osm.palettes) expect(idsOf(osm({ theme: palette })), palette).toStrictEqual(defaultIds);
	});

	it('keeps the same IDs for arbitrary user colours', () => {
		let seed = 7;
		const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		for (let run = 0; run < 12; run++) {
			// few distinct values, so coincidentally equal colours are common
			const pool = ['#101010', '#808080', '#f0f0f0', '#cc6633'];
			const colors = Object.fromEntries(osm.colorKeys.map((key) => [key, pool[Math.floor(random() * pool.length)]]));
			expect(idsOf(osm({ colors })), `run ${run}`).toStrictEqual(defaultIds);
		}
	});

	it('keeps the same IDs under recolor options that collapse colours together', () => {
		for (const recolor of [{ saturate: -1 }, { invertBrightness: true }, { contrast: 0 }, { brightness: 1 }])
			expect(idsOf(osm({ recolor })), JSON.stringify(recolor)).toStrictEqual(defaultIds);
	});
});
