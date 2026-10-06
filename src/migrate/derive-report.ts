import { type SchemaGuess } from '../api/index.js';
import { type OsmOptions, type SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import { diagnostic, sortDiagnostics, type Diagnostic } from './diagnostics.js';
import type { Provenance, ProvenanceMap } from './provenance.js';

/**
 * What `deriveOptions` hands back: the options it found, and the report on how far to trust them.
 *
 * Apart from the pipeline in `derive.ts` because every step of it writes into the report, so each
 * `derive-*.ts` module needs the builder without needing the pipeline.
 */

export type OptionsGuess =
	| { kind: 'osm'; options: OsmOptions; report: GuessReport }
	| { kind: 'satellite'; options: SatelliteOptions; report: GuessReport }
	| { kind: 'unknown'; report: GuessReport };

export type GuessReport = {
	/**
	 * What could not be carried over, could only be guessed at, or had to be chosen between.
	 *
	 * Replaces the `warnings: string[]` and `unmatched: string[]` this used to carry: a string can only
	 * be printed, where a consumer wants to group, count, suppress, translate, and put a marker beside
	 * the setting a diagnostic concerns. Sorted (see `sortDiagnostics`), so a test diff is stable.
	 */
	diagnostics: Diagnostic[];
	/**
	 * Where each derived option came from, keyed by option path.
	 *
	 * Records the thing the options cannot: `minimizeOptions` deletes a derived value that equals the
	 * target's default, so a setting read from the style and one never derived both come out absent.
	 * See `PROVENANCE_COVERS` for which options are annotated.
	 */
	provenance: ProvenanceMap;
	/** Every vector and raster source, with the schema recognised for it. */
	sources: { id: string; type: string; guess: SchemaGuess }[];
	/** Per probe the style draws: the zoom it was read at and the layers it was read from, topmost first. */
	evidence: { probe: string; zoom: number; layers: string[] }[];
};

/**
 * A report under construction.
 *
 * Filled as the pipeline learns things, never assembled at the end — which is not a style preference
 * but the fix for a class of bug: `evidence` and `unmatched` used to be written in a final block that
 * the `kind: 'unknown'` path returned before reaching, so a style that failed late reported nothing
 * about the probes it had already read. Anything that is true at the moment it is learned is recorded
 * then, and `finish` only orders what has accumulated.
 */
export type ReportBuilder = Omit<GuessReport, 'provenance'> & {
	/** Input layer ids something has already read, so the rest can be reported as unread. */
	used: Set<string>;
	provenance: Record<string, Provenance>;
	say: (diagnostic: Diagnostic) => void;
	/** Record where one option came from. Later calls win, so a derivation may refine its own note. */
	note: (optionPath: string, provenance: Provenance) => void;
};

export function newReport(): ReportBuilder {
	const report: ReportBuilder = {
		diagnostics: [],
		provenance: {},
		sources: [],
		evidence: [],
		used: new Set(),
		say: (diagnostic) => void report.diagnostics.push(diagnostic),
		note: (optionPath, provenance) => void (report.provenance[optionPath] = provenance),
	};
	return report;
}

/** Close a report: note the layers nothing read, drop the scratch fields, and order the diagnostics. */
export function finish(builder: ReportBuilder, style?: StyleSpecification): GuessReport {
	const unread = (style?.layers ?? []).map((l) => l.id).filter((id) => !builder.used.has(id));
	if (unread.length > 0) {
		builder.say(
			diagnostic(
				'layer.unread',
				`${unread.length} layers of the style were not read`,
				{ count: unread.length },
				{ origin: { layers: unread } }
			)
		);
	}
	const { used: _used, say: _say, note: _note, ...report } = builder;
	void _used;
	void _say;
	void _note;
	// Sorted so a report reads and diffs the same way whichever derivation happened to run first.
	const provenance = Object.fromEntries(Object.entries(report.provenance).sort(([a], [b]) => a.localeCompare(b)));
	return { ...report, provenance, diagnostics: sortDiagnostics(report.diagnostics) };
}
