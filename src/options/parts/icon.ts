import { checkKeys } from './keys.js';

/** Size and spacing of icons: POI and transit-stop icons, motorway shields and road markings. */
export type IconOptions = {
	/** Multiplies each icon's own size. Default `1`. */
	scale?: number;
	/**
	 * How far apart icons keep. Along a line (oneway arrows) it multiplies the repeat distance; at a point
	 * each step above 1 adds 14 px of collision padding. Default `1`.
	 */
	spacing?: number;
};

export type ResolvedIcon = Required<IconOptions>;

export function resolveIcon(icon?: IconOptions, path = 'icon'): ResolvedIcon {
	checkKeys(icon, { scale: true, spacing: true }, path);
	for (const key of ['scale', 'spacing'] as const) {
		const value = icon?.[key];
		if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
			throw new Error(`${path}.${key}: expected a number, got ${JSON.stringify(value)}`);
		}
	}
	return { scale: icon?.scale ?? 1, spacing: icon?.spacing ?? 1 };
}
