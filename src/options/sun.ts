import { checkKeys } from './keys.js';
export type SunOptions = {
	direction?: number;
	altitude?: number;
	color?: string;
	intensity?: number;
};

export type ResolvedSun = Required<SunOptions>;

export function resolveSun(sun?: SunOptions, path = 'sun'): ResolvedSun {
	checkKeys(sun, { direction: true, altitude: true, color: true, intensity: true }, path);
	return {
		direction: sun?.direction ?? 315,
		altitude: sun?.altitude ?? 45,
		color: sun?.color ?? '#ffffff',
		intensity: sun?.intensity ?? 0.5,
	};
}
