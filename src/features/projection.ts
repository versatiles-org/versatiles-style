import type { StyleSpecification } from '../types/index.js';
import type { ResolvedProjection } from '../options/index.js';

/** Write the resolved projection into the style's top-level `projection` property. */
export function applyProjection(style: StyleSpecification, projection: ResolvedProjection) {
	(style as { projection?: { type: string } }).projection = { type: projection };
}
