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
	metadataOffset: number;
	metadataLength: number;
	internalCompression: (typeof COMPRESSION)[keyof typeof COMPRESSION];
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

	return {
		version,
		metadataOffset: u64(24),
		metadataLength: u64(32),
		internalCompression,
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
export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

async function range(url: string, from: number, length: number, fetchFn: FetchLike): Promise<Uint8Array> {
	const to = from + length - 1;
	const res = await fetchFn(url, { headers: { Range: `bytes=${from}-${to}` } });
	// 206 is the expected answer; a 200 means the server ignored the range and sent the whole archive,
	// which for a planet build must not be read into memory.
	if (res.status === 200)
		throw new Error(`pmtiles: ${url} ignored the Range header — refusing to read the whole archive`);
	if (res.status !== 206) throw new Error(`pmtiles: ${url} → HTTP ${res.status}`);
	return new Uint8Array(await res.arrayBuffer());
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
