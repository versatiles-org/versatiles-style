/**
 * One thing wrong with an options object, as data rather than as English.
 *
 * `path` is where it sits, written the way the caller wrote it and relative to the options object
 * itself (`colors.wood`, `text.places.font`) — so a UI can mark the offending line. `message` says what
 * is wrong with that one node, without the path prefixed, since a caller that wants a sentence can
 * build one and a caller that wants to mark a control cannot unbuild one. `suggestion` is the v6 key to
 * use instead, where `v5-hints.ts` knows of one.
 */
export type OptionIssue = {
	path: string;
	message: string;
	suggestion?: string;
};

/**
 * Where issues go while `collect` is running. Module state, which is safe here for one reason worth
 * stating: resolution is entirely synchronous, so between `collect` setting this and restoring it no
 * other resolution can interleave. If a resolver is ever made async, this has to become an argument
 * threaded through them instead.
 */
let sink: OptionIssue[] | undefined;

/**
 * Record `issues`, or throw `Error(errorMessage)` when nothing is collecting.
 *
 * Both forms are given by the caller rather than derived from each other, because they are not the same
 * text: a validator reporting four unknown keys throws *one* error listing all four — which is the
 * message this package has always produced, and which several tests pin — while collecting wants the
 * four as separate records, each with its own path to mark.
 */
export function reportIssues(issues: readonly OptionIssue[], errorMessage: string): void {
	if (sink) {
		sink.push(...issues);
		return;
	}
	throw new Error(errorMessage);
}

/** `reportIssues` for the common case of a single issue. */
export function reportIssue(issue: OptionIssue, errorMessage = `${issue.path}: ${issue.message}`): void {
	reportIssues([issue], errorMessage);
}

/**
 * Run `resolve` with every validator collecting instead of throwing, so one pass reports every problem
 * in the tree rather than the first.
 *
 * Validators continue after reporting, each with a value that lets resolution carry on — an unknown key
 * is ignored, a bad palette falls back to the default. That is what makes a second problem reachable,
 * but it also means resolution runs on values it would normally have rejected, so it can still fail
 * somewhere downstream. Two cases, deliberately different:
 *
 *   - **Issues already collected.** The failure is a consequence of continuing past something already
 *     named, so the issues are the answer and the exception is dropped.
 *   - **No issues collected.** Nothing explains it, so it is not a validation result at all — a genuine
 *     fault, rethrown rather than reported as if the caller's options were at fault.
 */
export function collectIssues<T>(resolve: () => T): { value?: T; issues: OptionIssue[] } {
	const outer = sink;
	const issues: OptionIssue[] = [];
	sink = issues;
	try {
		return { value: resolve(), issues };
	} catch (error) {
		if (issues.length === 0) throw error;
		return { issues };
	} finally {
		sink = outer;
	}
}
