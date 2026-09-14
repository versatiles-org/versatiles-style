import { checkKeys } from './keys.js';

/**
 * How labels that follow a line — street, river and motorway names — sit in a tilted map: lying on
 * the ground (`map`, MapLibre's own behaviour for line labels) or standing up facing the viewer
 * (`viewport`). Point labels, such as places and POIs, face the viewer either way.
 */
export type PitchAlignment = 'map' | 'viewport';

export type LayoutOptions = {
	scale?: number | { labels?: number; icons?: number };
	spacing?: number | { labels?: number; icons?: number };
	pitchAlignment?: PitchAlignment;
};

export type ResolvedLayout = {
	scale: { labels: number; icons: number };
	spacing: { labels: number; icons: number };
	pitchAlignment: PitchAlignment;
};

const PITCH_ALIGNMENTS: readonly PitchAlignment[] = ['map', 'viewport'];

export function resolveLayout(layout?: LayoutOptions, path = 'layout'): ResolvedLayout {
	checkKeys(layout, { scale: true, spacing: true, pitchAlignment: true }, path);
	checkKeys(layout?.scale, { labels: true, icons: true }, `${path}.scale`);
	checkKeys(layout?.spacing, { labels: true, icons: true }, `${path}.spacing`);
	const scale = layout?.scale;
	const spacing = layout?.spacing;
	const pitchAlignment = layout?.pitchAlignment ?? 'map';
	if (!PITCH_ALIGNMENTS.includes(pitchAlignment)) {
		throw new Error(
			`${path}.pitchAlignment: unknown value "${String(pitchAlignment)}". Valid values: ${PITCH_ALIGNMENTS.join(', ')}.`
		);
	}
	return {
		scale: {
			labels: (typeof scale === 'number' ? scale : scale?.labels) ?? 1,
			icons: (typeof scale === 'number' ? scale : scale?.icons) ?? 1,
		},
		spacing: {
			labels: (typeof spacing === 'number' ? spacing : spacing?.labels) ?? 1,
			icons: (typeof spacing === 'number' ? spacing : spacing?.icons) ?? 1,
		},
		pitchAlignment,
	};
}
