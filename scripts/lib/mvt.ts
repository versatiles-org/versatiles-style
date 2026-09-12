/**
 * A minimal Mapbox Vector Tile reader — attributes only, no geometry.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 *
 * A vendored schema record (`src/<schema>/schema.ts`) states which source-layers and *field names* a tileset
 * carries, because that is all TileJSON offers. Cartography needs the other half: which **values** a
 * field actually takes. `class: 'lake'` is not a name claim, it is a value claim, and nothing offline
 * can check it — a filter on a value the tiles never use is silently empty, which is the same failure
 * mode the conformance suite was built to catch one level up.
 *
 * `scripts/schema-values.ts` is the consumer: it samples real tiles and reports each field's observed
 * values, so a filter can be written from evidence instead of from the published schema prose.
 *
 * ── Scope, and why it is so small ─────────────────────────────────────────────
 *
 * Geometry is skipped entirely: field values need the `keys`/`values` dictionaries and each feature's
 * `tags` pairs, nothing else. That keeps this to one varint reader and three message walks, with no
 * dependency — a tile decoder is not something this package should ship or install to answer a
 * question about someone else's tileset.
 *
 * Wire format (https://github.com/mapbox/vector-tile-spec/tree/master/2.1):
 *   Tile    { repeated Layer layers = 3 }
 *   Layer   { string name = 1; repeated Feature features = 2; repeated string keys = 3;
 *             repeated Value values = 4; uint32 extent = 5; uint32 version = 15 }
 *   Feature { uint64 id = 1; repeated uint32 tags = 2 [packed]; GeomType type = 3; … }
 *   Value   { string 1; float 2; double 3; int64 4; uint64 5; sint64 6; bool 7 }
 */

export type MvtValue = string | number | boolean;

/** One decoded layer: its name, and every feature's attributes. */
export type MvtLayer = {
	name: string;
	/** Geometry type per feature, as the spec's enum: 1 point, 2 line, 3 polygon. */
	features: { type: number; properties: Record<string, MvtValue> }[];
};

/** A cursor over a protobuf buffer. Only the wire types MVT uses are handled. */
class Reader {
	private pos = 0;

	constructor(private readonly buf: Uint8Array) {}

	get done(): boolean {
		return this.pos >= this.buf.length;
	}

	varint(): number {
		let result = 0;
		let shift = 0;
		for (;;) {
			const byte = this.buf[this.pos++];
			if (byte === undefined) throw new Error('mvt: truncated varint');
			result += (byte & 0x7f) * 2 ** shift;
			if ((byte & 0x80) === 0) return result;
			shift += 7;
			// Tile ids and coordinates can exceed 32 bits; nothing this reader returns needs to.
			if (shift > 56) throw new Error('mvt: varint too long');
		}
	}

	/** A field header: its number and wire type. */
	tag(): { field: number; wire: number } {
		const key = this.varint();
		return { field: key >> 3, wire: key & 0x07 };
	}

	bytes(): Uint8Array {
		const length = this.varint();
		const start = this.pos;
		this.pos += length;
		if (this.pos > this.buf.length) throw new Error('mvt: length-delimited field runs past the buffer');
		return this.buf.subarray(start, this.pos);
	}

	string(): string {
		return new TextDecoder().decode(this.bytes());
	}

	double(): number {
		const v = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 8).getFloat64(0, true);
		this.pos += 8;
		return v;
	}

	float(): number {
		const v = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 4).getFloat32(0, true);
		this.pos += 4;
		return v;
	}

	/** Skip a field whose contents are not needed (geometry, extent, ids, unknown fields). */
	skip(wire: number): void {
		if (wire === 0) this.varint();
		else if (wire === 2) this.bytes();
		else if (wire === 5) this.pos += 4;
		else if (wire === 1) this.pos += 8;
		else throw new Error(`mvt: unsupported wire type ${wire}`);
	}
}

function readValue(buf: Uint8Array): MvtValue | undefined {
	const r = new Reader(buf);
	let value: MvtValue | undefined;
	while (!r.done) {
		const { field, wire } = r.tag();
		switch (field) {
			case 1:
				value = r.string();
				break;
			case 2:
				value = r.float();
				break;
			case 3:
				value = r.double();
				break;
			// int64 / uint64 as varints; sint64 is zig-zag encoded.
			case 4:
			case 5:
				value = r.varint();
				break;
			case 6: {
				const n = r.varint();
				value = (n >>> 1) ^ -(n & 1);
				break;
			}
			case 7:
				value = r.varint() !== 0;
				break;
			default:
				r.skip(wire);
		}
	}
	return value;
}

function readFeature(buf: Uint8Array, keys: string[], values: (MvtValue | undefined)[]) {
	const r = new Reader(buf);
	let type = 0;
	const properties: Record<string, MvtValue> = {};
	while (!r.done) {
		const { field, wire } = r.tag();
		if (field === 2 && wire === 2) {
			// tags are packed pairs of indices: key index, value index, key index, …
			const tags = new Reader(r.bytes());
			while (!tags.done) {
				const key = keys[tags.varint()];
				const value = values[tags.varint()];
				if (key !== undefined && value !== undefined) properties[key] = value;
			}
		} else if (field === 3 && wire === 0) {
			type = r.varint();
		} else {
			r.skip(wire);
		}
	}
	return { type, properties };
}

function readLayer(buf: Uint8Array): MvtLayer {
	const r = new Reader(buf);
	let name = '';
	const keys: string[] = [];
	const values: (MvtValue | undefined)[] = [];
	const featureBufs: Uint8Array[] = [];
	while (!r.done) {
		const { field, wire } = r.tag();
		if (field === 1 && wire === 2) name = r.string();
		else if (field === 2 && wire === 2) featureBufs.push(r.bytes());
		else if (field === 3 && wire === 2) keys.push(r.string());
		else if (field === 4 && wire === 2) values.push(readValue(r.bytes()));
		else r.skip(wire);
	}
	// Features are decoded after the dictionaries, which the spec does not require to come first.
	return { name, features: featureBufs.map((f) => readFeature(f, keys, values)) };
}

/** Decode a vector tile's layers and their features' attributes. Geometry is not decoded. */
export function decodeTile(buf: Uint8Array): MvtLayer[] {
	const r = new Reader(buf);
	const layers: MvtLayer[] = [];
	while (!r.done) {
		const { field, wire } = r.tag();
		if (field === 3 && wire === 2) layers.push(readLayer(r.bytes()));
		else r.skip(wire);
	}
	return layers;
}
