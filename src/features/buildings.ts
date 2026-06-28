import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSun } from '../types/index.js';

// Switches the building rendering from flat fills (building:outline + building)
// to 3D fill-extrusion (building-3d). The flat layers are hidden, the 3D layer
// is made visible, and style.light is set so shadows match the sun direction.
export function addBuildings3D(
	style: StyleSpecification,
	options: { opacity?: number },
	sun: ResolvedSun
): StyleSpecification {
	const result = structuredClone(style);

	// Show 3D layer, hide flat layers.
	for (const layer of result.layers) {
		if (layer.id === 'building' || layer.id === 'building:outline') {
			layer.layout = { ...(layer.layout as Record<string, unknown>), visibility: 'none' };
		}
		if (layer.id === 'building-3d') {
			layer.layout = { ...(layer.layout as Record<string, unknown>), visibility: 'visible' };
			if (options.opacity !== undefined) {
				const paint = (layer.paint as Record<string, unknown> | undefined) ?? {};
				paint['fill-extrusion-opacity'] = options.opacity;
				layer.paint = paint as typeof layer.paint;
			}
		}
	}

	// Sync light so 3D extrusions shade consistently with hillshade (if active).
	result.light = {
		anchor: 'map',
		position: [1.15, sun.direction, 90 - sun.altitude],
		...(sun.color && { color: sun.color }),
		...(sun.intensity !== undefined && { intensity: sun.intensity }),
	};

	return result;
}
