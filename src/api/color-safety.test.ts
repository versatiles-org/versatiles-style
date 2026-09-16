import { describe, expect, it } from 'vitest';
import { Color as SpecColor } from '@maplibre/maplibre-gl-style-spec';
import { getStyleVariants } from '../variants.js';
import type { StyleSpecification } from '../types/index.js';

/**
 * Every colour this library emits must be readable by **both** MapLibre parsers.
 *
 * `spec-validation.test.ts` already checks styles against the style spec, but that runs the JS parser
 * only, and the two parsers do not agree: `@maplibre/maplibre-gl-style-spec` accepts CSS Color 4's
 * space-separated syntax and all 148 named colours, while the C++ parser inside
 * `@maplibre/maplibre-gl-native` — the renderer behind `scripts/lib/native-render.ts` and every
 * screenshot comparison — accepts neither `rgb(128 0 0)` nor `rebeccapurple`.
 *
 * A colour only the JS parser understands therefore renders correctly in a browser, passes spec
 * validation, and turns the layer **fully transparent** in every screenshot, announced by nothing louder
 * than a `ParseStyle` warning. This test is the guard against that, and it is why `formatStyleColor`
 * emits sRGB legacy syntax and nothing else.
 */

/** Hex, or a legacy comma-separated function — the intersection of what both parsers read. */
const NATIVE_SAFE = /^(#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})$|^(rgba?|hsla?)\(([^()/]*)\)$/;

function isNativeSafe(value: string): boolean {
	const match = NATIVE_SAFE.exec(value.trim());
	if (!match) return false;
	if (match[2] === undefined) return true; // a hex colour
	// the native parser has no modern syntax: components must be comma-separated, alpha included
	const parts = match[3].split(',');
	return parts.length >= 3 && parts.length <= 4 && parts.every((part) => part.trim().length > 0);
}

/** Every string sitting under a key that names a colour, expressions walked through. */
function collectColors(style: StyleSpecification): { path: string; value: string }[] {
	const found: { path: string; value: string }[] = [];

	const walk = (value: unknown, path: string, insideColor: boolean): void => {
		if (typeof value === 'string') {
			if (insideColor) found.push({ path, value });
			return;
		}
		if (Array.isArray(value)) {
			value.forEach((item, index) => walk(item, `${path}[${index}]`, insideColor));
			return;
		}
		if (value && typeof value === 'object') {
			for (const [key, child] of Object.entries(value)) {
				walk(child, `${path}.${key}`, insideColor || /colou?r$/i.test(key));
			}
		}
	};

	walk(style, 'style', false);
	return found;
}

describe('every colour in every emitted style', () => {
	const built = getStyleVariants().map((variant) => ({ name: variant.name, style: variant.build() }));

	it('covers the whole published variant matrix', () => {
		expect(built.length).toBeGreaterThan(100);
	});

	it.each(built)('$name uses only syntax both MapLibre parsers read', ({ style }) => {
		const offenders = collectColors(style).filter(({ value }) => !isNativeSafe(value));
		expect(offenders).toStrictEqual([]);
	});

	it.each(built)('$name uses colours the style spec can parse', ({ style }) => {
		const offenders = collectColors(style).filter(({ value }) => SpecColor.parse(value) === undefined);
		expect(offenders).toStrictEqual([]);
	});

	it('finds the colours it claims to be checking', () => {
		// a guard that silently matched nothing would pass for ever
		const colors = collectColors(built[0].style);
		expect(colors.length).toBeGreaterThan(100);
		expect(colors.some(({ path }) => path.includes('paint'))).toBe(true);
	});
});
