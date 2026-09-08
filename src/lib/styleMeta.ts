import type { StyleSpecification } from '../types/index.js';

/** The styles are CC0, like the VersaTiles data they render. */
export const STYLE_LICENSE = 'https://creativecommons.org/publicdomain/zero/1.0/';

export const STYLE_METADATA: StyleSpecification['metadata'] = { license: STYLE_LICENSE };

/**
 * Style name, e.g. `versatiles-colorful` or `versatiles-gray-dark`.
 *
 * v5 published a distinct name per style (`versatiles-colorful`, `versatiles-graybeard`, …) and
 * tooling keys off it, so a single generic `versatiles` for every palette loses the distinction.
 */
export function styleName(palette: string, darkMode = false): string {
	return `versatiles-${palette}${darkMode ? '-dark' : ''}`;
}
