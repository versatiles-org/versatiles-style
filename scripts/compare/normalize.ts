import { Color } from '../../src/color/index.js';

/**
 * v5 and v6 express the same styling in different dialects: v5 emits legacy
 * `{ stops: [...] }` functions and mixed color notations (`#fff`, `hsl(...)`),
 * v6 emits `['interpolate', ...]` expressions and `rgb(...)`. Comparing the two
 * raw would report every single property as changed, so both sides are lowered
 * into one canonical dialect first. Only differences that survive normalization
 * are real differences.
 */

const COLOR_RE = /^(#|rgba?\(|hsla?\()/i;

/** A legacy MapLibre zoom function: `{ stops: [[zoom, value], ...], base?: number }`. */
interface LegacyFunction {
	stops: [number, unknown][];
	base?: number;
	property?: string;
	type?: string;
}

function isLegacyFunction(value: unknown): value is LegacyFunction {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const stops = (value as { stops?: unknown }).stops;
	if (!Array.isArray(stops) || stops.length === 0) return false;
	return stops.every((s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'number');
}

/**
 * Lower a legacy zoom function to the equivalent expression.
 *
 * Numeric outputs interpolate (`base` 1 or absent means linear, otherwise
 * exponential); non-numeric outputs step, which is what the legacy default does.
 * Property functions are left untouched — they have no single expression form,
 * and reporting them verbatim is more honest than guessing.
 */
function legacyToExpression(fn: LegacyFunction): unknown {
	if (fn.property !== undefined) return fn;

	const flat = fn.stops.flat();
	const numeric = fn.stops.every(([, v]) => typeof v === 'number');

	if (!numeric || fn.type === 'interval') {
		// ['step', ['zoom'], firstValue, z1, v1, z2, v2, ...]
		const [, first] = fn.stops[0];
		return ['step', ['zoom'], first, ...fn.stops.slice(1).flat()];
	}

	const base = fn.base ?? 1;
	const interpolation = base === 1 ? ['linear'] : ['exponential', base];
	return ['interpolate', interpolation, ['zoom'], ...flat];
}

/** Canonical `#rrggbb` / `#rrggbbaa`, or `null` if the string is not a color. */
export function canonicalColor(value: string): string | null {
	if (!COLOR_RE.test(value.trim())) return null;
	try {
		return Color.parse(value).asHex().toLowerCase();
	} catch {
		return null;
	}
}

/** Round to 6 decimals so float formatting noise does not read as a difference. */
function canonicalNumber(value: number): number {
	if (!Number.isFinite(value)) return value;
	return Math.round(value * 1e6) / 1e6;
}

/** Recursively lower a style fragment into the canonical dialect. */
export function normalize(value: unknown): unknown {
	if (typeof value === 'number') return canonicalNumber(value);

	if (typeof value === 'string') return canonicalColor(value) ?? value;

	if (Array.isArray(value)) return value.map(normalize);

	if (typeof value === 'object' && value !== null) {
		if (isLegacyFunction(value)) return normalize(legacyToExpression(value));

		// Sort keys so object comparison is order-independent.
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			const v = (value as Record<string, unknown>)[key];
			if (v === undefined) continue;
			out[key] = normalize(v);
		}
		return out;
	}

	return value;
}
