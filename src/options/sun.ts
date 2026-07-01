export type SunOptions = {
	direction?: number;
	altitude?: number;
	color?: string;
	intensity?: number;
};

export type ResolvedSun = Required<SunOptions>;

export function resolveSun(sun?: SunOptions): ResolvedSun {
	return {
		direction: sun?.direction ?? 315,
		altitude: sun?.altitude ?? 45,
		color: sun?.color ?? '#ffffff',
		intensity: sun?.intensity ?? 0.5,
	};
}
