import { brotliCompressSync, gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PMTilesSource, fetchMetadata, readHeader, readMetadata, zxyToTileId, type FetchLike } from './pmtiles.js';

/**
 * The PMTiles reader, against archives this file builds byte by byte.
 *
 * A fixture archive rather than a recorded response, because the thing worth testing is the format
 * itself: `parseDirectory` decodes a column-oriented, delta-coded structure where an offset of 0 means
 * "immediately after the previous entry", and the only way to know the decoder is right is to encode
 * from the other side and come back. `encodeDirectory` below is that other side — it exists nowhere in
 * `src/`, so a bug reproduced in both halves cannot hide.
 *
 * Nothing here touches the network: every test supplies its own `FetchLike`, which is why that seam is
 * a parameter in the first place.
 */

// ── building an archive ───────────────────────────────────────────────────────

type Entry = { tileId: number; offset: number; length: number; runLength: number };

function varintEncode(value: number): number[] {
	const out: number[] = [];
	let rest = value;
	while (rest >= 0x80) {
		out.push((rest & 0x7f) | 0x80);
		rest = Math.floor(rest / 128);
	}
	out.push(rest);
	return out;
}

/** The inverse of `parseDirectory`: count, then id deltas, run lengths, lengths, offsets. */
function encodeDirectory(entries: Entry[]): Uint8Array {
	const out: number[] = [...varintEncode(entries.length)];
	let last = 0;
	for (const entry of entries) {
		out.push(...varintEncode(entry.tileId - last));
		last = entry.tileId;
	}
	for (const entry of entries) out.push(...varintEncode(entry.runLength));
	for (const entry of entries) out.push(...varintEncode(entry.length));
	entries.forEach((entry, index) => {
		const previous = entries[index - 1];
		const contiguous = index > 0 && entry.offset === previous.offset + previous.length;
		out.push(...varintEncode(contiguous ? 0 : entry.offset + 1));
	});
	return new Uint8Array(out);
}

const COMPRESS = {
	none: (b: Uint8Array) => b,
	gzip: (b: Uint8Array) => new Uint8Array(gzipSync(b)),
	brotli: (b: Uint8Array) => new Uint8Array(brotliCompressSync(b)),
};
const COMPRESSION_BYTE = { none: 1, gzip: 2, brotli: 3 } as const;

type Build = {
	metadata?: unknown;
	root?: Entry[];
	leaf?: Entry[];
	tileData?: Uint8Array;
	internal?: keyof typeof COMPRESS;
	tileCompression?: keyof typeof COMPRESS;
};

/** A complete little archive: header, root directory, optional leaf, metadata, tile data. */
function buildArchive(build: Build = {}): Uint8Array {
	const internal = build.internal ?? 'gzip';
	const tileCompression = build.tileCompression ?? 'gzip';
	const encode = COMPRESS[internal];

	const rootBlock = encode(encodeDirectory(build.root ?? []));
	const leafBlock = build.leaf ? encode(encodeDirectory(build.leaf)) : new Uint8Array(0);
	const metadataBlock = encode(new TextEncoder().encode(JSON.stringify(build.metadata ?? {})));
	const tileData = build.tileData ?? new Uint8Array(0);

	const rootDirOffset = 127;
	const leafDirsOffset = rootDirOffset + rootBlock.length;
	const metadataOffset = leafDirsOffset + leafBlock.length;
	const tileDataOffset = metadataOffset + metadataBlock.length;

	const archive = new Uint8Array(tileDataOffset + tileData.length);
	archive.set(new TextEncoder().encode('PMTiles'), 0);
	archive[7] = 3;
	const view = new DataView(archive.buffer);
	const u64 = (at: number, value: number) => view.setBigUint64(at, BigInt(value), true);
	u64(8, rootDirOffset);
	u64(16, rootBlock.length);
	u64(24, metadataOffset);
	u64(32, metadataBlock.length);
	u64(40, leafDirsOffset);
	u64(56, tileDataOffset);
	archive[97] = COMPRESSION_BYTE[internal];
	archive[98] = COMPRESSION_BYTE[tileCompression];
	archive[100] = 2;
	archive[101] = 14;

	archive.set(rootBlock, rootDirOffset);
	archive.set(leafBlock, leafDirsOffset);
	archive.set(metadataBlock, metadataOffset);
	archive.set(tileData, tileDataOffset);
	return archive;
}

/** `new Response` wants an `ArrayBuffer`, not a view onto a shared one — `slice` gives it its own. */
function bytes(data: Uint8Array): ArrayBuffer {
	return data.slice().buffer as ArrayBuffer;
}

/** A `FetchLike` that answers range requests out of `archive`, recording what was asked for. */
function rangeServer(archive: Uint8Array): FetchLike & { ranges: string[] } {
	const ranges: string[] = [];
	const serve: FetchLike = (_url, init) => {
		const match = /^bytes=(\d+)-(\d+)$/.exec(init?.headers?.Range ?? '');
		if (!match) return Promise.resolve(new Response(bytes(archive), { status: 200 }));
		const [from, to] = [Number(match[1]), Number(match[2])];
		ranges.push(`${from}-${to}`);
		return Promise.resolve(new Response(bytes(archive.subarray(from, to + 1)), { status: 206 }));
	};
	return Object.assign(serve, { ranges });
}

afterEach(() => vi.restoreAllMocks());

// ── the header ────────────────────────────────────────────────────────────────

describe('readHeader', () => {
	it('reads the fields the rest of the reader navigates by', () => {
		const header = readHeader(buildArchive({ metadata: { name: 'x' } }));
		expect(header).toMatchObject({
			version: 3,
			rootDirOffset: 127,
			internalCompression: 'gzip',
			minzoom: 2,
			maxzoom: 14,
		});
		expect(header.metadataOffset).toBeGreaterThan(header.rootDirOffset);
	});

	it.each([
		['a short buffer', new Uint8Array(126), /at least 127 bytes/],
		['a foreign file', new Uint8Array(200), /not a PMTiles archive/],
	])('rejects %s', (_name, buffer, message) => {
		expect(() => readHeader(buffer)).toThrow(message);
	});

	it('rejects a version it cannot read', () => {
		const archive = buildArchive();
		archive[7] = 4;
		expect(() => readHeader(archive)).toThrow(/only version 3/);
	});

	it.each([
		[97, /unknown internal compression/],
		[98, /unknown tile compression/],
	])('rejects an unknown compression at byte %i', (at, message) => {
		const archive = buildArchive();
		archive[at] = 9;
		expect(() => readHeader(archive)).toThrow(message);
	});
});

// ── metadata ──────────────────────────────────────────────────────────────────

describe('readMetadata', () => {
	it.each(['none', 'gzip', 'brotli'] as const)('decompresses %s metadata', (internal) => {
		const metadata = { name: 'protomaps', vector_layers: [{ id: 'roads' }] };
		const archive = buildArchive({ metadata, internal });
		expect(readMetadata(archive, readHeader(archive))).toStrictEqual(metadata);
	});

	it('reads from a buffer that starts partway into the archive', () => {
		const archive = buildArchive({ metadata: { a: 1 } });
		const header = readHeader(archive);
		const block = archive.subarray(header.metadataOffset, header.metadataOffset + header.metadataLength);
		expect(readMetadata(block, header, header.metadataOffset)).toStrictEqual({ a: 1 });
	});

	it('says which range to fetch when the metadata is not in the buffer', () => {
		const archive = buildArchive({ metadata: { a: 1 } });
		const header = readHeader(archive);
		expect(() => readMetadata(archive.subarray(0, 127), header)).toThrow(/outside the fetched range/);
	});
});

// ── tile addressing ───────────────────────────────────────────────────────────

describe('zxyToTileId', () => {
	it('numbers zoom levels one after another', () => {
		expect(zxyToTileId(0, 0, 0)).toBe(0);
		expect(zxyToTileId(1, 0, 0)).toBe(1);
		expect(zxyToTileId(2, 0, 0)).toBe(5);
		expect(zxyToTileId(3, 0, 0)).toBe(21);
	});

	it('walks z1 in Hilbert order, not row order', () => {
		// row order would be (0,0) (1,0) (0,1) (1,1); the curve turns instead of jumping
		const curve: [number, number][] = [
			[0, 0],
			[0, 1],
			[1, 1],
			[1, 0],
		];
		expect(curve.map(([x, y]) => zxyToTileId(1, x, y))).toStrictEqual([1, 2, 3, 4]);
	});

	it('fills each zoom exactly once, which is what makes the ids a dense index', () => {
		for (const z of [1, 2, 3, 4]) {
			const side = 2 ** z;
			const ids = new Set<number>();
			for (let x = 0; x < side; x++) for (let y = 0; y < side; y++) ids.add(zxyToTileId(z, x, y));
			expect(ids.size).toBe(side * side);
			expect(Math.max(...ids) - Math.min(...ids)).toBe(side * side - 1);
		}
	});
});

// ── range requests ────────────────────────────────────────────────────────────

describe('fetchMetadata', () => {
	it('downloads the header and the metadata, and nothing else', async () => {
		const archive = buildArchive({ metadata: { name: 'planet' } });
		const fetchFn = rangeServer(archive);
		const { header, metadata } = await fetchMetadata('https://example.invalid/p.pmtiles', fetchFn);

		expect(metadata).toStrictEqual({ name: 'planet' });
		expect(fetchFn.ranges).toStrictEqual([
			'0-126',
			`${header.metadataOffset}-${header.metadataOffset + header.metadataLength - 1}`,
		]);
	});

	it('retries a dropped connection once, and says so', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const archive = buildArchive({ metadata: { a: 1 } });
		const server = rangeServer(archive);
		let calls = 0;
		const flaky: FetchLike = (url, init) => {
			if (++calls === 1) return Promise.reject(new TypeError('fetch failed'));
			return server(url, init);
		};

		await expect(fetchMetadata('https://example.invalid/p.pmtiles', flaky)).resolves.toMatchObject({
			metadata: { a: 1 },
		});
		expect(warn).toHaveBeenCalledWith(expect.stringMatching(/retrying bytes 0–126 .*attempt 1\/2/));
	});

	it('gives up after the retry, naming the range and the cause', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const failing: FetchLike = () => Promise.reject(new TypeError('fetch failed'));
		await expect(fetchMetadata('https://example.invalid/p.pmtiles', failing)).rejects.toThrow(
			/failed reading bytes 0–126 .*attempt 2\/2: TypeError: fetch failed/
		);
	});

	it.each([
		['a server that ignores Range', 200, /refusing to read the whole archive/],
		['a missing archive', 404, /HTTP 404/],
		['a forbidden archive', 403, /HTTP 403/],
	])('does not retry %s', async (_name, status, message) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		let calls = 0;
		const responder: FetchLike = () => {
			calls++;
			return Promise.resolve(new Response(bytes(new Uint8Array(0)), { status }));
		};
		await expect(fetchMetadata('https://example.invalid/p.pmtiles', responder)).rejects.toThrow(message);
		expect(calls).toBe(1);
		expect(warn).not.toHaveBeenCalled();
	});

	it('treats a short body as a dropped connection rather than parsing it', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const truncating: FetchLike = () => Promise.resolve(new Response(bytes(new Uint8Array(10)), { status: 206 }));
		await expect(fetchMetadata('https://example.invalid/p.pmtiles', truncating)).rejects.toThrow(
			/returned 10 bytes for a 127-byte range/
		);
	});
});

// ── reading tiles ─────────────────────────────────────────────────────────────

/** An archive holding one tile, addressed straight from the root directory. */
function archiveWithTile(body: Uint8Array, tileCompression: keyof typeof COMPRESS = 'gzip') {
	const tile = COMPRESS[tileCompression](body);
	return buildArchive({
		root: [{ tileId: zxyToTileId(3, 4, 5), offset: 0, length: tile.length, runLength: 1 }],
		tileData: tile,
		tileCompression,
	});
}

describe('PMTilesSource', () => {
	const body = new TextEncoder().encode('a tile body');

	it('opens with two requests: the header and the root directory', async () => {
		const fetchFn = rangeServer(archiveWithTile(body));
		const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
		expect(source.header.version).toBe(3);
		expect(fetchFn.ranges).toHaveLength(2);
		expect(fetchFn.ranges[0]).toBe('0-126');
	});

	it.each(['none', 'gzip', 'brotli'] as const)('returns a %s-compressed tile decompressed', async (how) => {
		const fetchFn = rangeServer(archiveWithTile(body, how));
		const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
		// `Uint8Array.from`, because the declared `Uint8Array` is not one runtime type: `gunzipSync` and
		// `brotliDecompressSync` hand back a `Buffer` (a subclass), while the `none` path returns the
		// subarray as it is. Every consumer treats it as bytes, so the difference has never mattered —
		// but it is a difference, and comparing content keeps this test honest about what it checks.
		expect(Uint8Array.from((await source.getTile(3, 4, 5)) ?? [])).toStrictEqual(body);
	});

	it('returns undefined for a tile the archive does not hold', async () => {
		const fetchFn = rangeServer(archiveWithTile(body));
		const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
		expect(await source.getTile(3, 0, 0)).toBeUndefined();
	});

	it('reads its metadata without re-reading the header', async () => {
		const fetchFn = rangeServer(buildArchive({ metadata: { name: 'x' }, root: [] }));
		const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
		const before = fetchFn.ranges.length;
		expect(await source.getMetadata()).toStrictEqual({ name: 'x' });
		expect(fetchFn.ranges).toHaveLength(before + 1);
	});

	describe('with a leaf directory', () => {
		const tileId = zxyToTileId(3, 4, 5);
		const tile = COMPRESS.gzip(body);
		const leaf: Entry[] = [{ tileId, offset: 0, length: tile.length, runLength: 1 }];
		// a root entry with runLength 0 is a pointer into the leaf directories, not a tile
		const build = (): Build => ({
			root: [{ tileId: 0, offset: 0, length: COMPRESS.gzip(encodeDirectory(leaf)).length, runLength: 0 }],
			leaf,
			tileData: tile,
		});

		it('follows the pointer and reads the tile', async () => {
			const fetchFn = rangeServer(buildArchive(build()));
			const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
			expect(Uint8Array.from((await source.getTile(3, 4, 5)) ?? [])).toStrictEqual(body);
		});

		it('fetches the leaf once however many tiles need it', async () => {
			const fetchFn = rangeServer(buildArchive(build()));
			const source = await PMTilesSource.open('https://example.invalid/p.pmtiles', { fetch: fetchFn });
			const before = fetchFn.ranges.length;
			await Promise.all([source.getTile(3, 4, 5), source.getTile(3, 4, 5), source.getTile(3, 4, 5)]);
			// one leaf read plus one read per tile — not one leaf read per tile
			expect(fetchFn.ranges).toHaveLength(before + 4);
		});
	});
});
