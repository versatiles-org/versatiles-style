/**
 * Where each derived option came from — an annotation per setting, alongside the diagnostics.
 *
 * Two structures rather than one because two different things are being reported. A diagnostic is an
 * event: something happened that a person should read. Provenance is a property of every setting,
 * always present and mostly unremarkable, which a UI reads to mark a control rather than to write a
 * line. Folding one into the other would either flood the list — a palette is 45 colours, each with an
 * outcome — or lose the annotation on the settings nothing was said about.
 *
 * It answers a question the options object structurally cannot. `minimizeOptions` deletes every
 * derived value that equals the target's default, so "read from the style, and it happened to match"
 * and "never derived at all" both come out as an absent key. Provenance records `observed` for the
 * first and `default` for the second, which is exactly the difference between "this is what your style
 * says" and "we had nothing to go on".
 */

/**
 * How a value was arrived at.
 *
 * Deliberately only the four that have a site in the pipeline. A variant nothing can produce reads, in
 * review, as a case that is handled — the same trap as a warning whose condition can never hold.
 */
export type Origin =
	/** Read from the input style, for this very setting. */
	| 'observed'
	/** Borrowed from a comparable setting the input did speak about — a sibling topic, or the style's
	 *  most-used font family — because nothing spoke for this one. */
	| 'pooled'
	/** Taken from the palette that was chosen, rather than from anything the input said. */
	| 'inherited'
	/** The target's own default stands; nothing in the input spoke for it, near or far. */
	| 'default';

export type Provenance = {
	readonly origin: Origin;
	/**
	 * 0..1, and only where a number was genuinely computed — the colour solver's evidence share. Absent
	 * where there is nothing to measure, rather than filled with a guess at how much of a guess a value
	 * is, which would be worse than saying nothing.
	 */
	readonly confidence?: number;
	/** What fed the value: probe ids (Shortbread layer ids), or the topics it was pooled from. */
	readonly from?: readonly string[];
};

/** Provenance per option path, in the vocabulary of the output options: `colors.water`, `theme`. */
export type ProvenanceMap = Readonly<Record<string, Provenance>>;

/**
 * Which options carry provenance today.
 *
 * Absence means "this derivation does not report provenance yet", not "nothing is known" — so a
 * consumer needs to know where to expect it. Everything under these prefixes is annotated for every
 * setting the derivation considers, whether or not it ends up in the options.
 */
export const PROVENANCE_COVERS: readonly string[] = ['theme', 'colors', 'text', 'icon'];

/** Whether an option path is one provenance is recorded for, so a UI can tell silence from ignorance. */
export function isCovered(optionPath: string): boolean {
	return PROVENANCE_COVERS.some((prefix) => optionPath === prefix || optionPath.startsWith(`${prefix}.`));
}
