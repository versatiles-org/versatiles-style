/**
 * Vendor a tileset's schema record from its live TileJSON.
 *
 *   npm run vendor-schema -- omt              # print the record
 *   npm run vendor-schema -- omt --write      # write it to src/omt/schema.ts
 *   npm run vendor-schema -- shortbread --check   # is the vendored record still current?
 *
 * A schema record states which source-layers a tileset carries, at which zooms, and what fields each
 * one has. The style needs it to gate layers at the zoom their data begins (`applyDataFloor`) and the
 * per-schema conformance tests need it to check offline that the style only reads data that exists.
 *
 * ── Why this is a script and not a test ───────────────────────────────────────
 *
 * The records are vendored precisely so the test suite stays offline and deterministic, which means
 * nothing in CI can notice when a tileset changes underneath them — a vendored record goes stale
 * silently, and conformance then checks the style against a fiction. `--check` is the counter-measure:
 * run it by hand (or on a slow schedule) and it diffs the vendored record against the live TileJSON.
 *
 * Two tileset-specific wrinkles make "just fetch it" insufficient:
 *
 *  1. OpenFreeMap's `tiles` URL embeds a build timestamp
 *     (`…/planet/20260906_080001_pt/{z}/{x}/{y}.pbf`), so it rotates daily. Only `vector_layers` is
 *     vendored; nothing here may pin a tile URL.
 *  2. TileJSON `fields` is an object (name → type description). Only the names are kept: the style
 *     reads fields, it does not type-check them, and the descriptions are free prose that would churn
 *     the vendored file for no gain.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type Source = {
	/** TileJSON URL. Resolved at run time — never vendored, see wrinkle 1 above. */
	url: string;
	/** Where the generated record lives, relative to the repo root. */
	out: string;
	/** Exported names in the generated module. */
	recordName: string;
	typeName: string;
	/** Prose header for the generated file. */
	header: string;
};

const SOURCES: Record<string, Source> = {
	shortbread: {
		url: 'https://tiles.versatiles.org/tiles/osm/tiles.json',
		out: 'src/shortbread/schema.ts',
		recordName: 'SHORTBREAD_SCHEMA',
		typeName: 'ShortbreadLayer',
		header: [
			'The Shortbread schema as the VersaTiles OSM tileset actually implements it. Prose specification:',
			'https://shortbread-tiles.org/schema/1.1/',
		].join('\n'),
	},
	omt: {
		url: 'https://tiles.openfreemap.org/planet',
		out: 'src/omt/schema.ts',
		recordName: 'OMT_SCHEMA',
		typeName: 'OmtLayer',
		header: [
			'The OpenMapTiles schema as OpenFreeMap actually serves it — unmodified OpenMapTiles, no API',
			'key, no request limits, commercial use allowed. Prose specification:',
			'https://openmaptiles.org/schema/',
			'',
			'Attribution required by the tileset: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap".',
		].join('\n'),
	},
};

type VectorLayer = { id: string; minzoom?: number; maxzoom?: number; fields?: Record<string, string> };
type TileJSON = { name?: string; version?: string; minzoom?: number; maxzoom?: number; vector_layers?: VectorLayer[] };

type SchemaLayer = { minzoom: number; maxzoom: number; fields: string[] };

/** TileJSON `vector_layers` → the record shape the style and its conformance tests consume. */
function toRecord(tileJSON: TileJSON): Record<string, SchemaLayer> {
	const record: Record<string, SchemaLayer> = {};
	for (const layer of [...(tileJSON.vector_layers ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
		record[layer.id] = {
			// A layer that states no zoom range inherits the tileset's, which is what a renderer assumes.
			minzoom: layer.minzoom ?? tileJSON.minzoom ?? 0,
			maxzoom: layer.maxzoom ?? tileJSON.maxzoom ?? 14,
			fields: Object.keys(layer.fields ?? {}).sort(),
		};
	}
	return record;
}

function emit(source: Source, tileJSON: TileJSON, record: Record<string, SchemaLayer>): string {
	const version = tileJSON.version ? ` v${tileJSON.version}` : '';
	const lines = [
		'/**',
		...source.header.split('\n').map((l) => (l ? ` * ${l}` : ' *')),
		' *',
		` * Generated from ${source.url}${version}`,
		' * by `npm run vendor-schema`. Do not edit by hand; re-run the script instead, and use',
		' * `npm run vendor-schema -- <name> --check` to find out whether this file has gone stale.',
		' */',
		`export type ${source.typeName} = { minzoom: number; maxzoom: number; fields: readonly string[] };`,
		'',
		`export const ${source.recordName}: Readonly<Record<string, ${source.typeName}>> = {`,
	];
	for (const [id, layer] of Object.entries(record)) {
		const fields = layer.fields.map((f) => JSON.stringify(f)).join(', ');
		lines.push(
			`\t${JSON.stringify(id)}: { minzoom: ${layer.minzoom}, maxzoom: ${layer.maxzoom}, fields: [${fields}] },`
		);
	}
	lines.push('};', '');
	// Long field lists blow the print width; prettier (run by `npm run format`) wraps them.
	return lines.join('\n');
}

/** The vendored record of an already-generated module, by import. */
async function loadVendored(source: Source): Promise<Record<string, SchemaLayer> | undefined> {
	try {
		const mod = (await import(resolve(ROOT, source.out))) as Record<string, unknown>;
		return mod[source.recordName] as Record<string, SchemaLayer> | undefined;
	} catch {
		return undefined;
	}
}

/** Differences between the vendored record and the live tileset, as human-readable lines. */
function diff(vendored: Record<string, SchemaLayer>, live: Record<string, SchemaLayer>): string[] {
	const out: string[] = [];
	for (const id of Object.keys(live)) if (!(id in vendored)) out.push(`+ source-layer ${id} (new in the tileset)`);
	for (const id of Object.keys(vendored)) if (!(id in live)) out.push(`- source-layer ${id} (gone from the tileset)`);
	for (const id of Object.keys(live)) {
		const a = vendored[id];
		const b = live[id];
		if (!a) continue;
		if (a.minzoom !== b.minzoom) out.push(`~ ${id}.minzoom ${a.minzoom} → ${b.minzoom}`);
		if (a.maxzoom !== b.maxzoom) out.push(`~ ${id}.maxzoom ${a.maxzoom} → ${b.maxzoom}`);
		const vendoredFields = new Set(a.fields);
		const liveFields = new Set(b.fields);
		for (const f of liveFields) if (!vendoredFields.has(f)) out.push(`+ ${id}.${f}`);
		for (const f of vendoredFields) if (!liveFields.has(f)) out.push(`- ${id}.${f}`);
	}
	return out;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2).filter((a) => a !== '--');
	const name = args.find((a) => !a.startsWith('--'));
	const source = name ? SOURCES[name] : undefined;
	if (!source) {
		console.error(`Usage: npm run vendor-schema -- <${Object.keys(SOURCES).join('|')}> [--write|--check]`);
		process.exit(1);
	}

	const response = await fetch(source.url);
	if (!response.ok) throw new Error(`${source.url} → HTTP ${response.status}`);
	const tileJSON = (await response.json()) as TileJSON;
	const live = toRecord(tileJSON);
	const layerCount = Object.keys(live).length;
	if (layerCount === 0) throw new Error(`${source.url} carries no vector_layers`);

	if (args.includes('--check')) {
		const vendored = await loadVendored(source);
		if (!vendored) {
			console.error(`✗ ${source.out} has no ${source.recordName} to check — run with --write first.`);
			process.exit(1);
		}
		const changes = diff(vendored, live);
		if (changes.length === 0) {
			console.log(`✓ ${source.out} matches ${source.url} (${layerCount} source-layers).`);
			return;
		}
		console.error(`✗ ${source.out} is stale against ${source.url} — ${changes.length} difference(s):\n`);
		for (const line of changes) console.error(`  ${line}`);
		console.error(`\nRe-vendor with: npm run vendor-schema -- ${name} --write`);
		process.exit(1);
	}

	const code = emit(source, tileJSON, live);
	if (!args.includes('--write')) {
		process.stdout.write(code);
		return;
	}
	const path = resolve(ROOT, source.out);
	const previous = (() => {
		try {
			return readFileSync(path, 'utf8');
		} catch {
			return undefined;
		}
	})();
	writeFileSync(path, code);
	console.log(
		`${previous === undefined ? 'Created' : 'Updated'} ${source.out}: ${layerCount} source-layers, ` +
			`${Object.values(live).reduce((n, l) => n + l.fields.length, 0)} fields. Run \`npm run format\`.`
	);
}

await main();
