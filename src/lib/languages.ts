import type { TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';

/**
 * The language codes a tileset carries, from its TileJSON.
 *
 * Both naming conventions are scanned, as SCHEMA-SUPPORT-PLAN.md §6 requires of a neutral static:
 * Shortbread and OpenMapTiles spell a translation `name_de`, Protomaps spells it `name:de`, and
 * OpenMapTiles carries both — `name_de`/`name_en`/`name_int` alongside the full `name:xx` set. A caller
 * asking which languages a tileset offers wants the union, not whichever spelling the style happens to
 * prefer.
 */
export function getLanguages(tileJSON: TileJSONSpecification): string[] {
	const langs = new Set<string>();
	const vl = (tileJSON as TileJSONSpecificationVector).vector_layers ?? [];
	for (const layer of vl) {
		for (const key of Object.keys(layer.fields ?? {})) {
			// `name_int` and `name_latin` are transliterations, not languages, but they are indistinguishable
			// from a language code here and Shortbread's behaviour has always included whatever it found.
			if (key.startsWith('name_')) langs.add(key.slice(5));
			else if (key.startsWith('name:')) langs.add(key.slice(5));
		}
	}
	return [...langs].sort();
}
