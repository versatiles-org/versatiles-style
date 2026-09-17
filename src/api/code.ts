import { DEFAULT_BASE } from '../options/index.js';

/** Where each builder is imported from — a schema function lives on its own subpath. */
const IMPORT_PATH: Record<string, string> = {
	osm: '@versatiles/style',
	satellite: '@versatiles/style',
	omt: '@versatiles/style/omt',
	protomaps: '@versatiles/style/protomaps',
};

/** The CDN copy of the browser bundle, which defines the `VersaTilesStyle` global. */
export const BROWSER_BUNDLE_URL = 'https://tiles.versatiles.org/assets/lib/versatiles-style/versatiles-style.js';

/**
 * Where a snippet is meant to run.
 *
 * `'npm'` is an ES module in a project with a bundler. `'browser'` is a plain HTML page that loads the
 * CDN bundle from a `<script>` tag — no build step, no import.
 */
export type CodeTarget = 'npm' | 'browser';

export interface CodeOptions {
	/** Default `'npm'`. */
	target?: CodeTarget;
}

/** Indents every line but the first, so a block can be dropped inside a deeper scope. */
function indentBody(code: string, spaces: number): string {
	const pad = ' '.repeat(spaces);
	return code
		.split('\n')
		.map((line, index) => (index === 0 || line === '' ? line : pad + line))
		.join('\n');
}

/**
 * A runnable `@versatiles/style` snippet that builds a style from `options`.
 *
 * It always goes through `inlineSources`: the VersaTiles tile server publishes relative tile URLs,
 * which MapLibre cannot resolve from a source `url` on its own. Options are written as a JavaScript
 * object literal.
 */
export function styleCode(
	fn: 'osm' | 'satellite' | 'omt' | 'protomaps',
	options: object,
	codeOptions?: CodeOptions
): string {
	// `urls.base` is always written, even where `minimizeOptions` left it out as the default. A snippet
	// runs somewhere else — another page, a server — whose default base is not the one here, so without
	// it the pasted style would load its tiles, glyphs and sprites from a different host.
	const urls = (options as { urls?: object }).urls;
	const withBase = { ...options, urls: { base: DEFAULT_BASE, ...urls } };
	const args = JSON.stringify(withBase, null, 2).replace(/^(\s*)"([A-Za-z_$][\w$]*)":/gm, '$1$2:');

	if (codeOptions?.target === 'browser') {
		// The browser bundle's entry is `browser.ts`, which exports only `osm` and `satellite`; the other
		// schemas are npm-only, so there is no global to call and no snippet to write.
		if (fn !== 'osm' && fn !== 'satellite') {
			throw new Error(
				`toCode: target "browser" is not available for ${fn}() — the CDN bundle carries only osm() and satellite(). Use the default target "npm".`
			);
		}
		// A classic <script> is not a module, so there is no top-level await to build the style in.
		const body = indentBody(args, 4);
		return [
			`<script src="${BROWSER_BUNDLE_URL}"></script>`,
			'<script>',
			'  (async () => {',
			`    const style = await VersaTilesStyle.inlineSources(VersaTilesStyle.${fn}(${body}));`,
			'  })();',
			'</script>',
			'',
		].join('\n');
	}

	const from = IMPORT_PATH[fn];
	// `inlineSources` always comes from the root entry, so a subpath builder needs two import lines.
	const imports =
		from === '@versatiles/style'
			? `import { ${fn}, inlineSources } from '@versatiles/style';`
			: `import { inlineSources } from '@versatiles/style';\nimport { ${fn} } from '${from}';`;
	return `${imports}\n\nconst style = await inlineSources(${fn}(${args}));\n`;
}
