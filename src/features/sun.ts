import { Color } from '../color/index.js';
import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSun } from '../options/index.js';

export function configure3DLighting(style: StyleSpecification, sun: ResolvedSun) {
	if (sun) {
		style.light = {
			anchor: sun.anchor,
			position: [1.15, sun.direction, 90 - sun.altitude],
			color: Color.parse(sun.color).asString(),
			intensity: sun.intensity,
		};
	} else {
		delete style.light;
	}
}
