import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSun } from '../types/index.js';

export function configure3DLighting(style: StyleSpecification, sun: ResolvedSun): StyleSpecification {
	// Sync light so 3D extrusions shade consistently with hillshade (if active).
	style.light = {
		anchor: 'map',
		position: [1.15, sun.direction, 90 - sun.altitude],
		...(sun.color && { color: sun.color }),
		...(sun.intensity !== undefined && { intensity: sun.intensity }),
	};

	return style;
}
