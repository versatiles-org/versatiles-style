/**
 * What a migration could not carry over, could only guess at, or had to choose between.
 *
 * A style editor needs more than a line of prose: it wants to mark *which setting* is a guess, offer
 * the alternatives it discarded, and block only on what is actually wrong. So a diagnostic is a record
 * with a stable `code` — the field tests, filters and translations key off — and the English `message`
 * is a fallback for a consumer that only prints strings.
 *
 * Two vocabularies meet here and are deliberately kept apart. `optionPath` names a setting of the
 * *output* (`colors.water`, `text.places.font`), which is where a UI puts the marker; `origin` names
 * where it came from in the *input* (a source, one of its layers, the probe that read it). A probe id
 * is a Shortbread layer id, which is why it does not sit loose beside the input style's own layer ids.
 */

/** How much a diagnostic should stop someone. `error` means no usable options came out. */
export type Severity = 'error' | 'warning' | 'info';

/** Where a diagnostic came from, in the vocabulary of the *input* style. */
export type DiagnosticOrigin = {
	/** The id of the source in the input style. */
	sourceId?: string;
	/** The source-layer the reading came from. */
	sourceLayer?: string;
	/** The probe that read it — a Shortbread layer id, not one of the input's. */
	probe?: string;
	/** Layer ids of the input style. */
	layers?: string[];
};

/**
 * Every diagnostic a migration can report, with the payload it carries.
 *
 * The payload is typed per code rather than left an open record, because for the codes that matter
 * most the payload *is* the diagnostic: `color.conflict` is worth reporting only if a consumer can
 * read the colours out of it and offer them as a choice, and an untyped field would force a cast at
 * exactly that point. Typing it later would be a breaking change, so the map exists from the start
 * even while it is short.
 *
 * Adding a code is not breaking for a consumer that switches on the ones it knows and prints
 * `message` for the rest.
 *
 * There is no `vote.tie` of its own, and that rests on an invariant worth stating: **every payload
 * whose value was chosen by a vote exposes its tally**, as a `count` or as an array whose length is
 * the count. A tie is then two equal counts, which a consumer can see without a second code saying so.
 * A vote-based payload added without a tally would break this quietly, and `vote.tie` would have to
 * come back. `icon.conflict` carries no count and needs none — ratios reduce to a mean, not a vote.
 */
export type DiagnosticData = {
	// ── the migration produced nothing usable ──
	/** The argument was not a MapLibre style document. */
	'input.notAStyle': { received: string };
	/** An option passed to `guessOptions` was not one it has. */
	'input.badOption': { cause: string };
	/** The style URL could not be fetched. */
	'input.fetchFailed': { url: string; status: number };
	/** Anything else that stopped the read. */
	'input.unreadable': { cause: string };
	/** No source of a known schema, and no imagery either. */
	'schema.none': { vectorSources: number };
	// ── sources ──
	/** A vector source carries tiles of no schema this package knows; its layers were not read. */
	'source.schemaUnknown': { sourceId: string };
	/** No vector source could be read, but something else could — the vector half is missing. */
	'schema.partial': { vectorSources: number };
	/** A source's TileJSON could not be downloaded; its schema was read from the style instead. */
	'source.tilejsonUnavailable': { sourceId: string; url: string; cause: string };
	/** More than one vector source: all of them were read as one map. */
	'source.multiple': { sources: Record<string, string> };
	// ── carried over with a substitution ──
	/** Fonts the glyph server does not publish; the nearest face it has was used. */
	'font.unavailable': { requested: string[]; reason: 'not-published' | 'no-font-list' };
	/** A label language the VersaTiles tiles do not carry; local names are used. */
	'language.unavailable': { requested: string };
	/** A projection the options cannot express. */
	'projection.unsupported': { requested: string };
	/** The style's sprite is not carried over; the target's own icons are used. */
	'icons.replaced': { sprite: unknown };
	// ── conflicts: the input said several things where the options have one knob ──
	/**
	 * Several layers drew a probe in different colours; the topmost was taken. `observed` groups the
	 * layers by the colour they drew, which is the list a consumer offers as a choice.
	 */
	'color.conflict': {
		key: string;
		chosen: string;
		/** How the winner was picked, as a rule rather than a sentence. */
		rule: 'topmost';
		observed: { color: string; layers: string[] }[];
	};
	/**
	 * The source draws features in different colours that the target has one setting for — not a
	 * z-order contest like `color.conflict`, but a schema the target is coarser than. Shortbread's POI
	 * layer is coarser than OpenMapTiles' by design, so for an OMT style this is systematic rather than
	 * incidental, and `observed` names each feature the source told apart.
	 */
	'color.collapsed': {
		key: string;
		chosen: string;
		observed: { feature: string; color: string; layers: string[] }[];
	};
	/** A topic's labels were set in more than one font; the most used was taken. */
	'font.conflict': { topic: string; chosen: string; observed: { font: string; count: number }[] };
	/** A topic's labels disagreed on a style property; the median, or most voted, was taken. */
	'labelStyle.conflict': {
		topic: string;
		property: string;
		chosen: number | string;
		observed: { value: number | string; count: number }[];
	};
	/** Icons were sized inconsistently relative to the target's; one multiplier had to serve. */
	'icon.conflict': { option: 'scale' | 'spacing'; chosen: number; observed: { probe: string; ratio: number }[] };
	/** Labels were read in more than one language; the first place label's was taken. */
	'language.conflict': { chosen: string; observed: { language: string; probes: string[] }[] };
	// ── uncertainty ──
	/** Two palettes fit almost equally well; the cheaper one was taken. */
	'theme.ambiguous': { chosen: string; cost: number; runnerUp: string; runnerUpCost: number; margin: number };
	/** A colour was observed and estimated, but not by enough to override the palette's own value. */
	'color.lowConfidence': {
		key: string;
		estimate: string;
		paletteColor: string;
		/** How far the estimate sat from the palette, and how far it had to sit to be taken. */
		distance: number;
		threshold: number;
		/** 0..1 — how strongly the readings constrained this key. */
		evidenceShare: number;
		residual: number;
	};
	/** Colours nothing in the style spoke for, which kept the chosen palette's values. */
	'color.unobserved': { keys: string[]; count: number; total: number };
	// ── coverage ──
	/** Layers of the input that no probe read. Not necessarily lost — see the code's note. */
	'layer.unread': { count: number };
};

export type DiagnosticCode = keyof DiagnosticData;

/**
 * The severity of each code, so that one code cannot mean "blocking" in one place and "by the way" in
 * another. A diagnostic that fires on every single import belongs at `info` however unfortunate it is:
 * `icons.replaced` is true of every style with a sprite, and as a warning it would only teach people
 * to stop reading the list.
 */
const SEVERITY: Record<DiagnosticCode, Severity> = {
	'input.notAStyle': 'error',
	'input.badOption': 'error',
	'input.fetchFailed': 'error',
	'input.unreadable': 'error',
	'schema.none': 'error',
	'source.schemaUnknown': 'warning',
	'schema.partial': 'warning',
	'source.tilejsonUnavailable': 'warning',
	'source.multiple': 'warning',
	'color.conflict': 'warning',
	'color.collapsed': 'warning',
	'font.conflict': 'warning',
	'labelStyle.conflict': 'warning',
	'icon.conflict': 'warning',
	'language.conflict': 'warning',
	'font.unavailable': 'warning',
	'language.unavailable': 'warning',
	'projection.unsupported': 'warning',
	'icons.replaced': 'info',
	'theme.ambiguous': 'info',
	'color.lowConfidence': 'info',
	'color.unobserved': 'info',
	'layer.unread': 'info',
};

/**
 * One diagnostic. Discriminated on `code`, so `switch (d.code)` narrows `d.data` to that code's
 * payload with no cast — which is the point of typing the payloads at all.
 *
 * Written as a distributive conditional over the code union rather than as one object with a generic
 * `data`, which is what makes the narrowing work; the shape is spelled out inline so that no helper
 * type of its own leaks into the published API.
 */
export type Diagnostic<C extends DiagnosticCode = DiagnosticCode> = C extends unknown
	? {
			/** Stable and machine-readable. What to switch on, filter by, count and translate. */
			readonly code: C;
			readonly severity: Severity;
			/** Plain English, so a consumer that only prints strings still works. */
			readonly message: string;
			/** The setting this concerns, in the vocabulary of the *output* options. */
			readonly optionPath?: string;
			readonly origin?: DiagnosticOrigin;
			/** Plain JSON — a report may cross a worker boundary or be stored. */
			readonly data: DiagnosticData[C];
		}
	: never;

/** Build a diagnostic, taking its severity from its code. */
export function diagnostic<C extends DiagnosticCode>(
	code: C,
	message: string,
	data: DiagnosticData[C],
	extra?: { optionPath?: string; origin?: DiagnosticOrigin }
): Diagnostic<C> {
	return {
		code,
		severity: SEVERITY[code],
		message,
		...(extra?.optionPath !== undefined && { optionPath: extra.optionPath }),
		...(extra?.origin && { origin: extra.origin }),
		data,
	} as Diagnostic<C>;
}

/**
 * Whether a diagnostic has this code, narrowing its payload where it does.
 *
 * `if (is(d, 'color.lowConfidence')) d.data.estimate` — without this a consumer holding a
 * `Diagnostic` has to compare `d.code` and then cast, which is the cast the typed payloads exist to
 * remove.
 */
export function is<C extends DiagnosticCode>(diagnostic: Diagnostic, code: C): diagnostic is Diagnostic<C> {
	return diagnostic.code === code;
}

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Diagnostics in a fixed order: most severe first, then by code, then by the option they concern.
 *
 * Specified rather than merely deterministic — two implementations that both "sort somehow" produce
 * test diffs that disagree. Sorted once, at the end, so the order does not depend on which derivation
 * happened to run first.
 */
export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
	return [...diagnostics].sort(
		(a, b) =>
			RANK[a.severity] - RANK[b.severity] ||
			a.code.localeCompare(b.code) ||
			(a.optionPath ?? '').localeCompare(b.optionPath ?? '') ||
			a.message.localeCompare(b.message)
	);
}

/** The most severe level present, or `undefined` when there is nothing to report. */
export function worst(diagnostics: readonly Diagnostic[]): Severity | undefined {
	let found: Severity | undefined;
	for (const { severity } of diagnostics) {
		if (severity === 'error') return 'error';
		if (found === undefined || RANK[severity] < RANK[found]) found = severity;
	}
	return found;
}

/** Every diagnostic with this code, typed to that code's payload. */
export function byCode<C extends DiagnosticCode>(diagnostics: readonly Diagnostic[], code: C): Diagnostic<C>[] {
	return diagnostics.filter((diagnostic): diagnostic is Diagnostic<C> => is(diagnostic, code));
}

/**
 * Every diagnostic concerning an option, or anything under it: `byOption(d, 'colors')` finds
 * `colors.water`, and `byOption(d, 'text.places')` finds `text.places.font`.
 */
export function byOption(diagnostics: readonly Diagnostic[], optionPath: string): Diagnostic[] {
	return diagnostics.filter(
		(d) => d.optionPath === optionPath || (d.optionPath?.startsWith(`${optionPath}.`) ?? false)
	);
}
