/**
 * `@versatiles/style/migrate` — from a foreign MapLibre style to the options that rebuild it.
 *
 * For moving a map onto VersaTiles: give {@link guessOptions} a style built for OpenMapTiles, Protomaps
 * or Shortbread tiles, and it returns the `osm()` or `satellite()` options whose style looks most like
 * it, with a report of what it read and what it could not carry over.
 *
 * A subpath of its own because it carries the style spec's expression engine and a calibration of the
 * builders, which a caller who only builds styles should not download.
 *
 * @module @versatiles/style/migrate
 */
export { guessOptions, type GuessOptionsOptions } from './guess.js';
export { deriveOptions, type GuessReport, type OptionsGuess } from './derive.js';
export {
	byCode,
	byOption,
	is,
	sortDiagnostics,
	worst,
	type Diagnostic,
	type DiagnosticCode,
	type DiagnosticData,
	type DiagnosticOrigin,
	type Severity,
} from './diagnostics.js';
