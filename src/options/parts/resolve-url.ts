/**
 * Resolving a URL against a base.
 *
 * A leaf in `options`, not a helper in `lib`, and that placement is the point: `lib` fetches things
 * using URLs that options resolved, so it depends on options — while options needed this one function
 * back, which made the two directories mutually dependent. The error below already speaks in options
 * terms ("check the `urls.base` option"), so this is where it belonged.
 *
 * Its own file rather than `parts/urls.ts`, because that module imports `parts/sprite.ts`, which needs
 * this — putting it there would trade a directory cycle for a file one.
 */

import { reportIssue } from './issues.js';

export function resolveUrl(base: string, url: string): string {
	if (!base) return url;
	try {
		url = new URL(url, base).href;
	} catch {
		// `new URL` throws a bare "Invalid base URL" that names neither value; say which option
		// is at fault, since the base almost always comes from `urls.base`.
		reportIssue(
			{ path: 'urls.base', message: `cannot resolve "${url}" against base "${base}"` },
			`Cannot resolve "${url}" against base "${base}" — check the \`urls.base\` option.`
		);
	}
	url = url.replace(/%7B/gi, '{');
	url = url.replace(/%7D/gi, '}');
	return url;
}
