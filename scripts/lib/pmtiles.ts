import { gunzipSync, brotliDecompressSync, zstdDecompressSync } from 'node:zlib';

/**
 * Just enough of the PMTiles v3 format to read an archive's metadata.
 *
 * ── Why this exists ───────────────────────────────────────────────────────────
 *
 * Every other tileset this repo vendors a schema record from publishes a TileJSON document at a URL.
 * Protomaps does not: its basemap ships as a single PMTiles archive, and the `vector_layers` block lives
 * inside it (SCHEMA-SUPPORT-PLAN.md §7 step 7 — "deriving its record from the PMTiles archive
 * metadata"). The archive is a planet file of tens of gigabytes, so reading it whole is out of the
 * question — but the format is designed for exactly this: a fixed 127-byte header at offset 0 names
 * where the metadata is, and both fit comfortably in one HTTP range request.
 *
 * That also answers the etiquette question §8.3 raises. Protomaps' docs discourage hotlinking their
 * builds; two range requests totalling a couple of kilobytes, once, to vendor a record is not
 * hotlinking, and nothing in the test suite ever touches the network.
 *
 * Two requests, not one: the metadata is not near the header. In the planet build it sits about 137 GB
 * in, past all the tile data, so the header has to be read first to learn where to look.
 *
 * Header layout (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md):
 *   0..6   magic "PMTiles"        7      version (3)
 *   8      root directory offset  16     root directory length
 *   24     JSON metadata offset   32     JSON metadata length
 *   40     leaf directories …     56     tile data …
 *   72..95 tile counts            96     clustered
 *   97     internal compression   98     tile compression   99  tile type
 *   100    min zoom               101    max zoom
 * All integers little-endian; offsets and lengths are uint64.
 */

/** Compression of the archive's own directories and metadata, per the spec's enum. */
const COMPRESSION = { 1: 'none', 2: 'gzip', 3: 'brotli', 4: 'zstd' } as const;

export type PMTilesHeader = {
	version: number;
	rootDirOffset: number;
	rootDirLength: number;
	metadataOffset: number;
	metadataLength: number;
	leafDirsOffset: number;
	tileDataOffset: number;
	internalCompression: (typeof COMPRESSION)[keyof typeof COMPRESSION];
	/** Compression of the tile bodies themselves, usually gzip. */
	tileCompression: (typeof COMPRESSION)[keyof typeof COMPRESSION];
	minzoom: number;
	maxzoom: number;
};

/** The fixed-size header, from the first 127 bytes of an archive. */
export function readHeader(buf: Uint8Array): PMTilesHeader {
	if (buf.length < 127) throw new Error('pmtiles: need at least 127 bytes for the header');
	const magic = new TextDecoder().decode(buf.subarray(0, 7));
	if (magic !== 'PMTiles') throw new Error(`pmtiles: not a PMTiles archive (magic was ${JSON.stringify(magic)})`);
	const version = buf[7];
	if (version !== 3) throw new Error(`pmtiles: only version 3 is supported, this archive is version ${version}`);

	const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	// Offsets are uint64; Number() is safe here because a metadata offset beyond 2^53 cannot occur in
	// any real archive, and `readMetadata` re-checks that the slice it needs is present.
	const u64 = (at: number) => Number(view.getBigUint64(at, true));
	const compressionByte = buf[97] as keyof typeof COMPRESSION;
	const internalCompression = COMPRESSION[compressionByte];
	if (!internalCompression) throw new Error(`pmtiles: unknown internal compression ${compressionByte}`);

	const tileCompressionByte = buf[98] as keyof typeof COMPRESSION;
	const tileCompression = COMPRESSION[tileCompressionByte];
	if (!tileCompression) throw new Error(`pmtiles: unknown tile compression ${tileCompressionByte}`);

	return {
		version,
		rootDirOffset: u64(8),
		rootDirLength: u64(16),
		metadataOffset: u64(24),
		metadataLength: u64(32),
		leafDirsOffset: u64(40),
		tileDataOffset: u64(56),
		internalCompression,
		tileCompression,
		minzoom: buf[100],
		maxzoom: buf[101],
	};
}

/** Decompress a block the archive compressed with its `internalCompression`. */
function decompress(block: Uint8Array, how: PMTilesHeader['internalCompression']): Uint8Array {
	switch (how) {
		case 'none':
			return block;
		case 'gzip':
			return gunzipSync(block);
		case 'brotli':
			return brotliDecompressSync(block);
		case 'zstd':
			return zstdDecompressSync(block);
	}
}

/**
 * The archive's JSON metadata, given the header and a buffer that contains the metadata range.
 *
 * `buf` is the bytes starting at file offset `bufStart` — normally a single range request covering the
 * header and the metadata together, which is why the offset has to be stated rather than assumed.
 */
export function readMetadata(buf: Uint8Array, header: PMTilesHeader, bufStart = 0): unknown {
	const from = header.metadataOffset - bufStart;
	const to = from + header.metadataLength;
	if (from < 0 || to > buf.length) {
		throw new Error(
			`pmtiles: metadata at ${header.metadataOffset}+${header.metadataLength} is outside the fetched range ` +
				`(${bufStart}..${bufStart + buf.length}) — fetch a larger range`
		);
	}
	const json = decompress(buf.subarray(from, to), header.internalCompression);
	return JSON.parse(new TextDecoder().decode(json));
}

/** A `fetch`-shaped function, so a caller can supply their own (tests, proxies, retries). */
export type FetchLike = (
	url: string,
	init?: { headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<Response>;

/**
 * How long one range request may take before it is abandoned.
 *
 * Without a bound, a stalled connection to a 138 GB archive hangs until the socket eventually gives up
 * — minutes, during which the caller has no idea anything is wrong. Generous enough for a cold
 * directory read over a slow link, short enough that a retry still beats waiting.
 */
const REQUEST_TIMEOUT_MS = 5_000;

/** Attempts per range request: one retry. */
const ATTEMPTS = 2;

/** Everything known about a failed request, for an error message worth reading. */
function describe(url: string, from: number, length: number, attempt: number, error: unknown): string {
	const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	// undici hides the real cause (ECONNRESET, ETIMEDOUT, …) one level down.
	const cause = error instanceof Error && error.cause ? ` (cause: ${String(error.cause)})` : '';
	return `bytes ${from}–${from + length - 1} of ${url}, attempt ${attempt}/${ATTEMPTS}: ${reason}${cause}`;
}

/** A permanent answer is not worth retrying; a 5xx, a timeout or a dropped socket is. */
function isRetryable(error: unknown): boolean {
	return !(error instanceof PermanentError);
}

/** An upstream answer that will not change on a retry — a 404, or a server ignoring Range. */
class PermanentError extends Error {}

/**
 * One range request, bounded in time and retried once.
 *
 * Reading an archive means several requests in quick succession against a large remote file, and a
 * dropped connection there is common enough to be worth absorbing — it surfaced repeatedly as
 * `TypeError: fetch failed` while building the dev tile proxy. One retry is the difference between a
 * blank map and a slow one; a timeout is the difference between a slow map and a hung one.
 *
 * A retry is announced on stderr rather than swallowed: a run that silently takes twice as long is
 * worse to debug than one that says why.
 */
async function range(url: string, from: number, length: number, fetchFn: FetchLike): Promise<Uint8Array> {
	let lastError: unknown;
	let tried = 0;
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		tried = attempt;
		try {
			return await rangeOnce(url, from, length, fetchFn);
		} catch (error) {
			lastError = error;
			if (!isRetryable(error) || attempt === ATTEMPTS) break;
			console.warn(`pmtiles: retrying ${describe(url, from, length, attempt, error)}`);
		}
	}
	// `tried`, not `ATTEMPTS`: a permanent answer stops after one go, and saying "attempt 2/2" about a
	// request that was made once sends the reader looking for a retry that never happened.
	throw new Error(`pmtiles: failed reading ${describe(url, from, length, tried, lastError)}`, {
		cause: lastError,
	});
}

async function rangeOnce(url: string, from: number, length: number, fetchFn: FetchLike): Promise<Uint8Array> {
	const to = from + length - 1;
	const res = await fetchFn(url, {
		headers: { Range: `bytes=${from}-${to}` },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	// 206 is the expected answer; a 200 means the server ignored the range and sent the whole archive,
	// which for a planet build must not be read into memory. Neither improves on a retry.
	if (res.status === 200) {
		throw new PermanentError(`${url} ignored the Range header — refusing to read the whole archive`);
	}
	if (res.status === 404 || res.status === 403) throw new PermanentError(`${url} → HTTP ${res.status}`);
	if (res.status !== 206) throw new Error(`${url} → HTTP ${res.status}`);
	const body = new Uint8Array(await res.arrayBuffer());
	// A short read means the connection dropped mid-body; the parser would fail far from the cause.
	if (body.length !== length) {
		throw new Error(`${url} returned ${body.length} bytes for a ${length}-byte range`);
	}
	return body;
}

/**
 * Read a remote archive's metadata with two range requests: the 127-byte header, then the metadata
 * block it points at. Nothing else is downloaded.
 */
export async function fetchMetadata(
	url: string,
	fetchFn: FetchLike = fetch
): Promise<{ header: PMTilesHeader; metadata: unknown }> {
	const header = readHeader(await range(url, 0, 127, fetchFn));
	const block = await range(url, header.metadataOffset, header.metadataLength, fetchFn);
	return { header, metadata: readMetadata(block, header, header.metadataOffset) };
}

// ── Reading tiles ─────────────────────────────────────────────────────────────
//
// Everything below is only needed to *sample* a tileset — `npm run schema-values` reads a handful of
// tiles to find out which values a field actually carries, because a schema record states field names
// and nothing about their contents. It is a strictly bigger job than reading the metadata: tiles are
// addressed by a Hilbert index and found through one or two levels of directory.

/** A directory entry: a tile, or (when `runLength` is 0) a pointer to a leaf directory. */
type Entry = { tileId: number; offset: number; length: number; runLength: number };

/** Read a varint from `buf` at `pos`, returning the value and the next position. */
function varint(buf: Uint8Array, pos: number): [number, number] {
	let result = 0;
	let shift = 0;
	for (;;) {
		const byte = buf[pos++];
		if (byte === undefined) throw new Error('pmtiles: truncated varint in a directory');
		result += (byte & 0x7f) * 2 ** shift;
		if ((byte & 0x80) === 0) return [result, pos];
		shift += 7;
	}
}

/**
 * Parse a directory.
 *
 * The format is column-oriented and delta-coded: a count, then every tile id as a delta from the last,
 * then every run length, then every length, then every offset — where an offset of 0 means "immediately
 * after the previous entry", which is how a clustered archive stores runs of adjacent tiles.
 */
function parseDirectory(buf: Uint8Array): Entry[] {
	const [count, start] = varint(buf, 0);
	let pos = start;
	const entries: Entry[] = Array.from({ length: count }, () => ({ tileId: 0, offset: 0, length: 0, runLength: 0 }));

	let lastId = 0;
	for (let i = 0; i < count; i++) {
		let delta: number;
		[delta, pos] = varint(buf, pos);
		lastId += delta;
		entries[i].tileId = lastId;
	}
	for (let i = 0; i < count; i++) [entries[i].runLength, pos] = varint(buf, pos);
	for (let i = 0; i < count; i++) [entries[i].length, pos] = varint(buf, pos);
	for (let i = 0; i < count; i++) {
		let value: number;
		[value, pos] = varint(buf, pos);
		entries[i].offset = value === 0 && i > 0 ? entries[i - 1].offset + entries[i - 1].length : value - 1;
	}
	return entries;
}

/**
 * The Hilbert index of a tile, which is how PMTiles addresses them.
 *
 * Zoom levels are laid out one after another, each filling a Hilbert curve over its 2^z × 2^z grid, so
 * neighbouring tiles are usually adjacent in the file — which is what makes a range request over a run
 * of tiles worthwhile, and why directories can delta-code so well.
 */
export function zxyToTileId(z: number, x: number, y: number): number {
	let acc = 0;
	for (let t = 0; t < z; t++) acc += (1 << t) * (1 << t);
	let tx = x;
	let ty = y;
	let d = 0;
	for (let s = 2 ** z / 2; s > 0; s /= 2) {
		const rx = (tx & s) > 0 ? 1 : 0;
		const ry = (ty & s) > 0 ? 1 : 0;
		d += s * s * ((3 * rx) ^ ry);
		// rotate the quadrant
		if (ry === 0) {
			if (rx === 1) {
				tx = s - 1 - tx;
				ty = s - 1 - ty;
			}
			[tx, ty] = [ty, tx];
		}
	}
	return acc + d;
}

/** The entry covering `tileId`, or undefined. Entries with a run length cover a span of ids. */
function findEntry(entries: Entry[], tileId: number): Entry | undefined {
	let lo = 0;
	let hi = entries.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (tileId < entries[mid].tileId) hi = mid - 1;
		else if (tileId > entries[mid].tileId) lo = mid + 1;
		else return entries[mid];
	}
	// Not an exact hit: the candidate is the last entry at or before the id, if its run covers it.
	const candidate = entries[hi];
	if (!candidate) return undefined;
	if (candidate.runLength === 0) return candidate; // a leaf pointer covers everything after it
	return tileId < candidate.tileId + candidate.runLength ? candidate : undefined;
}

/**
 * An archive opened for tile reads: the header and root directory, fetched once and reused.
 *
 * Leaf directories are cached too, because the sample tiles cluster geographically and repeatedly land
 * in the same leaf.
 */
export class PMTilesSource {
	private readonly leaves = new Map<number, Entry[]>();

	private constructor(
		readonly url: string,
		readonly header: PMTilesHeader,
		private readonly root: Entry[],
		private readonly fetchFn: FetchLike
	) {}

	static async open(url: string, fetchFn: FetchLike = fetch): Promise<PMTilesSource> {
		const header = readHeader(await range(url, 0, 127, fetchFn));
		const rootBuf = await range(url, header.rootDirOffset, header.rootDirLength, fetchFn);
		return new PMTilesSource(url, header, parseDirectory(decompress(rootBuf, header.internalCompression)), fetchFn);
	}

	/**
	 * The archive's JSON metadata, read with one further range request.
	 *
	 * On the source rather than standalone so a caller that already has the archive open does not
	 * re-read the header just to find where the metadata lives.
	 */
	async getMetadata(): Promise<unknown> {
		const block = await range(this.url, this.header.metadataOffset, this.header.metadataLength, this.fetchFn);
		return readMetadata(block, this.header, this.header.metadataOffset);
	}

	/** The decompressed body of one tile, or undefined where the archive has none. */
	async getTile(z: number, x: number, y: number): Promise<Uint8Array | undefined> {
		const tileId = zxyToTileId(z, x, y);
		let entries = this.root;
		// The spec allows one level of leaf directory; loop rather than assume, but bound it.
		for (let depth = 0; depth < 4; depth++) {
			const entry = findEntry(entries, tileId);
			if (!entry || entry.length === 0) return undefined;
			if (entry.runLength > 0) {
				const body = await range(this.url, this.header.tileDataOffset + entry.offset, entry.length, this.fetchFn);
				return decompress(body, this.header.tileCompression);
			}
			const cached = this.leaves.get(entry.offset);
			if (cached) {
				entries = cached;
				continue;
			}
			const leafBuf = await range(this.url, this.header.leafDirsOffset + entry.offset, entry.length, this.fetchFn);
			entries = parseDirectory(decompress(leafBuf, this.header.internalCompression));
			this.leaves.set(entry.offset, entries);
		}
		throw new Error('pmtiles: directory nesting deeper than expected');
	}
}
