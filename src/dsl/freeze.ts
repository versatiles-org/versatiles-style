/**
 * Freezing for the values a built style shares with the module that declared them.
 *
 * A style is assembled largely out of module-level constants — filter expressions, icon `match`
 * tables, sort keys — and those are attached to the layers **by reference**, not copied. Two calls to
 * `osm()` therefore hand out the same array objects, and so do two layers of a single style: before
 * this, `label-place-city` and `label-place-town` shared one `symbol-sort-key`.
 *
 * That sharing is worth keeping — copying every expression on every build would cost far more than it
 * saves — but it is only safe while nothing writes through the reference. A caller who edits a filter
 * in place, or a helper that scales an expression in situ, would otherwise corrupt every style the
 * process builds afterwards, and the symptom would surface in a later, unrelated build.
 *
 * Freezing makes that a thrown error at the mutation instead of wrong output somewhere else, which is
 * the same trade `buildGroupMaps` already makes for the group maps it hands out.
 *
 * `style-immutability.test.ts` is the guard: it walks two independent builds and fails on any shared
 * object that is *not* frozen, so a constant added later cannot quietly reintroduce the hazard.
 */

/** Freeze a value and everything reachable from it. Cycles and non-objects are handled. */
export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
	if (value === null || typeof value !== 'object') return value;
	if (seen.has(value)) return value;
	seen.add(value);
	for (const inner of Object.values(value)) deepFreeze(inner, seen);
	return Object.freeze(value);
}
