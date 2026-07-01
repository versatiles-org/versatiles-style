export type LayoutOptions = {
	scale?: number | { labels?: number; icons?: number };
	spacing?: number | { labels?: number; icons?: number };
};

export type ResolvedLayout = {
	scale: { labels: number; icons: number };
	spacing: { labels: number; icons: number };
};

export function resolveLayout(layout?: LayoutOptions): ResolvedLayout {
	const scale = layout?.scale;
	const spacing = layout?.spacing;
	return {
		scale: {
			labels: (typeof scale === 'number' ? scale : scale?.labels) ?? 1,
			icons: (typeof scale === 'number' ? scale : scale?.icons) ?? 1,
		},
		spacing: {
			labels: (typeof spacing === 'number' ? spacing : spacing?.labels) ?? 1,
			icons: (typeof spacing === 'number' ? spacing : spacing?.icons) ?? 1,
		},
	};
}
