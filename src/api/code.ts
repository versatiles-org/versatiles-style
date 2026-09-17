import { DEFAULT_BASE } from '../options/index.js';

/**
 * A runnable `@versatiles/style` snippet that builds a style from `options`.
 *
 * It always goes through `inlineSources`: the VersaTiles tile server publishes relative tile URLs,
 * which MapLibre cannot resolve from a source `url` on its own. Options are written as a JavaScript object literal.
 */
/** Where each builder is imported from — a schema function lives on its own subpath. */
const IMPORT_PATH: Record<string, string> = {
	osm: '@versatiles/style',
	satellite: '@versatiles/style',
	omt: '@versatiles/style/omt',
	protomaps: '@versatiles/style/protomaps',
};

export function styleCode(fn: 'osm' | 'satellite' | 'omt' | 'protomaps', options: object): string {
	// `urls.base` is always written, even where `minimizeOptions` left it out as the default. A snippet
	// runs somewhere else — another page, a server — whose default base is not the one here, so without
	// it the pasted style would load its tiles, glyphs and sprites from a different host.
	const urls = (options as { urls?: object }).urls;
	const withBase = { ...options, urls: { base: DEFAULT_BASE, ...urls } };
	const args = JSON.stringify(withBase, null, 2).replace(/^(\s*)"([A-Za-z_$][\w$]*)":/gm, '$1$2:');
	const from = IMPORT_PATH[fn];
	// `inlineSources` always comes from the root entry, so a subpath builder needs two import lines.
	const imports =
		from === '@versatiles/style'
			? `import { ${fn}, inlineSources } from '@versatiles/style';`
			: `import { inlineSources } from '@versatiles/style';\nimport { ${fn} } from '${from}';`;
	return `${imports}\n\nconst style = await inlineSources(${fn}(${args}));\n`;
}
