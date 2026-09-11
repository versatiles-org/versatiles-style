/**
 * A runnable `@versatiles/style` snippet that builds a style from `options`.
 *
 * It always goes through `inlineSources`: the VersaTiles tile server publishes relative tile URLs,
 * which MapLibre cannot resolve from a source `url` on its own. Options are written as a JavaScript object literal.
 */
export function styleCode(fn: 'osm' | 'satellite', options: object): string {
	const args =
		Object.keys(options).length > 0
			? JSON.stringify(options, null, 2).replace(/^(\s*)"([A-Za-z_$][\w$]*)":/gm, '$1$2:')
			: '';
	return `import { ${fn}, inlineSources } from '@versatiles/style';\n\nconst style = await inlineSources(${fn}(${args}));\n`;
}
