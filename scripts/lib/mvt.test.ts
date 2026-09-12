import { describe, expect, it } from 'vitest';
import { decodeTile } from './mvt.js';

// The decoder reads someone else's bytes, so its failure modes are the interesting part: a silently
// mis-paired tag array would attribute the wrong value to the wrong field, and every filter written from
// `npm run schema-values` would inherit that error. Fixtures are built here rather than checked in as a
// real tile, so the suite stays offline and each test states exactly which wire-format detail it covers.

// ── a minimal protobuf writer, enough to build the fixtures ───────────────────

function varint(n: number): number[] {
	const out: number[] = [];
	while (n > 0x7f) {
		out.push((n & 0x7f) | 0x80);
		n = Math.floor(n / 128);
	}
	out.push(n);
	return out;
}
/** A length-delimited field (wire type 2). */
const delimited = (field: number, bytes: number[]): number[] => [
	...varint((field << 3) | 2),
	...varint(bytes.length),
	...bytes,
];
/** A varint field (wire type 0). */
const int = (field: number, value: number): number[] => [...varint((field << 3) | 0), ...varint(value)];
const utf8 = (s: string): number[] => [...new TextEncoder().encode(s)];

const stringValue = (s: string) => delimited(1, utf8(s));
const boolValue = (v: boolean) => int(7, v ? 1 : 0);
const intValue = (n: number) => int(4, n);
const doubleValue = (n: number) => {
	const buf = new ArrayBuffer(8);
	new DataView(buf).setFloat64(0, n, true);
	return [...varint((3 << 3) | 1), ...new Uint8Array(buf)];
};

function feature(geomType: number, tags: number[], geometry: number[] = [9, 0, 0]): number[] {
	return delimited(2, [
		...int(1, 42), // id — skipped by the decoder
		...delimited(
			2,
			tags.flatMap((t) => varint(t))
		),
		...int(3, geomType),
		...delimited(
			4,
			geometry.flatMap((g) => varint(g))
		), // geometry — skipped
	]);
}

function layer(name: string, keys: string[], values: number[][], features: number[][]): number[] {
	return delimited(3, [
		...delimited(1, utf8(name)),
		...features.flat(),
		...keys.flatMap((k) => delimited(3, utf8(k))),
		...values.flatMap((v) => delimited(4, v)),
		...int(5, 4096), // extent — skipped
		...int(15, 2), // version — skipped
	]);
}

const tile = (...layers: number[][]) => new Uint8Array(layers.flat());

describe('decodeTile', () => {
	it('pairs each feature’s tags with the layer’s key and value dictionaries', () => {
		const buf = tile(
			layer(
				'water',
				['class', 'intermittent'],
				[stringValue('lake'), stringValue('ocean'), intValue(1)],
				[feature(3, [0, 0]), feature(3, [0, 1, 1, 2])]
			)
		);
		const layers = decodeTile(buf);
		expect(layers).toHaveLength(1);
		expect(layers[0].name).toBe('water');
		expect(layers[0].features.map((f) => f.properties)).toEqual([
			{ class: 'lake' },
			{ class: 'ocean', intermittent: 1 },
		]);
	});

	it('records each feature’s geometry type and skips the geometry itself', () => {
		const buf = tile(
			layer('mixed', ['k'], [stringValue('v')], [feature(1, [0, 0]), feature(2, [0, 0]), feature(3, [0, 0])])
		);
		expect(decodeTile(buf)[0].features.map((f) => f.type)).toEqual([1, 2, 3]);
	});

	it('decodes the value types a tileset actually uses', () => {
		const buf = tile(
			layer(
				'mix',
				['s', 'b', 'i', 'd'],
				[stringValue('text'), boolValue(true), intValue(7), doubleValue(1.5)],
				[feature(1, [0, 0, 1, 1, 2, 2, 3, 3])]
			)
		);
		expect(decodeTile(buf)[0].features[0].properties).toEqual({ s: 'text', b: true, i: 7, d: 1.5 });
	});

	it('handles dictionaries that arrive after the features', () => {
		// The spec does not require keys/values to precede features, and a writer that emits them last
		// would otherwise decode as a tile full of empty properties.
		const body = [
			...delimited(1, utf8('late')),
			...feature(3, [0, 0]),
			...delimited(3, utf8('class')),
			...delimited(4, stringValue('forest')),
		];
		expect(decodeTile(new Uint8Array(delimited(3, body)))[0].features[0].properties).toEqual({ class: 'forest' });
	});

	it('ignores a tag index that names no key or value, rather than inventing one', () => {
		const buf = tile(layer('sparse', ['class'], [stringValue('lake')], [feature(3, [0, 0, 5, 9])]));
		expect(decodeTile(buf)[0].features[0].properties).toEqual({ class: 'lake' });
	});

	it('skips unknown fields and whole unknown layers’ trailing data', () => {
		const withExtras = [...delimited(1, utf8('x')), ...int(99, 1234), ...delimited(98, utf8('ignored'))];
		expect(decodeTile(new Uint8Array(delimited(3, withExtras)))[0]).toEqual({ name: 'x', features: [] });
	});

	it('reads multi-byte varints, so a layer past the 127th key still decodes', () => {
		const keys = Array.from({ length: 200 }, (_, i) => `k${i}`);
		const values = keys.map((_, i) => stringValue(`v${i}`));
		const buf = tile(layer('big', keys, values, [feature(1, [199, 199])]));
		expect(decodeTile(buf)[0].features[0].properties).toEqual({ k199: 'v199' });
	});

	it('returns no layers for an empty tile', () => {
		expect(decodeTile(new Uint8Array([]))).toEqual([]);
	});

	it('throws rather than guessing when a field runs past the buffer', () => {
		// A truncated download must fail loudly: silently returning half a tile would understate which
		// values a tileset carries, which is the one thing this decoder exists to report.
		expect(() => decodeTile(new Uint8Array([...varint((3 << 3) | 2), 200, 1, 2]))).toThrow(/past the buffer/);
	});
});
